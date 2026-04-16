import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers'

/**
 * @typedef {object} AppConfig
 * @property {string} region
 * @property {string} identityPoolId
 * @property {string} bucket
 * @property {string} prefix
 */

/**
 * @typedef {object} LogSnapshot
 * @property {import('./crdt.js').Op[]} ops
 * @property {string | null} etag
 */

/**
 * Load the runtime config. Placed in /public/config.json so it can be edited
 * without rebuilding the bundle.
 * @returns {Promise<AppConfig>}
 */
export async function loadConfig() {
  const base = /** @type {any} */ (import.meta).env?.BASE_URL ?? '/'
  const res = await fetch(`${base}config.json`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`config.json: ${res.status}`)
  return /** @type {AppConfig} */ (await res.json())
}

/**
 * @param {AppConfig} config
 * @returns {S3Client}
 */
export function makeClient(config) {
  return new S3Client({
    region: config.region,
    credentials: fromCognitoIdentityPool({
      clientConfig: { region: config.region },
      identityPoolId: config.identityPoolId,
    }),
  })
}

/**
 * @param {AppConfig} config
 * @param {string} roomKey
 * @returns {string}
 */
export function objectKey(config, roomKey) {
  return `${config.prefix}${roomKey}.json`
}

/**
 * GET the log. Returns `{ops: [], etag: null}` if the object does not exist.
 * @param {S3Client} client
 * @param {AppConfig} config
 * @param {string} roomKey
 * @returns {Promise<LogSnapshot>}
 */
export async function getLog(client, config, roomKey) {
  try {
    const res = await client.send(new GetObjectCommand({
      Bucket: config.bucket,
      Key: objectKey(config, roomKey),
    }))
    const body = await res.Body.transformToString()
    const parsed = JSON.parse(body)
    return { ops: parsed.ops ?? [], etag: res.ETag ?? null }
  } catch (err) {
    const e = /** @type {any} */ (err)
    if (e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404) {
      return { ops: [], etag: null }
    }
    throw err
  }
}

/**
 * PUT the log with conditional headers. If `etag` is null, uses
 * `If-None-Match: *` to ensure the object doesn't already exist. Otherwise
 * uses `If-Match: <etag>` to ensure we're writing on top of the same revision
 * we read. Returns the new ETag on success.
 * @param {S3Client} client
 * @param {AppConfig} config
 * @param {string} roomKey
 * @param {import('./crdt.js').Op[]} ops
 * @param {string | null} etag
 * @returns {Promise<string>} new ETag
 */
export async function putLog(client, config, roomKey, ops, etag) {
  const body = JSON.stringify({ version: 1, ops })
  const cmd = new PutObjectCommand({
    Bucket: config.bucket,
    Key: objectKey(config, roomKey),
    Body: body,
    ContentType: 'application/json',
    ...(etag ? { IfMatch: etag } : { IfNoneMatch: '*' }),
  })
  const res = await client.send(cmd)
  if (!res.ETag) throw new Error('S3 PUT returned no ETag')
  return res.ETag
}

/**
 * Detect a 412/409 precondition failure on PUT.
 * @param {unknown} err
 * @returns {boolean}
 */
export function isPreconditionFailure(err) {
  const status = /** @type {any} */ (err)?.$metadata?.httpStatusCode
  const name = /** @type {any} */ (err)?.name
  return status === 412 || status === 409 || name === 'PreconditionFailed'
}

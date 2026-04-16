import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SyncEngine } from '../src/sync.js'

/**
 * @typedef {{ httpStatusCode: number }} Meta
 * @typedef {Error & { $metadata: Meta }} AwsError
 */

/**
 * @param {string} name
 * @param {number} status
 * @returns {AwsError}
 */
function awsError(name, status) {
  const err = /** @type {AwsError} */ (new Error(name))
  err.name = name
  err.$metadata = { httpStatusCode: status }
  return err
}

/**
 * In-memory fake S3: one object per (bucket,key), ETag is a counter string.
 * @returns {{
 *   client: { send: (cmd: any) => Promise<any> },
 *   store: Map<string, { body: string, etag: string }>,
 *   putCalls: { key: string, ifMatch?: string, ifNoneMatch?: string }[]
 * }}
 */
function makeFakeClient() {
  /** @type {Map<string, { body: string, etag: string }>} */
  const store = new Map()
  let counter = 0
  /** @type {{ key: string, ifMatch?: string, ifNoneMatch?: string }[]} */
  const putCalls = []
  const client = {
    /**
     * @param {any} cmd
     * @returns {Promise<any>}
     */
    send(cmd) {
      const name = cmd.constructor.name
      const key = `${cmd.input.Bucket}/${cmd.input.Key}`
      if (name === 'GetObjectCommand') {
        const rec = store.get(key)
        if (!rec) return Promise.reject(awsError('NoSuchKey', 404))
        return Promise.resolve({
          ETag: rec.etag,
          Body: { transformToString: () => Promise.resolve(rec.body) },
        })
      }
      if (name === 'PutObjectCommand') {
        putCalls.push({ key, ifMatch: cmd.input.IfMatch, ifNoneMatch: cmd.input.IfNoneMatch })
        const existing = store.get(key)
        if (cmd.input.IfNoneMatch === '*' && existing) {
          return Promise.reject(awsError('PreconditionFailed', 412))
        }
        if (cmd.input.IfMatch && (!existing || existing.etag !== cmd.input.IfMatch)) {
          return Promise.reject(awsError('PreconditionFailed', 412))
        }
        const etag = `"${++counter}"`
        store.set(key, { body: cmd.input.Body, etag })
        return Promise.resolve({ ETag: etag })
      }
      return Promise.reject(new Error(`unexpected command ${name}`))
    },
  }
  return { client, store, putCalls }
}

vi.mock('@aws-sdk/client-s3', () => {
  class GetObjectCommand {
    /** @param {any} input */
    constructor(input) { this.input = input }
  }
  class PutObjectCommand {
    /** @param {any} input */
    constructor(input) { this.input = input }
  }
  return { GetObjectCommand, PutObjectCommand, S3Client: class {} }
})

const config = { region: 'us-east-1', identityPoolId: 'x', bucket: 'b', prefix: 'rooms/' }

describe('SyncEngine', () => {
  /** @type {ReturnType<typeof makeFakeClient>} */
  let fake
  beforeEach(() => { fake = makeFakeClient() })

  it('bootstraps an empty room via If-None-Match', async () => {
    const engine = new SyncEngine({
      client: /** @type {any} */ (fake.client), config, roomKey: 'a-b-c', clientId: 'c1',
      onText() {},
    })
    await engine.start()
    await engine.pushLocal('hello')
    expect(fake.putCalls[0].ifNoneMatch).toBe('*')
    expect(fake.store.get('b/rooms/a-b-c.json').body).toContain('hello')
  })

  it('retries with If-Match on a conflict', async () => {
    // Pre-populate with a remote op
    /** @type {import('../src/crdt.js').Op} */
    const remoteOp = { id: 'r1', lamport: 1, clientId: 'other', ts: 0, type: 'replace', from: 0, to: 0, text: 'REMOTE' }
    fake.store.set('b/rooms/a-b-c.json', {
      body: JSON.stringify({ version: 1, ops: [remoteOp] }),
      etag: '"seed"',
    })

    const engine = new SyncEngine({
      client: /** @type {any} */ (fake.client), config, roomKey: 'a-b-c', clientId: 'c1',
      onText() {},
    })
    await engine.start()
    expect(engine.text).toBe('REMOTE')

    // Simulate another writer pre-empting us: change the server object between
    // our last pull and our next PUT.
    const remoteOp2 = { id: 'r2', lamport: 2, clientId: 'other', ts: 0, type: 'replace', from: 6, to: 6, text: '!' }
    fake.store.set('b/rooms/a-b-c.json', {
      body: JSON.stringify({ version: 1, ops: [remoteOp, remoteOp2] }),
      etag: '"newer"',
    })

    await engine.pushLocal('REMOTEX')

    // Should have retried at least once.
    expect(fake.putCalls.length).toBeGreaterThanOrEqual(2)
    const finalBody = fake.store.get('b/rooms/a-b-c.json').body
    const parsed = JSON.parse(finalBody)
    // Final state contains both remote ops + rebased local.
    expect(parsed.ops).toHaveLength(3)
    /**
     * @param {any} o
     * @returns {boolean}
     */
    function byClient(o) { return o.clientId === 'c1' }
    expect(parsed.ops.some(byClient)).toBe(true)
  })
})

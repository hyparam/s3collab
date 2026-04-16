import { bumpLamport, foldOps, makeOp, maxLamport } from './crdt.js'
import { getLog, isPreconditionFailure, putLog } from './s3-client.js'

/**
 * @typedef {import('./crdt.js').Op} Op
 * @typedef {import('./s3-client.js').AppConfig} AppConfig
 */

const MAX_RETRIES = 5
const POLL_MS = 2000

/**
 * Sync engine for a single room. Owns the authoritative op list locally,
 * handles push/pull with S3, and notifies a listener when remote changes
 * produce new text.
 */
export class SyncEngine {
  /**
   * @param {object} args
   * @param {import('@aws-sdk/client-s3').S3Client} args.client
   * @param {AppConfig} args.config
   * @param {string} args.roomKey
   * @param {string} args.clientId
   * @param {(text: string, source: 'remote' | 'local') => void} args.onText
   * @param {(status: string) => void} [args.onStatus]
   */
  constructor({ client, config, roomKey, clientId, onText, onStatus }) {
    this.client = client
    this.config = config
    this.roomKey = roomKey
    this.clientId = clientId
    this.onText = onText
    this.onStatus = onStatus ?? (() => {})
    /** @type {Op[]} */
    this.ops = []
    /** @type {string | null} */
    this.etag = null
    this.localLamport = 0
    this.text = ''
    this._pollTimer = null
    this._pushing = false
    /** @type {Set<string>} op IDs not yet confirmed by S3 */
    this._pendingIds = new Set()
  }

  /** Pull current log from S3 and apply. */
  async start() {
    this.onStatus('syncing')
    await this._pull()
    this.onStatus('ready')
    this._schedulePoll()
  }

  stop() {
    if (this._pollTimer) clearTimeout(this._pollTimer)
    this._pollTimer = null
  }

  /**
   * Local text edit: diff against current state, append an op, push to S3.
   * @param {string} nextText
   * @returns {Promise<void>}
   */
  async pushLocal(nextText) {
    if (nextText === this.text) return
    this.localLamport = bumpLamport(maxLamport(this.ops), this.localLamport)
    const op = makeOp(this.text, nextText, this.localLamport, this.clientId)
    if (!op) return
    this.ops.push(op)
    this._pendingIds.add(op.id)
    this.text = foldOps(this.ops)
    this.onText(this.text, 'local')
    await this._push(op)
  }

  /**
   * @param {Op} localOp
   * @returns {Promise<void>}
   */
  async _push(localOp) {
    if (this._pushing) return
    this._pushing = true
    this.onStatus('saving')
    try {
      let op = localOp
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const etag = await putLog(this.client, this.config, this.roomKey, this.ops, this.etag)
          this.etag = etag
          this._pendingIds.clear()
          this.onStatus('ready')
          return
        } catch (err) {
          if (!isPreconditionFailure(err)) throw err
          const rebased = await this._rebase(op)
          if (!rebased) {
            this.onStatus('ready')
            return
          }
          op = rebased
        }
      }
      this.onStatus('conflict')
    } catch (err) {
      console.error('push failed', err)
      this.onStatus('error')
    } finally {
      this._pushing = false
    }
  }

  /**
   * On PUT conflict: refetch log, drop our rejected op, recompute a fresh op
   * that transforms old text → intended text against the new base, append,
   * and signal the caller to retry. Returns the newly appended op, or null
   * if the intended edit is now a no-op.
   * @param {Op} failed
   * @returns {Promise<Op | null>}
   */
  async _rebase(failed) {
    const intended = this.text
    const remote = await getLog(this.client, this.config, this.roomKey)
    const filtered = remote.ops.filter(o => o.id !== failed.id)
    this._pendingIds.delete(failed.id)
    this.ops = filtered
    this.etag = remote.etag
    const base = foldOps(this.ops)
    if (base === intended) {
      this.text = base
      this.onText(this.text, 'remote')
      return null
    }
    this.localLamport = bumpLamport(maxLamport(this.ops), this.localLamport)
    const fresh = makeOp(base, intended, this.localLamport, this.clientId)
    if (!fresh) {
      this.text = base
      this.onText(this.text, 'remote')
      return null
    }
    this.ops.push(fresh)
    this._pendingIds.add(fresh.id)
    this.text = foldOps(this.ops)
    this.onText(this.text, 'remote')
    return fresh
  }

  /** @returns {Promise<void>} */
  async _pull() {
    const snap = await getLog(this.client, this.config, this.roomKey)
    if (snap.etag === this.etag && this.etag !== null) return
    const pending = this._pendingIds.size > 0
      ? this.ops.filter(o => this._pendingIds.has(o.id))
      : []
    this.ops = snap.ops.concat(pending)
    this.etag = snap.etag
    const next = foldOps(this.ops)
    if (next !== this.text) {
      this.text = next
      this.onText(this.text, 'remote')
    }
  }

  _schedulePoll() {
    this._pollTimer = setTimeout(async () => {
      if (!document.hidden && !this._pushing) {
        try { await this._pull() } catch (err) { console.error('poll failed', err) }
      }
      this._schedulePoll()
    }, POLL_MS)
  }
}

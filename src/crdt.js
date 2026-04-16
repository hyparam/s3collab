/**
 * Op-log CRDT for a single plain-text document.
 *
 * Each op is a contiguous-range replace. Ops are totally ordered by
 * (lamport, clientId). The resulting state is produced by applying ops in
 * that order. Because the server serializes writes via If-Match, concurrent
 * edits never end up in the log out of order; the log is effectively a linear
 * history and the "CRDT" part is really just last-writer-wins-on-a-range once
 * rebased by the sync layer.
 */

/**
 * @typedef {object} Op
 * @property {string} id
 * @property {number} lamport
 * @property {string} clientId
 * @property {number} ts
 * @property {'replace'} type
 * @property {number} from
 * @property {number} to
 * @property {string} text
 */

/**
 * @param {Op} a
 * @param {Op} b
 * @returns {number}
 */
export function compareOps(a, b) {
  if (a.lamport !== b.lamport) return a.lamport - b.lamport
  if (a.clientId < b.clientId) return -1
  if (a.clientId > b.clientId) return 1
  return 0
}

/**
 * Fold ops (in any order) into a single text string.
 * @param {Op[]} ops
 * @returns {string}
 */
export function foldOps(ops) {
  const sorted = [...ops].sort(compareOps)
  let text = ''
  for (const op of sorted) {
    if (op.type !== 'replace') continue
    const from = Math.max(0, Math.min(op.from, text.length))
    const to = Math.max(from, Math.min(op.to, text.length))
    text = text.slice(0, from) + op.text + text.slice(to)
  }
  return text
}

/**
 * Diff two strings into a single replace-range op. Finds the longest common
 * prefix and suffix and emits the differing middle as a replacement.
 * Returns null if the strings are identical.
 * @param {string} prev
 * @param {string} next
 * @returns {{ from: number, to: number, text: string } | null}
 */
export function diffReplace(prev, next) {
  if (prev === next) return null
  let start = 0
  const minLen = Math.min(prev.length, next.length)
  while (start < minLen && prev.charCodeAt(start) === next.charCodeAt(start)) {
    start++
  }
  let endPrev = prev.length
  let endNext = next.length
  while (
    endPrev > start &&
    endNext > start &&
    prev.charCodeAt(endPrev - 1) === next.charCodeAt(endNext - 1)
  ) {
    endPrev--
    endNext--
  }
  return {
    from: start,
    to: endPrev,
    text: next.slice(start, endNext),
  }
}

/**
 * Build a replace-op for a local edit.
 * @param {string} prev
 * @param {string} next
 * @param {number} lamport
 * @param {string} clientId
 * @returns {Op | null}
 */
export function makeOp(prev, next, lamport, clientId) {
  const d = diffReplace(prev, next)
  if (!d) return null
  return {
    id: crypto.randomUUID(),
    lamport,
    clientId,
    ts: Date.now(),
    type: 'replace',
    from: d.from,
    to: d.to,
    text: d.text,
  }
}

/**
 * Next Lamport value given the max seen and the local counter.
 * @param {number} seen
 * @param {number} local
 * @returns {number}
 */
export function bumpLamport(seen, local) {
  return Math.max(seen, local) + 1
}

/**
 * Highest lamport in an op list (0 if empty).
 * @param {Op[]} ops
 * @returns {number}
 */
export function maxLamport(ops) {
  let m = 0
  for (const op of ops) if (op.lamport > m) m = op.lamport
  return m
}

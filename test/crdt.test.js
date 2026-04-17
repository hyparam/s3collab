import { describe, expect, it } from 'vitest'
import { bumpLamport, compareOps, diffReplace, foldOps, makeOp, maxLamport } from '../src/crdt.js'

/**
 * @import { Op } from '../src/crdt.js'
 */

describe('diffReplace', () => {
  it('returns null for identical strings', () => {
    expect(diffReplace('abc', 'abc')).toBe(null)
  })

  it('detects single insertion', () => {
    expect(diffReplace('hello', 'heyllo')).toEqual({ from: 2, to: 2, text: 'y' })
  })

  it('detects single deletion', () => {
    expect(diffReplace('hello', 'hllo')).toEqual({ from: 1, to: 2, text: '' })
  })

  it('detects middle replacement', () => {
    expect(diffReplace('foo bar baz', 'foo qux baz')).toEqual({ from: 4, to: 7, text: 'qux' })
  })

  it('detects append', () => {
    expect(diffReplace('abc', 'abcdef')).toEqual({ from: 3, to: 3, text: 'def' })
  })

  it('detects clear', () => {
    expect(diffReplace('abc', '')).toEqual({ from: 0, to: 3, text: '' })
  })
})

describe('foldOps', () => {
  it('applies ops in lamport order', () => {
    /** @type {Op[]} */
    const ops = [
      { id: '1', lamport: 1, clientId: 'a', ts: 0, type: 'replace', from: 0, to: 0, text: 'hello' },
      { id: '2', lamport: 2, clientId: 'a', ts: 0, type: 'replace', from: 5, to: 5, text: ' world' },
    ]
    expect(foldOps(ops)).toBe('hello world')
  })

  it('ignores op order in input', () => {
    /** @type {Op[]} */
    const ops = [
      { id: '2', lamport: 2, clientId: 'a', ts: 0, type: 'replace', from: 5, to: 5, text: ' world' },
      { id: '1', lamport: 1, clientId: 'a', ts: 0, type: 'replace', from: 0, to: 0, text: 'hello' },
    ]
    expect(foldOps(ops)).toBe('hello world')
  })

  it('breaks ties by clientId', () => {
    /** @type {Op[]} */
    const ops = [
      { id: '2', lamport: 1, clientId: 'b', ts: 0, type: 'replace', from: 0, to: 0, text: 'B' },
      { id: '1', lamport: 1, clientId: 'a', ts: 0, type: 'replace', from: 0, to: 0, text: 'A' },
    ]
    expect(foldOps(ops)).toBe('BA')
  })
})

describe('makeOp', () => {
  it('returns null for no-change', () => {
    expect(makeOp('x', 'x', 1, 'a')).toBe(null)
  })

  it('round-trips through foldOps', () => {
    const op = makeOp('', 'hello', 1, 'a')
    expect(op).not.toBeNull()
    expect(foldOps([op])).toBe('hello')
  })
})

describe('bumpLamport / maxLamport', () => {
  it('bumps past the larger of seen and local', () => {
    expect(bumpLamport(3, 5)).toBe(6)
    expect(bumpLamport(10, 2)).toBe(11)
  })

  it('maxLamport finds largest', () => {
    expect(maxLamport([])).toBe(0)
    expect(maxLamport([
      { id: 'a', lamport: 3, clientId: 'x', ts: 0, type: 'replace', from: 0, to: 0, text: '' },
      { id: 'b', lamport: 7, clientId: 'x', ts: 0, type: 'replace', from: 0, to: 0, text: '' },
    ])).toBe(7)
  })
})

describe('compareOps', () => {
  it('orders by lamport then clientId', () => {
    /** @type {Op} */
    const a = { id: '1', lamport: 1, clientId: 'a', ts: 0, type: 'replace', from: 0, to: 0, text: '' }
    const b = { ...a, id: '2', lamport: 2 }
    const c = { ...a, id: '3', clientId: 'b' }
    expect(compareOps(a, b)).toBeLessThan(0)
    expect(compareOps(a, c)).toBeLessThan(0)
    expect(compareOps(a, a)).toBe(0)
  })
})

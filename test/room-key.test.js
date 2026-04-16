import { describe, expect, it } from 'vitest'
import { generateKey, isValidKey } from '../src/room-key.js'

describe('room-key', () => {
  it('generates keys in word-word-word form', () => {
    for (let i = 0; i < 100; i++) {
      const k = generateKey()
      expect(isValidKey(k)).toBe(true)
      expect(k.split('-')).toHaveLength(3)
    }
  })

  it('rejects malformed keys', () => {
    expect(isValidKey('')).toBe(false)
    expect(isValidKey('only-two')).toBe(false)
    expect(isValidKey('Has-Caps-Here')).toBe(false)
    expect(isValidKey('has_underscore_here')).toBe(false)
    expect(isValidKey('one-two-three-four')).toBe(false)
  })

  it('produces varied keys', () => {
    const keys = new Set()
    for (let i = 0; i < 50; i++) keys.add(generateKey())
    expect(keys.size).toBeGreaterThan(40)
  })
})

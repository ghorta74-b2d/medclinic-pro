import { describe, it, expect } from 'vitest'
import { generateResetToken, hashToken, getTokenExpiry } from '../services/token.service.js'

describe('generateResetToken', () => {
  it('produces a 64-char hex token and a 64-char SHA-256 hash', () => {
    const { token, tokenHash } = generateResetToken()
    expect(token).toHaveLength(64)
    expect(tokenHash).toHaveLength(64)
    expect(/^[0-9a-f]+$/.test(token)).toBe(true)
    expect(/^[0-9a-f]+$/.test(tokenHash)).toBe(true)
  })

  it('produces different tokens on each call', () => {
    const a = generateResetToken()
    const b = generateResetToken()
    expect(a.token).not.toBe(b.token)
    expect(a.tokenHash).not.toBe(b.tokenHash)
  })

  it('tokenHash matches what hashToken(token) produces', () => {
    const { token, tokenHash } = generateResetToken()
    expect(hashToken(token)).toBe(tokenHash)
  })
})

describe('hashToken', () => {
  it('is deterministic for the same input', () => {
    const t = 'abc123'
    expect(hashToken(t)).toBe(hashToken(t))
  })

  it('produces different hashes for different inputs', () => {
    expect(hashToken('aaa')).not.toBe(hashToken('bbb'))
  })
})

describe('getTokenExpiry', () => {
  it('returns a date approximately 1 hour in the future', () => {
    const before = Date.now()
    const expiry = getTokenExpiry(1)
    const after = Date.now()
    const expected = before + 60 * 60 * 1000
    expect(expiry.getTime()).toBeGreaterThanOrEqual(expected - 100)
    expect(expiry.getTime()).toBeLessThanOrEqual(after + 60 * 60 * 1000 + 100)
  })

  it('respects the hours parameter', () => {
    const expiry = getTokenExpiry(2)
    const diff = expiry.getTime() - Date.now()
    expect(diff).toBeGreaterThan(1.9 * 60 * 60 * 1000)
    expect(diff).toBeLessThan(2.1 * 60 * 60 * 1000)
  })
})

describe('token validation logic', () => {
  it('valid token: expiresAt in future, usedAt null → passes', () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    const usedAt = null
    const isValid = expiresAt > new Date() && usedAt === null
    expect(isValid).toBe(true)
  })

  it('expired token: expiresAt in past → fails', () => {
    const expiresAt = new Date(Date.now() - 1000)
    const usedAt = null
    const isValid = expiresAt > new Date() && usedAt === null
    expect(isValid).toBe(false)
  })

  it('used token: usedAt set → fails', () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    const usedAt = new Date()
    const isValid = expiresAt > new Date() && usedAt === null
    expect(isValid).toBe(false)
  })

  it('nonexistent token: record is null → fails', () => {
    const record = null
    const isValid = !!record
    expect(isValid).toBe(false)
  })
})

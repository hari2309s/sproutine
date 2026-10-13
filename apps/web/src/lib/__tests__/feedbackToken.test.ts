import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { signTrace, verifyTrace } from '../feedbackToken'

describe('feedback tokens', () => {
  const original = process.env.LANGFUSE_SECRET_KEY
  beforeEach(() => {
    process.env.LANGFUSE_SECRET_KEY = 'test-secret'
  })
  afterEach(() => {
    process.env.LANGFUSE_SECRET_KEY = original
  })

  it('verifies a token for the same trace and user', () => {
    const token = signTrace('trace-1', 'user-a')!
    expect(verifyTrace('trace-1', 'user-a', token)).toBe(true)
  })

  it("rejects another user's token or another trace", () => {
    const token = signTrace('trace-1', 'user-a')!
    expect(verifyTrace('trace-1', 'user-b', token)).toBe(false)
    expect(verifyTrace('trace-2', 'user-a', token)).toBe(false)
    expect(verifyTrace('trace-1', 'user-a', 'forged')).toBe(false)
  })

  it('issues no tokens and accepts none without a key', () => {
    delete process.env.LANGFUSE_SECRET_KEY
    expect(signTrace('trace-1', 'user-a')).toBeUndefined()
    expect(verifyTrace('trace-1', 'user-a', 'anything')).toBe(false)
  })
})

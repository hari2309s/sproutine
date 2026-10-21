import { describe, it, expect } from 'vitest'
import { cancellationConfirmation, cancellationReceipt } from '../mailer'

const AT = new Date('2026-10-21T08:30:00Z')

describe('cancellation emails', () => {
  it('confirms contract, time received and end date (§ 312k (4) BGB)', () => {
    const { subject, text } = cancellationConfirmation(AT, '2026-11-21T00:00:00Z')
    expect(subject).toMatch(/Kündigungsbestätigung/)
    expect(text).toContain('Sproutine Pro subscription')
    expect(text).toContain('21 October 2026 at 10:30 (Berlin time)')
    expect(text).toContain('Pro ends on: 21 November 2026')
  })

  it('falls back to the period end wording without a date', () => {
    expect(cancellationConfirmation(AT, null).text).toContain(
      'the end of your current billing period'
    )
  })

  it('repeats what the visitor submitted in the receipt', () => {
    const { text } = cancellationReceipt(AT, {
      name: 'Hari',
      email: 'hari@example.com',
      kind: 'extraordinary',
      reason: 'Moving abroad',
    })
    expect(text).toContain('Hello Hari')
    expect(text).toContain('hari@example.com')
    expect(text).toContain('extraordinary cancellation')
    expect(text).toContain('Reason: Moving abroad')
  })
})

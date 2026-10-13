import { describe, it, expect } from 'vitest'
import { detectSubscriptions } from '../subscriptions'

const makeTx = (
  description: string,
  amount: number,
  date: string,
  merchant?: string,
  currency = 'EUR'
) => ({ description, amount, date, merchant, currency })

describe('detectSubscriptions', () => {
  it('returns empty array for no transactions', () => {
    expect(detectSubscriptions([])).toEqual([])
  })

  it('ignores income (positive amounts)', () => {
    const txs = [
      makeTx('Netflix', 15, '2026-01-01'),
      makeTx('Netflix', 15, '2026-02-01'),
      makeTx('Salary', 3000, '2026-01-01'),
      makeTx('Salary', 3000, '2026-02-01'),
    ]
    const result = detectSubscriptions(txs)
    expect(result.every((s) => s.key !== 'salary')).toBe(true)
  })

  it('does not flag a merchant appearing in only one month', () => {
    const txs = [makeTx('Netflix', -15, '2026-01-01'), makeTx('Netflix', -15, '2026-01-15')]
    expect(detectSubscriptions(txs)).toHaveLength(0)
  })

  it('detects a subscription appearing in 2+ distinct months', () => {
    const txs = [makeTx('Netflix', -15, '2026-01-01'), makeTx('Netflix', -15, '2026-02-01')]
    const result = detectSubscriptions(txs)
    expect(result).toHaveLength(1)
    expect(result[0]!.key).toBe('netflix')
    expect(result[0]!.monthlyAmount).toBe(15)
    expect(result[0]!.monthsDetected).toBe(2)
  })

  it('uses merchant over description for key normalisation', () => {
    const txs = [
      makeTx('PMT REF 123', -9.99, '2026-01-01', 'Spotify'),
      makeTx('PMT REF 456', -9.99, '2026-02-01', 'Spotify'),
    ]
    const result = detectSubscriptions(txs)
    expect(result).toHaveLength(1)
    expect(result[0]!.key).toBe('spotify')
  })

  it('strips common subscription suffixes when normalising', () => {
    const txs = [
      makeTx('Netflix Monthly', -15, '2026-01-01'),
      makeTx('Netflix Subscription', -15, '2026-02-01'),
    ]
    const result = detectSubscriptions(txs)
    expect(result).toHaveLength(1)
    expect(result[0]!.key).toBe('netflix')
  })

  it('accepts string amounts', () => {
    const txs = [
      { description: 'Spotify', amount: '-9.99', date: '2026-01-01', currency: 'EUR' },
      { description: 'Spotify', amount: '-9.99', date: '2026-02-01', currency: 'EUR' },
    ]
    const result = detectSubscriptions(txs)
    expect(result).toHaveLength(1)
    expect(result[0]!.monthlyAmount).toBeCloseTo(9.99)
  })

  it('filters out transactions with >20% amount variance', () => {
    // 3 small charges + 1 large one-off → median = 20, large tx excluded
    const txs = [
      makeTx('Amazon', -20, '2026-01-01'),
      makeTx('Amazon', -20, '2026-02-01'),
      makeTx('Amazon', -20, '2026-03-01'),
      makeTx('Amazon', -200, '2026-01-15'),
    ]
    const result = detectSubscriptions(txs)
    expect(result).toHaveLength(1)
    expect(result[0]!.monthlyAmount).toBeCloseTo(20)
    expect(result[0]!.monthsDetected).toBe(3)
  })

  it('returns lastCharged as the most recent date', () => {
    const txs = [
      makeTx('Netflix', -15, '2026-03-01'),
      makeTx('Netflix', -15, '2026-01-01'),
      makeTx('Netflix', -15, '2026-02-01'),
    ]
    const result = detectSubscriptions(txs)
    expect(result[0]!.lastCharged).toBe('2026-03-01')
  })

  it('sorts results by monthly amount descending', () => {
    const txs = [
      makeTx('Spotify', -10, '2026-01-01'),
      makeTx('Spotify', -10, '2026-02-01'),
      makeTx('Netflix', -15, '2026-01-01'),
      makeTx('Netflix', -15, '2026-02-01'),
      makeTx('iCloud', -3, '2026-01-01'),
      makeTx('iCloud', -3, '2026-02-01'),
    ]
    const result = detectSubscriptions(txs)
    expect(result.map((s) => s.key)).toEqual(['netflix', 'spotify', 'icloud'])
  })

  it('capitalises displayName correctly', () => {
    const txs = [
      makeTx('youtube premium', -14, '2026-01-01'),
      makeTx('youtube premium', -14, '2026-02-01'),
    ]
    const result = detectSubscriptions(txs)
    expect(result[0]!.displayName).toBe('Youtube Premium')
  })

  it('sets currency from the latest transaction', () => {
    const txs = [
      makeTx('Netflix', -15, '2026-01-01', undefined, 'USD'),
      makeTx('Netflix', -15, '2026-02-01', undefined, 'GBP'),
    ]
    const result = detectSubscriptions(txs)
    expect(result[0]!.currency).toBe('GBP')
  })
})

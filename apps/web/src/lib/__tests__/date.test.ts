import { describe, it, expect } from 'vitest'
import { formatYearMonth, parseDateRange } from '../date'

const MAY_2026 = new Date('2026-05-21T12:00:00Z')
const JAN_2026 = new Date('2026-01-15T12:00:00Z')
const FEB_2026 = new Date('2026-02-10T12:00:00Z')

describe('formatYearMonth', () => {
  it('zero-pads single-digit months', () => {
    expect(formatYearMonth(2026, 1)).toBe('2026-01')
    expect(formatYearMonth(2026, 9)).toBe('2026-09')
  })

  it('leaves double-digit months as-is', () => {
    expect(formatYearMonth(2026, 10)).toBe('2026-10')
    expect(formatYearMonth(2026, 12)).toBe('2026-12')
  })
})

describe('parseDateRange', () => {
  describe('no time expression → current month, explicit: false', () => {
    it('returns current month for a generic question', () => {
      expect(parseDateRange('how much did I spend on coffee?', MAY_2026)).toEqual({
        from: '2026-05',
        to: '2026-05',
        explicit: false,
      })
    })

    it('returns current month when today is in January', () => {
      expect(parseDateRange('what is my balance?', JAN_2026)).toEqual({
        from: '2026-01',
        to: '2026-01',
        explicit: false,
      })
    })
  })

  describe('last month / previous month', () => {
    it('returns the previous month range', () => {
      expect(parseDateRange('how much did I spend last month?', MAY_2026)).toEqual({
        from: '2026-04',
        to: '2026-04',
        explicit: true,
      })
    })

    it('handles "previous month"', () => {
      expect(parseDateRange('show me previous month spending', MAY_2026)).toEqual({
        from: '2026-04',
        to: '2026-04',
        explicit: true,
      })
    })

    it('wraps correctly across year boundary', () => {
      expect(parseDateRange('last month expenses', JAN_2026)).toEqual({
        from: '2025-12',
        to: '2025-12',
        explicit: true,
      })
    })
  })

  describe('last N months', () => {
    it('handles digit: last 2 months', () => {
      expect(parseDateRange('last 2 months groceries', MAY_2026)).toEqual({
        from: '2026-04',
        to: '2026-05',
        explicit: true,
      })
    })

    it('handles word: last two months', () => {
      expect(parseDateRange('how much on groceries the last two months', MAY_2026)).toEqual({
        from: '2026-04',
        to: '2026-05',
        explicit: true,
      })
    })

    it('handles last three months', () => {
      expect(parseDateRange('last three months breakdown', MAY_2026)).toEqual({
        from: '2026-03',
        to: '2026-05',
        explicit: true,
      })
    })

    it('handles past 6 months', () => {
      expect(parseDateRange('past 6 months spending', MAY_2026)).toEqual({
        from: '2025-12',
        to: '2026-05',
        explicit: true,
      })
    })

    it('wraps year correctly when going back many months', () => {
      expect(parseDateRange('last 3 months', FEB_2026)).toEqual({
        from: '2025-12',
        to: '2026-02',
        explicit: true,
      })
    })
  })

  describe('this year / year so far', () => {
    it('handles "this year"', () => {
      expect(parseDateRange('how much did I spend this year?', MAY_2026)).toEqual({
        from: '2026-01',
        to: '2026-05',
        explicit: true,
      })
    })

    it('handles "year so far"', () => {
      expect(parseDateRange('year so far total expenses', MAY_2026)).toEqual({
        from: '2026-01',
        to: '2026-05',
        explicit: true,
      })
    })

    it('handles "year to date"', () => {
      expect(parseDateRange('year to date income', MAY_2026)).toEqual({
        from: '2026-01',
        to: '2026-05',
        explicit: true,
      })
    })

    it('handles "ytd"', () => {
      expect(parseDateRange('ytd breakdown', MAY_2026)).toEqual({
        from: '2026-01',
        to: '2026-05',
        explicit: true,
      })
    })
  })

  describe('last year / previous year', () => {
    it('handles "last year"', () => {
      expect(parseDateRange('how much did I spend last year?', MAY_2026)).toEqual({
        from: '2025-01',
        to: '2025-12',
        explicit: true,
      })
    })

    it('handles "previous year"', () => {
      expect(parseDateRange('compare to previous year', MAY_2026)).toEqual({
        from: '2025-01',
        to: '2025-12',
        explicit: true,
      })
    })
  })
})

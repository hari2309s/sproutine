import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getCurrentPeriod, previousPeriod, computeStreak } from '../habits'

describe('getCurrentPeriod', () => {
  describe('monthly', () => {
    it('returns YYYY-MM format', () => {
      const date = new Date('2026-05-15')
      expect(getCurrentPeriod('monthly', date)).toBe('2026-05')
    })

    it('works for January', () => {
      expect(getCurrentPeriod('monthly', new Date('2026-01-01'))).toBe('2026-01')
    })

    it('works for December', () => {
      expect(getCurrentPeriod('monthly', new Date('2025-12-31'))).toBe('2025-12')
    })
  })

  describe('weekly', () => {
    it('returns YYYY-WNN format', () => {
      // 2026-05-18 is a Monday in week 21
      const period = getCurrentPeriod('weekly', new Date('2026-05-18'))
      expect(period).toMatch(/^\d{4}-W\d{2}$/)
    })

    it('week is zero-padded to 2 digits', () => {
      // 2026-01-05 is in week 2
      const period = getCurrentPeriod('weekly', new Date('2026-01-05'))
      expect(period).toMatch(/W\d{2}$/)
    })

    it('same week for Mon and Sun of same ISO week', () => {
      // 2026-05-18 Monday and 2026-05-24 Sunday are same ISO week
      const mon = getCurrentPeriod('weekly', new Date('2026-05-18'))
      const sun = getCurrentPeriod('weekly', new Date('2026-05-24'))
      expect(mon).toBe(sun)
    })
  })
})

describe('previousPeriod', () => {
  describe('monthly', () => {
    it('returns previous month', () => {
      expect(previousPeriod('monthly', '2026-05')).toBe('2026-04')
    })

    it('wraps January to December of prior year', () => {
      expect(previousPeriod('monthly', '2026-01')).toBe('2025-12')
    })

    it('zero-pads single-digit months', () => {
      expect(previousPeriod('monthly', '2026-10')).toBe('2026-09')
    })
  })

  describe('weekly', () => {
    it('returns previous week in same year', () => {
      const prev = previousPeriod('weekly', '2026-W21')
      expect(prev).toBe('2026-W20')
    })

    it('wraps week 1 to previous year', () => {
      // Week 1 of 2026 → last week of 2025
      const prev = previousPeriod('weekly', '2026-W01')
      expect(prev).toMatch(/^2025-W/)
    })
  })
})

describe('computeStreak', () => {
  it('returns 0 for empty log', () => {
    expect(computeStreak('monthly', [])).toBe(0)
  })

  it('returns 1 for single logged period that is current', () => {
    const current = getCurrentPeriod('monthly')
    expect(computeStreak('monthly', [current])).toBe(1)
  })

  it('counts consecutive months ending at current period', () => {
    const current = getCurrentPeriod('monthly')
    const prev1 = previousPeriod('monthly', current)
    const prev2 = previousPeriod('monthly', prev1)
    expect(computeStreak('monthly', [current, prev1, prev2])).toBe(3)
  })

  it('stops at a gap in the streak', () => {
    const current = getCurrentPeriod('monthly')
    const prev1 = previousPeriod('monthly', current)
    // skip prev2, jump to prev3 — gap breaks streak
    const prev2 = previousPeriod('monthly', prev1)
    const prev3 = previousPeriod('monthly', prev2)
    expect(computeStreak('monthly', [current, prev1, prev3])).toBe(2)
  })

  it('counts streak from last logged period when current not logged', () => {
    const current = getCurrentPeriod('monthly')
    const prev1 = previousPeriod('monthly', current)
    const prev2 = previousPeriod('monthly', prev1)
    // current period not logged, but prev1 and prev2 are consecutive
    expect(computeStreak('monthly', [prev1, prev2])).toBe(2)
  })

  it('handles weekly streaks', () => {
    const current = getCurrentPeriod('weekly')
    const prev1 = previousPeriod('weekly', current)
    expect(computeStreak('weekly', [current, prev1])).toBe(2)
  })
})

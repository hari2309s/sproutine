import { describe, it, expect } from 'vitest'
import {
  computeStreak,
  dueNudges,
  isoWeek,
  localTime,
  milestoneReached,
  streakNudge,
  type NudgeContext,
} from '../index'

describe('localTime', () => {
  it('reads date, hour and weekday on the person’s clock', () => {
    // 2026-10-18 is a Sunday; 17:30 UTC is 19:30 in Berlin (CEST).
    expect(localTime(new Date('2026-10-18T17:30:00Z'), 'Europe/Berlin')).toEqual({
      date: '2026-10-18',
      hour: 19,
      weekday: 6,
    })
    // Same instant in New York is still the afternoon.
    expect(localTime(new Date('2026-10-18T17:30:00Z'), 'America/New_York').hour).toBe(13)
    // Unknown zone: Berlin.
    expect(localTime(new Date('2026-10-18T17:30:00Z'), 'Not/AZone').hour).toBe(19)
  })

  it('names ISO weeks across a year boundary', () => {
    expect(isoWeek('2026-10-14')).toBe('2026-W42')
    expect(isoWeek('2027-01-01')).toBe('2026-W53')
  })
})

describe('computeStreak', () => {
  it('counts consecutive days and keeps a streak alive until the day ends', () => {
    const days = ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13']
    expect(computeStreak('daily', days, '2026-10-13')).toBe(4)
    // Not yet checked today: yesterday's run still counts.
    expect(computeStreak('daily', days, '2026-10-14')).toBe(4)
    // A missed day ends it.
    expect(computeStreak('daily', days, '2026-10-15')).toBe(0)
    expect(computeStreak('daily', [], '2026-10-15')).toBe(0)
  })

  it('counts weeks for weekly habits', () => {
    const dates = ['2026-09-30', '2026-10-06', '2026-10-15'] // W40, W41, W42
    expect(computeStreak('weekly', dates, '2026-10-16')).toBe(3)
    expect(computeStreak('weekly', ['2026-09-30', '2026-10-15'], '2026-10-16')).toBe(1)
  })

  it('reports milestones only on the way up', () => {
    expect(milestoneReached(2, 3)).toBe(3)
    expect(milestoneReached(3, 4)).toBeNull()
    expect(milestoneReached(6, 7)).toBe(7)
    expect(milestoneReached(7, 3)).toBeNull()
  })
})

const base = (over: Partial<NudgeContext> = {}): NudgeContext => ({
  now: new Date(),
  timeZone: 'Europe/Berlin',
  safetyMode: false,
  name: 'Sam',
  loggedToday: false,
  daysLoggedThisWeek: 4,
  mealsLoggedThisWeek: 9,
  hasPlanNextWeek: false,
  habitsKeptThisWeek: ['Drink water'],
  sentKeys: new Set(),
  ...over,
})

/**
 * Phase 5 exit: a simulated 14 days, run hourly like the scheduler. Every
 * expected nudge fires exactly once, nothing fires in quiet hours, and
 * gentle-mode nudges contain no numbers.
 */
function simulate(over: Partial<NudgeContext>, timeZone = 'Europe/Berlin') {
  const sent: { key: string; text: string; hour: number }[] = []
  const keys = new Set<string>()
  // Monday 12 Oct 2026 00:00 UTC, for 14 days.
  const start = Date.parse('2026-10-12T00:00:00Z')
  for (let h = 0; h < 14 * 24; h++) {
    const now = new Date(start + h * 3_600_000)
    const t = localTime(now, timeZone)
    // Logs on weekdays only, by 12:00: weekend days trigger the 14:00 nudge.
    const loggedToday = t.weekday < 5 && t.hour >= 12
    for (const n of dueNudges(base({ ...over, now, timeZone, loggedToday, sentKeys: keys }))) {
      keys.add(n.key)
      sent.push({ key: n.key, text: n.text, hour: t.hour })
    }
  }
  return sent
}

describe('14-day simulation', () => {
  it('fires every expected nudge exactly once and never in quiet hours', () => {
    const sent = simulate({})
    const keys = sent.map((s) => s.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(sent.every((s) => s.hour >= 8 && s.hour < 21)).toBe(true)
    // Weekday logs land by 12:00, so only weekend days miss the 14:00 mark.
    const nolog = keys.filter((k) => k.startsWith('nolog:'))
    expect(nolog).toEqual([
      'nolog:2026-10-17',
      'nolog:2026-10-18',
      'nolog:2026-10-24',
      'nolog:2026-10-25',
    ])
    expect(keys.filter((k) => k.startsWith('weekly:'))).toEqual([
      'weekly:2026-W42',
      'weekly:2026-W43',
    ])
    expect(keys.filter((k) => k.startsWith('plan-reminder:'))).toEqual([
      'plan-reminder:2026-W43',
      'plan-reminder:2026-W44',
    ])
    // Timed to the person's clock: the weekly review lands at 18:00 local.
    expect(sent.find((s) => s.key === 'weekly:2026-W42')!.hour).toBe(18)
  })

  it('in gentle mode sends no numbers and never mentions missed meals', () => {
    const sent = simulate({ safetyMode: true })
    expect(sent.some((s) => s.key.startsWith('nolog:'))).toBe(false)
    expect(sent.length).toBeGreaterThan(0)
    for (const s of sent) expect(s.text, s.key).not.toMatch(/\d/)
  })

  it('follows each person’s own time zone', () => {
    const sent = simulate({}, 'America/New_York')
    expect(sent.every((s) => s.hour >= 8 && s.hour < 21)).toBe(true)
    // The run starts Monday 00:00 UTC, still Sunday 20:00 in New York, so that
    // week's review fires at once; the next one lands at 18:00 local.
    expect(sent.find((s) => s.key === 'weekly:2026-W42')!.hour).toBe(18)
  })

  it('skips the plan reminder when next week is already planned', () => {
    expect(
      simulate({ hasPlanNextWeek: true }).some((s) => s.key.startsWith('plan-reminder:'))
    ).toBe(false)
  })
})

describe('weekly review text', () => {
  it('uses code-counted stats', () => {
    const [n] = dueNudges(
      base({ now: new Date('2026-10-18T17:00:00Z'), loggedToday: true, hasPlanNextWeek: true })
    )
    expect(n!.text).toContain('you logged 9 meals on 4 days')
    expect(n!.text).toContain('"Drink water"')
  })
})

describe('streakNudge', () => {
  it('celebrates with a count, or without one in gentle mode', () => {
    const habit = { id: 'h1', title: 'Drink water', period: 'daily' as const }
    expect(streakNudge(habit, 7, false)).toMatchObject({ key: 'habit-streak:h1:7' })
    expect(streakNudge(habit, 7, false).text).toContain('7 days in a row')
    expect(streakNudge(habit, 7, true).text).not.toMatch(/\d/)
  })
})

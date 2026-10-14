import { describe, it, expect } from 'vitest'
import type { Profile } from '@sproutine/types'
import { buildSystemPrompt } from '../systemPrompt'

const profile: Profile = {
  userId: '7f1d2c3b-0000-4000-8000-000000000001',
  displayName: 'Sam',
  diet: 'vegetarian',
  allergies: ['peanuts', 'sesame'],
  dislikes: ['mushrooms'],
  budgetWeeklyCents: 6000,
  goals: ['more vegetables'],
  quitDate: '2026-09-01',
  locale: 'en',
  voiceId: 'rosie',
  safetyMode: false,
  consentHealthAt: '2026-10-13T10:00:00Z',
  llmPseudonym: '1e2d3c4b-0000-4000-8000-000000000002',
}

const base = { profile, intent: 'ask_nutrition' as const, medical: false, today: 'Tuesday' }

describe('buildSystemPrompt', () => {
  it('includes the profile context the agent needs', () => {
    const prompt = buildSystemPrompt(base)
    expect(prompt).toContain('Sam')
    expect(prompt).toContain('vegetarian')
    expect(prompt).toContain('peanuts, sesame')
    expect(prompt).toContain('mushrooms')
    expect(prompt).toContain('€60')
    expect(prompt).toContain('quit smoking on 2026-09-01')
  })

  it('never sends the user id or pseudonym to the model', () => {
    const prompt = buildSystemPrompt(base)
    expect(prompt).not.toContain(profile.userId)
    expect(prompt).not.toContain(profile.llmPseudonym)
  })

  it('switches to gentle mode without numbers when safety mode is on', () => {
    const prompt = buildSystemPrompt({ ...base, profile: { ...profile, safetyMode: true } })
    expect(prompt).toContain('Gentle mode is on')
  })

  it('adds medical guidance only when flagged', () => {
    expect(buildSystemPrompt(base)).not.toContain('## Medical topic')
    expect(buildSystemPrompt({ ...base, medical: true })).toContain('## Medical topic')
  })

  it('tells the model not to claim features that are not built yet', () => {
    expect(buildSystemPrompt({ ...base, intent: 'log_meal' })).toContain('Never claim you saved it')
    expect(buildSystemPrompt(base)).not.toContain('What you can do right now')
  })
})

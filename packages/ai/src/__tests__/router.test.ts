import { describe, it, expect } from 'vitest'
import { DAILY_LIMITS, PRIORITY_ORDER } from '../router'
import type { Provider, TaskType } from '../types'

const ALL_PROVIDERS: Provider[] = ['groq', 'gemini', 'cerebras', 'openrouter', 'mistral']
const ALL_TASKS: TaskType[] = ['fast-chat', 'reasoning', 'vision', 'tool-calling']

describe('DAILY_LIMITS', () => {
  it('has a limit defined for every provider', () => {
    for (const provider of ALL_PROVIDERS) {
      expect(DAILY_LIMITS).toHaveProperty(provider)
      expect(typeof DAILY_LIMITS[provider]).toBe('number')
    }
  })

  it('all limits are positive integers', () => {
    for (const [, limit] of Object.entries(DAILY_LIMITS)) {
      expect(limit).toBeGreaterThan(0)
      expect(Number.isInteger(limit)).toBe(true)
    }
  })

  it('has no extra providers beyond the defined set', () => {
    expect(Object.keys(DAILY_LIMITS).sort()).toEqual([...ALL_PROVIDERS].sort())
  })
})

describe('PRIORITY_ORDER', () => {
  it('has an entry for every task type', () => {
    for (const task of ALL_TASKS) {
      expect(PRIORITY_ORDER).toHaveProperty(task)
    }
  })

  it('every task has at least one provider', () => {
    for (const task of ALL_TASKS) {
      expect(PRIORITY_ORDER[task].length).toBeGreaterThan(0)
    }
  })

  it('every provider listed in PRIORITY_ORDER is a known provider', () => {
    for (const [task, providers] of Object.entries(PRIORITY_ORDER)) {
      for (const provider of providers) {
        expect(ALL_PROVIDERS, `${task} references unknown provider ${provider}`).toContain(provider)
      }
    }
  })

  it('has no extra task types beyond the defined set', () => {
    expect(Object.keys(PRIORITY_ORDER).sort()).toEqual([...ALL_TASKS].sort())
  })

  it('no duplicate providers within a task priority list', () => {
    for (const [task, providers] of Object.entries(PRIORITY_ORDER)) {
      const unique = new Set(providers)
      expect(unique.size, `${task} has duplicate providers`).toBe(providers.length)
    }
  })
})

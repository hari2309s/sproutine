import { describe, it, expect } from 'vitest'
import { getModelId, MODELS } from '../models'
import { PRIORITY_ORDER } from '../router'
import type { TaskType } from '../types'

describe('getModelId', () => {
  it('returns a configured model for every provider a task can route to', () => {
    const configured = new Set(Object.values(MODELS).flatMap((m) => Object.values(m)))
    for (const [task, providers] of Object.entries(PRIORITY_ORDER)) {
      for (const provider of providers) {
        expect(configured).toContain(getModelId(provider, task as TaskType))
      }
    }
  })

  it('uses the safeguard classifier for safety on Groq', () => {
    expect(getModelId('groq', 'safety')).toBe(MODELS.groq.safeguard)
  })
})

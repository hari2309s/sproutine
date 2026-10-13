import { describe, it, expect } from 'vitest'
import { keywordScreen, parseSafetyLabel, SAFE_RESPONSES } from '../safety'

describe('keywordScreen', () => {
  it.each([
    'I want to kill myself',
    "honestly I don't want to live anymore",
    'thinking about self-harm again',
    'Ich will nicht mehr leben',
  ])('flags crisis: %s', (msg) => {
    expect(keywordScreen(msg)?.category).toBe('crisis')
  })

  it.each([
    'I make myself throw up after dinner',
    'which laxatives work fastest',
    'I want to eat 500 calories a day',
    'plan me 600 kcal per day',
    'I hate my body so much',
    'ich nehme Abführmittel nach dem Essen',
    'punishing myself by skipping meals',
  ])('flags ed_risk: %s', (msg) => {
    expect(keywordScreen(msg)?.category).toBe('ed_risk')
  })

  it.each([
    "I'm pregnant, what should I avoid?",
    'I have type 2 diabetes',
    'ich bin schwanger',
    'does this clash with my medication?',
  ])('flags medical: %s', (msg) => {
    expect(keywordScreen(msg)?.category).toBe('medical')
  })

  it.each([
    'I had muesli with yoghurt for breakfast',
    'I eat about 1500 calories a day',
    "I'm fasting for Ramadan, what's a good suhoor?",
    'how much protein is in lentils?',
    'I want to lose a bit of weight after quitting smoking',
    'plan my week please',
  ])('lets ordinary messages through to the classifier: %s', (msg) => {
    expect(keywordScreen(msg)).toBeNull()
  })

  it('ranks crisis above ed_risk when both appear', () => {
    expect(keywordScreen('I starve myself and want to end my life')?.category).toBe('crisis')
  })
})

describe('parseSafetyLabel', () => {
  it('parses a bare label', () => {
    expect(parseSafetyLabel(' ed_risk\n')).toBe('ed_risk')
    expect(parseSafetyLabel('OK')).toBe('ok')
  })

  it('picks the most serious label from a leaked preamble', () => {
    expect(parseSafetyLabel('Could be medical, but this is crisis')).toBe('crisis')
  })

  it('returns null for unparseable output', () => {
    expect(parseSafetyLabel('')).toBeNull()
    expect(parseSafetyLabel('I cannot help with that')).toBeNull()
  })
})

describe('SAFE_RESPONSES', () => {
  it('crisis response carries the TelefonSeelsorge numbers and 112', () => {
    expect(SAFE_RESPONSES.crisis).toContain('0800 111 0 111')
    expect(SAFE_RESPONSES.crisis).toContain('0800 111 0 222')
    expect(SAFE_RESPONSES.crisis).toContain('112')
  })

  it('ed_risk response carries the BIÖG helpline and no numbers about food', () => {
    expect(SAFE_RESPONSES.ed_risk).toContain('0221 892031')
    expect(SAFE_RESPONSES.ed_risk).not.toMatch(/\b(k?cal|calories?|grams?)\b/i)
  })
})

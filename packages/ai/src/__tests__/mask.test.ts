import { describe, it, expect } from 'vitest'
import { maskContactDetails } from '../mask'

describe('maskContactDetails', () => {
  it('masks emails', () => {
    expect(maskContactDetails('mail me at sam.k+food@posteo.de please')).toBe('mail me at [email] please')
  })

  it.each(['+49 151 23456789', '0151 2345 6789', '0049-30-1234567', '030/1234567'])(
    'masks phone number %s',
    (phone) => {
      expect(maskContactDetails(`call ${phone} later`)).toBe('call [phone] later')
    }
  )

  it('masks numbers next to sentence punctuation', () => {
    expect(maskContactDetails('call me on 0151 23456789.')).toBe('call me on [phone].')
    expect(maskContactDetails('Tel:015123456789, thanks')).toBe('Tel:[phone], thanks')
  })

  it.each([
    'on 13/10/2026',
    'on 01/10/2026 I ate',
    'since 05/03/2025.',
    'at 2026-10-13T10:00:00.000Z',
    'about 1200-1500 kcal',
    'trace 14afbdf166f41f077b744e12449db0b2',
    '"tokens": 412',
  ])('leaves %s alone', (text) => {
    expect(maskContactDetails(text)).toBe(text)
  })

  it('keeps the public helpline numbers from safety replies readable', () => {
    const text = 'TelefonSeelsorge: 0800 111 0 111 or 0800 111 0 222; BIÖG 0221 892031'
    expect(maskContactDetails(text)).toBe(text)
  })
})

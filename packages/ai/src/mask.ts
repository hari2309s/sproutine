import { SAFETY_CONTACTS } from '@sproutine/types'

// Second line of defence for contact details users type into chat. Users are
// already pseudonymous in traces; this keeps typed emails and phone numbers
// out of Langfuse too.

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
// Phone-like: starts with +, 00 or a trunk 0, then 7+ more digits with
// optional separators. Dates (13/10/2026), ISO timestamps and ranges like
// "1200-1500 kcal" don't start that way, so they're left alone.
const PHONE = /(?<![\w/.:-])(?:\+|00|0)\d[\d\s/()-]{5,}\d(?![\w/.:-])/g

// Public helplines in safety replies stay readable so reviewers can see
// which ones were offered.
const PUBLIC_NUMBERS = new Set<string>(Object.values(SAFETY_CONTACTS).map((c) => c.tel))

export function maskContactDetails(data: string): string {
  return data.replace(EMAIL, '[email]').replace(PHONE, (match) => {
    const digits = match.replace(/\D/g, '')
    if (PUBLIC_NUMBERS.has(digits)) return match
    return digits.length >= 8 ? '[phone]' : match
  })
}

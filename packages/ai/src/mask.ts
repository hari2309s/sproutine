import { SAFETY_CONTACTS } from '@sproutine/types'

// Second line of defence for contact details users type into chat. Users are
// already pseudonymous in traces; this keeps typed emails and phone numbers
// out of Langfuse too.

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
// Phone-like: starts with +, 00 or a trunk 0, then more digits with optional
// separators, and isn't glued to surrounding letters/digits. Sentence
// punctuation around it is fine ("call 0151 23456789." / "Tel:0151…").
// Ranges like "1200-1500 kcal" and ISO timestamps don't start that way.
// A match may not start on a slash date ("01/10/2026"), which would otherwise
// look phone-like and swallow the text after it; a number after the date is
// still matched on its own.
const PHONE =
  /(?<![\w/])(?!\d{1,2}\/\d{1,2}\/\d{2,4}(?![\d/]))(?:\+|00|0)\d[\d\s/()-]{5,}\d(?![\w/])/g

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

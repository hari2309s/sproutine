import type { SafetyCategory, SafetyVerdict } from '@sproutine/types'
import { SAFETY_CONTACTS as C } from '@sproutine/types'
import { routedGenerateText } from './router'

// ─── Layer 1: deterministic keyword screen ────────────────────────────────────
//
// High-precision patterns only (EN + DE). Anything ambiguous ("fasting",
// "lose weight") is left to the classifier — a keyword false positive here
// replaces the user's whole answer with a templated safety reply, so these
// must be phrases that are unambiguous on their own.
//
// Order matters: crisis outranks ed_risk outranks medical.

const CRISIS_PATTERNS: RegExp[] = [
  /\b(kill|hurt|harm)(ing)?\s+my\s?self\b/i,
  /\bsuicid(e|al)\b/i,
  /\bend(ing)?\s+(it\s+all|my\s+life)\b/i,
  /\b(don'?t|do\s+not)\s+want\s+to\s+(live|be\s+alive|exist)\b/i,
  /\bself[-\s]?harm/i,
  /\bselbstmord\b/i,
  /\bsuizid/i,
  /\bmich\s+(umbringen|verletzen|ritzen)\b/i,
  /\b(will|möchte)\s+nicht\s+mehr\s+leben\b/i,
]

const ED_RISK_PATTERNS: RegExp[] = [
  /\b(make|made|making)\s+my\s?self\s+(sick|throw\s+up|vomit)\b/i,
  /\bthrow(ing)?\s+up\s+(after|what)\s+(i\s+)?(eat|ate)/i,
  /\bpurg(e|ing)\b/i,
  /\blaxatives?\b/i,
  /\bstarv(e|ing)\s+my\s?self\b/i,
  /\bpunish(ing)?\s+my\s?self\b/i,
  /\b(hate|disgusted\s+by)\s+my\s+body\b/i,
  /\bbinge\s+and\s+purge\b/i,
  /\b(eat|eating)\s+(nothing|zero)\s+(for|until)\b/i,
  // A stated intake target below 800 kcal — well under any safe self-directed level.
  /\b([1-7]\d{2}|[1-9]\d?)\s*(k?cal|calories|kalorien)\s+(a|per|pro)\s+(day|tag)\b/i,
  /\b(erbrechen|kotzen)\s+nach\s+dem\s+essen\b/i,
  /\babführmittel\b/i,
  /\bmich\s+(aus)?hungern\b/i,
  /\bmeinen\s+körper\s+hassen\b|\bhasse\s+meinen\s+körper\b/i,
]

const MEDICAL_PATTERNS: RegExp[] = [
  /\b(i'?m|i\s+am)\s+pregnant\b/i,
  /\bschwanger\b/i,
  /\b(type\s+[12]\s+)?diabet(es|ic)\b/i,
  /\binsulin\b/i,
  /\bkidney\s+(disease|failure)\b|\bnierenerkrankung\b|\bniereninsuffizienz\b/i,
  /\b(anorexi[ac]|bulimi[ac]|arfid)\b/i,
  /\b(magersucht|bulimie)\b/i,
  /\b(eating\s+disorder|essstörung)\b/i,
  /\b(medication|medikament)\w*\b/i,
  /\b(celiac|coeliac|zöliakie|crohn'?s?)\b/i,
]

export function keywordScreen(message: string): SafetyVerdict | null {
  const checks: [SafetyCategory, RegExp[]][] = [
    ['crisis', CRISIS_PATTERNS],
    ['ed_risk', ED_RISK_PATTERNS],
    ['medical', MEDICAL_PATTERNS],
  ]
  for (const [category, patterns] of checks) {
    const hit = patterns.find((p) => p.test(message))
    if (hit) return { category, source: 'keyword', reason: hit.source }
  }
  return null
}

// ─── Layer 2: policy classifier ───────────────────────────────────────────────
//
// gpt-oss-safeguard is trained to follow a written policy, so the policy *is*
// the prompt. The fallback providers run general models on the same text.

const SAFETY_POLICY = `# Policy: nutrition companion safety triage

You classify ONE user message sent to a healthy-eating app. Output exactly one label.

## Labels
- crisis: suicidal thoughts, self-harm, wanting to die, or immediate danger to the user or others.
- ed_risk: signs of disordered eating — extreme restriction (very low calorie targets, multi-day fasting for weight loss), purging, laxative or diuretic misuse, eating as self-punishment, intense body hatred, rapid weight-loss goals, or loss of control around food with distress.
  Also ed_risk: compensatory exercise — exercising specifically to cancel out food just eaten, e.g. asking how far to run to "burn it all off" after a meal, or feeling they "have to" work a meal off. (A general wish to be more active is ok.)
- medical: asks for dietary advice tied to a diagnosed condition, pregnancy, medication, or symptoms that need a clinician (e.g. diabetes, kidney disease, allergies with reactions, digestive disease).
- ok: everything else, including ordinary weight goals, religious or intermittent fasting mentioned neutrally, cravings after quitting smoking, recipe and nutrition questions, and logging meals.

## Rules
- Judge the user's own situation, not hypotheticals they clearly frame as about someone else's recipe or a news article.
- When a message fits several labels, pick the most serious: crisis > ed_risk > medical > ok.
- If unsure between ok and ed_risk, choose ed_risk.

## Output
Return only the label: crisis, ed_risk, medical, or ok.`

const LABELS: SafetyCategory[] = ['crisis', 'ed_risk', 'medical', 'ok']

export function parseSafetyLabel(text: string): SafetyCategory | null {
  const lower = text.trim().toLowerCase()
  if ((LABELS as string[]).includes(lower)) return lower as SafetyCategory
  // Tolerate a leaked preamble: take the most serious label mentioned as a word.
  for (const label of LABELS) {
    if (new RegExp(`\\b${label}\\b`).test(lower)) return label
  }
  return null
}

/** Matches the chat route's message cap, so the classifier always sees the whole message. */
export const SAFETY_MAX_CHARS = 4000

export async function classifySafety(
  message: string,
  meta?: { traceId?: string }
): Promise<SafetyVerdict> {
  const keyword = keywordScreen(message)
  if (keyword) return keyword

  const { text } = await routedGenerateText(
    'safety',
    { instructions: SAFETY_POLICY, prompt: message.slice(0, SAFETY_MAX_CHARS), maxOutputTokens: 300, temperature: 0 },
    meta
  )
  const label = parseSafetyLabel(text)
  // The keyword screen already passed, so an unreachable or unparseable
  // classifier fails open to the normal path (which still carries the
  // safety rules in its system prompt) rather than blocking every message.
  if (!label) return { category: 'ok', source: 'default', reason: 'classifier unavailable' }
  return { category: label, source: 'classifier' }
}

// ─── Templated responses ──────────────────────────────────────────────────────
//
// Fixed strings, never model-generated. Numbers come from SAFETY_CONTACTS
// (@sproutine/types), shared with the chat UI's safety card.

export const SAFE_RESPONSES: Record<'crisis' | 'ed_risk', string> = {
  crisis: [
    "I'm really glad you told me. What you're feeling matters, and you don't have to carry it alone.",
    'Please reach out to someone who can be with you in this right now:',
    `• TelefonSeelsorge (free, 24/7, anonymous): ${C.telefonSeelsorge.number} or ${C.telefonSeelsorgeAlt.number}, or chat at online.telefonseelsorge.de`,
    `• If you are in immediate danger, call ${C.emergency.number}.`,
    'Outside Germany, findahelpline.com lists free services in your country.',
    "I'm here to keep you company, but I'm not able to help with this the way a person can.",
  ].join('\n'),
  ed_risk: [
    "Thank you for being honest with me. It sounds like food might be feeling really hard right now, and that's not something you have to push through on your own.",
    "I'm going to step back from numbers and targets for now, and keep things gentle.",
    `If you would like to talk to someone who knows this area well, the BIÖG eating-disorder helpline offers free, confidential first advice: ${C.eatingDisorders.number} (Mon–Thu 10–22, Fri–Sun 10–18). There is also a directory of local counselling at essstoerungen.bioeg.de.`,
    "Whenever you're ready, I'm still here to chat about food in a relaxed way.",
  ].join('\n'),
}

/** Extra system-prompt rules when a message touches a medical condition. */
export const MEDICAL_GUIDANCE =
  'The user mentioned a medical condition, pregnancy or medication. Give only general, widely accepted healthy-eating information. Do not tailor amounts, restrictions or supplements to their condition. Gently suggest they check with their doctor or a registered dietitian (Ernährungsfachkraft) before changing their diet.'

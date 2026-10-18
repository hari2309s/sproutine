export interface IcsMeal {
  date: string
  slot: string
  foods: string
  nutrition?: string
}

/** Slot → local start time (HH:MM). Snacks become all-day events. */
const SLOT_TIMES: Record<string, string> = {
  breakfast: '08:00',
  lunch: '12:30',
  dinner: '19:00',
}

const SLOT_EMOJI: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🥜',
}

/** Duration in minutes for timed meals. */
const MEAL_DURATION_MIN = 45

function escapeIcal(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function formatDateValue(date: string): string {
  return date.replace(/-/g, '')
}

function uid(date: string, slot: string): string {
  return `${date}-${slot}@sproutine.app`
}

/**
 * Build an iCalendar (.ics) string from a list of planned meals.
 * Pure function — no network calls.
 */
export function buildIcs(meals: IcsMeal[], calendarName = 'Sproutine Meals'): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sproutine//Meal Calendar//EN',
    `X-WR-CALNAME:${escapeIcal(calendarName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const meal of meals) {
    const emoji = SLOT_EMOJI[meal.slot] ?? '🍴'
    const slotLabel = meal.slot.charAt(0).toUpperCase() + meal.slot.slice(1)
    const summary = `${emoji} ${slotLabel} — ${meal.foods}`
    const startTime = SLOT_TIMES[meal.slot]
    const dateVal = formatDateValue(meal.date)

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${uid(meal.date, meal.slot)}`)
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`)

    if (startTime) {
      // Timed event: DTSTART/DTEND with local time
      lines.push(`DTSTART:${dateVal}T${startTime.replace(':', '')}00`)
      const [h, m] = startTime.split(':').map(Number) as [number, number]
      const endMinutes = h * 60 + m + MEAL_DURATION_MIN
      const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0')
      const endM = String(endMinutes % 60).padStart(2, '0')
      lines.push(`DTEND:${dateVal}T${endH}${endM}00`)
    } else {
      // All-day event for snacks
      lines.push(`DTSTART;VALUE=DATE:${dateVal}`)
      // DTEND for all-day is the *next* day
      const d = new Date(`${meal.date}T00:00:00Z`)
      d.setUTCDate(d.getUTCDate() + 1)
      const nextDay = d.toISOString().slice(0, 10).replace(/-/g, '')
      lines.push(`DTEND;VALUE=DATE:${nextDay}`)
    }

    lines.push(`SUMMARY:${escapeIcal(summary)}`)
    if (meal.nutrition) {
      lines.push(`DESCRIPTION:${escapeIcal(meal.nutrition)}`)
    }
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

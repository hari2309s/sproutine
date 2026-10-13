export function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

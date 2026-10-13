// Strips newlines/carriage returns so a value can't forge extra log lines
// when interpolated into a log message (CRLF log injection).
export function sanitizeForLog(value: unknown): string {
  return String(value).replace(/[\r\n]/g, ' ')
}

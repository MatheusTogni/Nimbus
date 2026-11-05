import { currentLocale } from '@/i18n'

const toDate = (value: string | Date) => (value instanceof Date ? value : new Date(value))

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat(currentLocale(), { dateStyle: 'medium' }).format(toDate(value))
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat(currentLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(
    toDate(value),
  )
}

/** "5 nov." / "Nov 5" */
export function formatDayMonth(value: string | Date | null | undefined): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat(currentLocale(), { day: 'numeric', month: 'short' }).format(toDate(value))
}

/** Local wall-clock time, e.g. "03:00". */
export function formatTime(value: string | Date): string {
  return new Intl.DateTimeFormat(currentLocale(), { hour: '2-digit', minute: '2-digit' }).format(
    toDate(value),
  )
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86_400_000],
  ['month', 30 * 86_400_000],
  ['week', 7 * 86_400_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]

/** "3 days ago", "in 2 weeks"... */
export function formatRelative(value: string | Date, now = new Date()): string {
  const diff = toDate(value).getTime() - now.getTime()
  const rtf = new Intl.RelativeTimeFormat(currentLocale(), { numeric: 'auto' })
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit)
  }
  return rtf.format(0, 'minute')
}

/** "2026-03" -> "mar." / "Mar" */
export function formatMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  return new Intl.DateTimeFormat(currentLocale(), { month: 'short' }).format(
    new Date(Date.UTC(year ?? 2000, (m ?? 1) - 1, 15)),
  )
}

export function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: digits }).format(value)
}

/** Converts an ISO date to the value of an <input type="date">. */
export function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : ''
}

/** Converts an <input type="date"> value to an ISO date at noon UTC (stable across time zones). */
export function fromDateInput(value: string): string | null {
  return value ? `${value}T12:00:00.000Z` : null
}

export function isPast(value: string | null | undefined, now = new Date()): boolean {
  return !!value && toDate(value).getTime() < now.getTime()
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase()
}

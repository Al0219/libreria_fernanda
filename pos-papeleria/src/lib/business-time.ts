export const BUSINESS_TIME_ZONE = 'America/Guatemala'

export function getBusinessDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function formatBusinessDate(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('es-GT', {
    timeZone: BUSINESS_TIME_ZONE,
    ...options,
  }).format(new Date(`${date}T12:00:00Z`))
}

function parseStoredTimestamp(value: string): Date {
  const iso = value.includes('T') ? value : value.replace(' ', 'T')
  return new Date(iso.endsWith('Z') ? iso : `${iso}Z`)
}

export function formatBusinessTime(value: Date | string): string {
  const date = typeof value === 'string' ? parseStoredTimestamp(value) : value
  return new Intl.DateTimeFormat('es-GT', {
    timeZone: BUSINESS_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}
export function parseLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage) return 'en-US'
  const primary = acceptLanguage.split(',')[0].trim().split(';')[0].trim()
  return primary || 'en-US'
}

export function formatDate(date: Date | string | null | undefined, locale = 'en-US'): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString(locale)
}

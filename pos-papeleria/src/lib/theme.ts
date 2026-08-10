export type AppTheme = 'standard' | 'soft' | 'high-contrast'

export function normalizeTheme(value?: string | null): AppTheme {
  if (value === 'soft' || value === 'high-contrast') return value
  return 'standard'
}

export function applyTheme(value?: string | null) {
  const theme = normalizeTheme(value)
  document.documentElement.dataset.theme = theme
  return theme
}
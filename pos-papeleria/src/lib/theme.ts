export type AppTheme = 'standard' | 'high-contrast'

export function normalizeTheme(value?: string | null): AppTheme {
  return value === 'high-contrast' ? 'high-contrast' : 'standard'
}

export function applyTheme(value?: string | null) {
  const theme = normalizeTheme(value)
  document.documentElement.dataset.theme = theme
  return theme
}
export type ThemeId = 'gold' | 'mint' | 'blue' | 'crimson' | 'violet' | 'mono'

export const THEME_STORAGE_KEY = 'ipi-theme'
export const DEFAULT_THEME: ThemeId = 'gold'

export const themes: { id: ThemeId; label: string; accent: string }[] = [
  { id: 'gold', label: 'Stay Fly Gold', accent: '#f2b65d' },
  { id: 'mint', label: 'Cyber Mint', accent: '#42e6b2' },
  { id: 'blue', label: 'Ice Blue', accent: '#55b7ff' },
  { id: 'crimson', label: 'Crimson Pro', accent: '#ff4f6d' },
  { id: 'violet', label: 'Violet Pulse', accent: '#b16cff' },
  { id: 'mono', label: 'Monochrome', accent: '#f3f4f6' },
]

export function isThemeId(value: string | null): value is ThemeId {
  return themes.some(theme => theme.id === value)
}

export function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme
}

export function getStoredTheme(): ThemeId {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return isThemeId(stored) ? stored : DEFAULT_THEME
}

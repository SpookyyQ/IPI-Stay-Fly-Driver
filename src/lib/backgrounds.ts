import forgedWallpaper from '../assets/forged-carbon.jpg'

// The animation overlay rendered on top of the wallpaper. 'none' = wallpaper only.
export type BackgroundId =
  | 'none'
  | 'constellation'
  | 'particles'
  | 'starfield'
  | 'waves'

export const BG_STORAGE_KEY = 'ipi-background'
export const BG_WALLPAPER_KEY = 'ipi-wallpaper'
export const DEFAULT_BACKGROUND: BackgroundId = 'none'

/** Bundled default wallpaper shown as the base layer until the user uploads their own. */
export const DEFAULT_WALLPAPER = forgedWallpaper

export const backgrounds: { id: BackgroundId; label: string; animated: boolean }[] = [
  { id: 'none', label: 'None', animated: false },
  { id: 'constellation', label: 'Constellation', animated: true },
  { id: 'particles', label: 'Floating Dots', animated: true },
  { id: 'starfield', label: 'Starfield', animated: true },
  { id: 'waves', label: 'Aurora Waves', animated: true },
]

export function isBackgroundId(value: string | null): value is BackgroundId {
  return backgrounds.some(bg => bg.id === value)
}

export function getStoredBackground(): BackgroundId {
  const stored = localStorage.getItem(BG_STORAGE_KEY)
  return isBackgroundId(stored) ? stored : DEFAULT_BACKGROUND
}

/** The user's uploaded custom wallpaper, or null when the default should be used. */
export function getStoredWallpaper(): string | null {
  return localStorage.getItem(BG_WALLPAPER_KEY)
}

/** Resolve the wallpaper to actually render: the custom upload, else the bundled default. */
export function resolveWallpaper(custom: string | null): string {
  return custom ?? DEFAULT_WALLPAPER
}

/** Read the active theme accent (set as "r g b" in --color-accent) as an [r,g,b] tuple. */
export function readAccentRgb(): [number, number, number] {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-accent')
    .trim()
  const parts = raw.split(/\s+/).map(Number)
  if (parts.length === 3 && parts.every(n => Number.isFinite(n))) {
    return [parts[0], parts[1], parts[2]]
  }
  return [242, 182, 93]
}

/**
 * Downscale an uploaded image and return a JPEG data URL small enough to keep
 * in localStorage. Keeps the longest edge at <= maxEdge px.
 */
export function loadWallpaperFile(file: File, maxEdge = 1920): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read-failed'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('decode-failed'))
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('canvas-unavailable'))
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

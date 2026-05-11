import { useEffect, useRef, useState } from 'react'
import { Check, Palette } from 'lucide-react'
import { applyTheme, getStoredTheme, THEME_STORAGE_KEY, ThemeId, themes } from '../lib/themes'

export default function ThemePicker() {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState<ThemeId>(() => getStoredTheme())
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="grid h-8 w-8 place-items-center rounded-lg text-white/55 transition hover:bg-white/[.08] hover:text-accent"
        title="Change theme"
        aria-label="Change theme"
        aria-expanded={open}
      >
        <Palette size={15} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-white/10 bg-zinc-950/95 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl">
          {themes.map(option => {
            const active = option.id === theme
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setTheme(option.id)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                  active ? 'bg-white/[.10] text-white' : 'text-white/72 hover:bg-white/[.07] hover:text-white'
                }`}
              >
                <span
                  className="h-4 w-4 rounded-full border border-white/20"
                  style={{ backgroundColor: option.accent }}
                />
                <span className="flex-1 font-semibold">{option.label}</span>
                {active && <Check size={14} className="text-accent" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

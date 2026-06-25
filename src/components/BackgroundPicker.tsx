import { useEffect, useRef, useState } from 'react'
import { Check, Image as ImageIcon, Sparkles, Upload } from 'lucide-react'
import {
  BackgroundId,
  backgrounds,
  loadWallpaperFile,
} from '../lib/backgrounds'

interface Props {
  background: BackgroundId
  onBackgroundChange: (id: BackgroundId) => void
  hasWallpaper: boolean
  onWallpaperChange: (dataUrl: string) => void
}

export default function BackgroundPicker({
  background,
  onBackgroundChange,
  hasWallpaper,
  onWallpaperChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(false)
    try {
      const dataUrl = await loadWallpaperFile(file)
      onWallpaperChange(dataUrl)
      onBackgroundChange('custom')
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={rootRef} className="relative z-50" onPointerDown={event => event.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="grid h-8 w-8 place-items-center rounded-lg text-white/55 transition hover:bg-white/[.08] hover:text-accent"
        title="Background"
        aria-label="Change background"
        aria-expanded={open}
      >
        <Sparkles size={15} />
      </button>

      {open && (
        <div
          className="fixed right-16 top-11 z-[100] w-60 rounded-xl border border-white/10 bg-zinc-950/95 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl"
          onPointerDown={event => event.stopPropagation()}
        >
          {backgrounds.map(option => {
            const active = option.id === background
            const isCustom = option.id === 'custom'
            return (
              <button
                key={option.id}
                type="button"
                onPointerDown={event => {
                  event.preventDefault()
                  event.stopPropagation()
                  if (isCustom && !hasWallpaper) {
                    fileRef.current?.click()
                    return
                  }
                  onBackgroundChange(option.id)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                  active ? 'bg-white/[.10] text-white' : 'text-white/72 hover:bg-white/[.07] hover:text-white'
                }`}
              >
                <span className="grid h-4 w-4 place-items-center text-accent">
                  {isCustom ? <ImageIcon size={14} /> : <Sparkles size={12} />}
                </span>
                <span className="flex-1 font-semibold">{option.label}</span>
                {active && <Check size={14} className="text-accent" />}
              </button>
            )
          })}

          <div className="my-1 border-t border-white/10" />

          <button
            type="button"
            onPointerDown={event => {
              event.preventDefault()
              event.stopPropagation()
              fileRef.current?.click()
            }}
            disabled={busy}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/72 transition hover:bg-white/[.07] hover:text-white disabled:opacity-50"
          >
            <span className="grid h-4 w-4 place-items-center text-accent">
              <Upload size={13} />
            </span>
            <span className="flex-1 font-semibold">
              {busy ? 'Loading…' : hasWallpaper ? 'Replace wallpaper…' : 'Upload wallpaper…'}
            </span>
          </button>

          {error && (
            <p className="px-3 pb-1 pt-0.5 text-xs text-red-300">Could not load that image.</p>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={event => {
              void handleFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </div>
      )}
    </div>
  )
}

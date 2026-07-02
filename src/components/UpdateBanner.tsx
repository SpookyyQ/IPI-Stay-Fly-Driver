import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, RefreshCw, X } from 'lucide-react'
import { checkUpdate, installUpdate } from '@tauri-apps/api/updater'
import { relaunch } from '@tauri-apps/api/process'
import { notifyError } from '../lib/toast'

type Phase = 'hidden' | 'available' | 'installing'

/**
 * Checks GitHub Releases (via the Tauri updater's latest.json endpoint) once
 * on startup and offers a one-click "install & restart" when a newer version
 * exists. Only the installed app (NSIS/MSI) can self-update; the check itself
 * is harmless for the portable exe.
 */
export default function UpdateBanner() {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<Phase>('hidden')
  const [version, setVersion] = useState('')

  useEffect(() => {
    let alive = true
    // Small delay so the update check never competes with app startup.
    const id = setTimeout(async () => {
      try {
        const { shouldUpdate, manifest } = await checkUpdate()
        if (alive && shouldUpdate && manifest) {
          setVersion(manifest.version)
          setPhase('available')
        }
      } catch {
        // No network, dev build, or malformed manifest — stay silent.
      }
    }, 3000)
    return () => {
      alive = false
      clearTimeout(id)
    }
  }, [])

  const install = async () => {
    setPhase('installing')
    try {
      await installUpdate()
      await relaunch()
    } catch (e) {
      setPhase('available')
      notifyError(t('updater.failed', { error: String(e) }))
    }
  }

  if (phase === 'hidden') return null

  return (
    <div className="fixed bottom-5 left-5 z-[200] flex items-center gap-3 rounded-xl border border-accent/40 bg-zinc-950/95 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-xl">
      <Download size={16} className="shrink-0 text-accent" />
      <span className="text-sm font-semibold text-white/85">
        {t('updater.available', { version })}
      </span>
      <button
        onClick={install}
        disabled={phase === 'installing'}
        className="flex items-center gap-1.5 rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-bold text-accent ring-1 ring-accent/40 transition hover:bg-accent/25 disabled:opacity-60"
      >
        <RefreshCw size={13} className={phase === 'installing' ? 'animate-spin' : ''} />
        {phase === 'installing' ? t('updater.installing') : t('updater.install')}
      </button>
      {phase === 'available' && (
        <button
          onClick={() => setPhase('hidden')}
          title={t('updater.dismiss')}
          aria-label={t('updater.dismiss')}
          className="grid h-7 w-7 place-items-center rounded-lg text-white/45 transition hover:bg-white/[.08] hover:text-white"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

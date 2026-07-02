import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MonitorPlay, Power } from 'lucide-react'
import { appWindow } from '@tauri-apps/api/window'
import { ipc, StatusInfo } from '../lib/ipc'

const EMPTY: StatusInfo = {
  connected: false,
  battery_percent: 0,
  raw_status: '',
  raw_battery: '',
  last_error: '',
}

function batteryColor(pct: number): string {
  if (pct > 50) return '#34d399' // emerald
  if (pct > 20) return '#fbbf24' // amber
  return '#f87171' // red
}

/**
 * Compact flyout rendered in the dedicated "tray" window. Shows a live battery
 * ring plus buttons to reopen the main app or quit entirely.
 */
export default function TrayFlyout() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<StatusInfo>(EMPTY)

  useEffect(() => {
    let alive = true
    const poll = async () => {
      try {
        // The flyout window always exists but is hidden most of the time;
        // don't hit the hardware unless it is actually on screen.
        if (!(await appWindow.isVisible())) return
        const s = await ipc.getStatus()
        if (alive) setStatus(s)
      } catch {
        if (alive) setStatus(prev => ({ ...prev, connected: false }))
      }
    }
    poll()
    const id = setInterval(poll, 3000)
    // Refresh immediately when the flyout is opened (it gets focused on show).
    const unlisten = appWindow.listen('tauri://focus', poll)
    return () => {
      alive = false
      clearInterval(id)
      unlisten.then(fn => fn())
    }
  }, [])

  const pct = Math.max(0, Math.min(100, status.battery_percent))
  const connected = status.connected
  const color = connected ? batteryColor(pct) : '#4b5563'

  const R = 23
  const C = 2 * Math.PI * R
  const dash = connected ? (pct / 100) * C : 0

  return (
    <div className="flex h-screen w-screen flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#0b0b0f]/95 p-4 text-white shadow-2xl backdrop-blur-xl select-none">
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/60">IPI STAY FLY</p>

      <div className="relative grid place-items-center">
        <svg width="60" height="60" viewBox="0 0 60 60" className="-rotate-90">
          <circle cx="30" cy="30" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="5" />
          <circle
            cx="30"
            cy="30"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${C}`}
            style={{ transition: 'stroke-dasharray .5s ease, stroke .5s ease' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          {connected ? (
            <span className="text-sm font-black leading-none">{pct}<span className="text-[8px] font-bold text-white/45">%</span></span>
          ) : (
            <span className="text-[10px] font-bold text-white/40">{t('tray.off')}</span>
          )}
        </div>
      </div>

      <div className="flex w-full flex-col gap-2">
        <button
          onClick={() => ipc.showMain()}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-accent/15 text-sm font-bold text-accent ring-1 ring-accent/40 transition hover:bg-accent/25"
        >
          <MonitorPlay size={15} />
          {t('tray.open')}
        </button>
        <button
          onClick={() => ipc.quit()}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-white/[.06] text-sm font-bold text-white/70 transition hover:bg-red-500/80 hover:text-white"
        >
          <Power size={15} />
          {t('tray.quit')}
        </button>
      </div>
    </div>
  )
}

import { useTranslation } from 'react-i18next'
import { Minus, Square, X, Wifi, WifiOff } from 'lucide-react'
import { appWindow } from '@tauri-apps/api/window'
import { StatusInfo } from '../lib/ipc'

interface Props { status: StatusInfo }

export default function TopBar({ status }: Props) {
  const { t } = useTranslation()

  return (
    <header
      data-tauri-drag-region
      className="h-12 flex items-center justify-between gap-4 border-b border-white/10 bg-[#220438]/58 px-5 shadow-lg shadow-black/15 backdrop-blur-xl select-none"
    >
      <div className="absolute left-1/2 -translate-x-1/2 select-none pointer-events-none" data-tauri-drag-region>
        <span className="text-xl font-black italic tracking-tight text-white">IPI</span>
      </div>

      <div className="flex items-center gap-3 text-sm" data-tauri-drag-region>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5">
          <span className="flex items-center gap-1.5">
            {status.connected ? (
              <Wifi size={15} className="text-emerald-300" />
            ) : (
              <WifiOff size={15} className="text-red-300" />
            )}
            {status.connected ? t('topbar.connected') : t('topbar.disconnected')}
          </span>

        </div>

        {!status.connected && status.last_error && (
          <p className="max-w-[28vw] truncate text-xs text-red-200" title={status.last_error}>
            {status.last_error}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => appWindow.minimize()}
          className="grid h-8 w-8 place-items-center rounded-lg text-white/50 transition hover:bg-white/[.08] hover:text-white"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="grid h-8 w-8 place-items-center rounded-lg text-white/50 transition hover:bg-white/[.08] hover:text-white"
        >
          <Square size={12} />
        </button>
        <button
          onClick={() => appWindow.close()}
          className="grid h-8 w-8 place-items-center rounded-lg text-white/50 transition hover:bg-red-500/80 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
    </header>
  )
}

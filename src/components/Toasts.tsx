import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { subscribeToasts, Toast } from '../lib/toast'

const TOAST_TTL_MS = 4500

/** Transient notification stack (bottom-right). Fed by lib/toast notify* calls. */
export default function Toasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    return subscribeToasts(toast => {
      setToasts(prev => [...prev.slice(-3), toast])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, TOAST_TTL_MS)
    })
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[200] flex w-80 flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur ${
            toast.kind === 'ok'
              ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100'
              : 'border-red-400/40 bg-red-400/10 text-red-100'
          }`}
        >
          {toast.kind === 'ok'
            ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
          <span className="break-words">{toast.text}</span>
        </div>
      ))}
    </div>
  )
}

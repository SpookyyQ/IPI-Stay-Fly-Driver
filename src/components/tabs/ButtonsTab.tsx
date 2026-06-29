import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcw } from 'lucide-react'
import mouseTopImage from '../../assets/fly-pro-top.png'
import { ipc } from '../../lib/ipc'

// Confirmed mouse-button action codes (HID button bitmask).
const ACTIONS = [
  { code: 0x01, label: 'Left Click' },
  { code: 0x02, label: 'Right Click' },
  { code: 0x04, label: 'Middle Click' },
  { code: 0x08, label: 'Back' },
  { code: 0x10, label: 'Forward' },
] as const

// Confirmed physical button slot addresses and their factory-default action.
const BUTTONS = [
  { slot: 0x60, label: 'Left Button', defaultCode: 0x01, cardClass: 'left-[24%] top-[20%]', markerClass: 'left-[44%] top-[25%]' },
  { slot: 0x68, label: 'Middle Button', defaultCode: 0x04, cardClass: 'left-[56%] top-[17%]', markerClass: 'left-[50%] top-[25%]' },
  { slot: 0x64, label: 'Right Button', defaultCode: 0x02, cardClass: 'left-[64%] top-[30%]', markerClass: 'left-[56%] top-[31%]' },
  { slot: 0x70, label: 'Side Forward', defaultCode: 0x10, cardClass: 'left-[18%] top-[44%]', markerClass: 'left-[40%] top-[47%]' },
  { slot: 0x6c, label: 'Side Back', defaultCode: 0x08, cardClass: 'left-[22%] top-[58%]', markerClass: 'left-[42%] top-[59%]' },
] as const

type Status = { kind: 'idle' | 'ok' | 'error'; text: string }

export default function ButtonsTab() {
  const { t } = useTranslation()
  const [mapping, setMapping] = useState<Record<number, number>>(
    () => Object.fromEntries(BUTTONS.map(b => [b.slot, b.defaultCode])),
  )
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>({ kind: 'idle', text: '' })

  async function assign(slot: number, code: number) {
    const previous = mapping[slot]
    setMapping(m => ({ ...m, [slot]: code }))
    setBusy(true)
    try {
      await ipc.setButton(slot, code)
      const action = ACTIONS.find(a => a.code === code)?.label ?? ''
      setStatus({ kind: 'ok', text: `Saved: ${action}` })
    } catch (err) {
      setMapping(m => ({ ...m, [slot]: previous }))
      setStatus({ kind: 'error', text: String(err) })
    } finally {
      setBusy(false)
    }
  }

  async function restoreDefaults() {
    setBusy(true)
    try {
      await ipc.resetButtons()
      setMapping(Object.fromEntries(BUTTONS.map(b => [b.slot, b.defaultCode])))
      setStatus({ kind: 'ok', text: 'All buttons restored to default' })
    } catch (err) {
      setStatus({ kind: 'error', text: String(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-7rem)]">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[.32em] text-accent/80">Mouse Configuration</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">{t('buttons.title')}</h2>
        </div>
        <button
          onClick={restoreDefaults}
          disabled={busy}
          className="flex items-center gap-2 rounded-xl bg-white/[.09] px-5 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/[.14] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw size={16} />
          Restore Default
        </button>
      </div>

      <div className="relative mx-auto h-[650px] max-w-[980px]">
        <div className="absolute left-1/2 top-0 h-[585px] w-[430px] -translate-x-1/2">
          <div className="absolute inset-8 rounded-full bg-black/30 blur-3xl" />
          <img
            src={mouseTopImage}
            alt="IPI FLY PRO mouse top view"
            className="relative h-full w-full object-contain drop-shadow-[0_46px_60px_rgba(0,0,0,.45)]"
            draggable={false}
          />
        </div>

        {BUTTONS.map(item => (
          <div key={item.slot}>
            <div className={`absolute ${item.cardClass}`}>
              <div className="rounded-lg bg-zinc-900/80 px-4 py-2 shadow-xl shadow-black/30 ring-1 ring-white/10 backdrop-blur">
                <p className="text-[10px] text-white/42">{item.label}</p>
                <select
                  value={mapping[item.slot]}
                  disabled={busy}
                  onChange={e => assign(item.slot, Number(e.target.value))}
                  className="mt-1 w-36 rounded-md bg-white/[.06] px-2 py-1 text-sm font-bold text-white outline-none ring-1 ring-white/10 transition hover:bg-white/[.1] focus:ring-accent disabled:opacity-60"
                >
                  {ACTIONS.map(a => (
                    <option key={a.code} value={a.code} className="bg-zinc-900 text-white">
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <span
              className={`absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dotted border-accent ${item.markerClass}`}
            />
          </div>
        ))}

        {status.kind !== 'idle' && (
          <div className="absolute bottom-12 left-1/2 max-w-md -translate-x-1/2">
            <div
              className={`rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur ${
                status.kind === 'ok'
                  ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100'
                  : 'border-red-400/40 bg-red-400/10 text-red-100'
              }`}
            >
              {status.text}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

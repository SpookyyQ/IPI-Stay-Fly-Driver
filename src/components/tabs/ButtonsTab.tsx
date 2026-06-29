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
// `marker` is the dot position on the mouse image (percent of the square image).
// `side` picks the callout column; `cardY` is the card's vertical position (%).
const BUTTONS = [
  { slot: 0x60, label: 'Left Button', defaultCode: 0x01, marker: { x: 39, y: 21 }, side: 'left', cardY: 14 },
  { slot: 0x70, label: 'Side Forward', defaultCode: 0x10, marker: { x: 29, y: 40 }, side: 'left', cardY: 44 },
  { slot: 0x6c, label: 'Side Back', defaultCode: 0x08, marker: { x: 29, y: 48 }, side: 'left', cardY: 66 },
  { slot: 0x68, label: 'Middle Button', defaultCode: 0x04, marker: { x: 50, y: 20 }, side: 'right', cardY: 16 },
  { slot: 0x64, label: 'Right Button', defaultCode: 0x02, marker: { x: 61, y: 21 }, side: 'right', cardY: 44 },
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

      <div className="relative mx-auto h-[600px] w-full max-w-[920px]">
        {/* Square stage centered in the row; every marker, line and card is
            positioned relative to it so the dots land on the real buttons. */}
        <div className="absolute left-1/2 top-6 h-[440px] w-[440px] -translate-x-1/2">
          <div className="absolute inset-10 rounded-full bg-black/30 blur-3xl" />
          <img
            src={mouseTopImage}
            alt="IPI FLY PRO mouse top view"
            className="relative h-full w-full object-contain drop-shadow-[0_46px_60px_rgba(0,0,0,.45)]"
            draggable={false}
          />

          {/* Leader lines from each callout to its marker. */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {BUTTONS.map(item => {
              const anchorX = item.side === 'left' ? 0 : 100
              return (
                <g key={item.slot} className="text-accent">
                  <line
                    x1={anchorX}
                    y1={item.cardY}
                    x2={item.marker.x}
                    y2={item.marker.y}
                    stroke="currentColor"
                    strokeWidth={1}
                    strokeOpacity={0.45}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle cx={anchorX} cy={item.cardY} r={1.4} fill="currentColor" fillOpacity={0.65} />
                </g>
              )
            })}
          </svg>

          {/* Markers sitting on the physical buttons. */}
          {BUTTONS.map(item => (
            <span
              key={item.slot}
              className="pointer-events-none absolute grid h-4 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-dotted border-accent"
              style={{ left: `${item.marker.x}%`, top: `${item.marker.y}%` }}
            >
              <span className="h-1 w-1 rounded-full bg-accent" />
            </span>
          ))}

          {/* Callout cards in two tidy columns flanking the mouse. */}
          {BUTTONS.map(item => (
            <div
              key={item.slot}
              className={`absolute w-44 -translate-y-1/2 ${
                item.side === 'left' ? 'right-full mr-5' : 'left-full ml-5'
              }`}
              style={{ top: `${item.cardY}%` }}
            >
              <div className="rounded-lg bg-zinc-900/80 px-4 py-2 shadow-xl shadow-black/30 ring-1 ring-white/10 backdrop-blur">
                <p className="text-[10px] uppercase tracking-wider text-white/42">{item.label}</p>
                <select
                  value={mapping[item.slot]}
                  disabled={busy}
                  onChange={e => assign(item.slot, Number(e.target.value))}
                  className="mt-1 w-full rounded-md bg-white/[.06] px-2 py-1 text-sm font-bold text-white outline-none ring-1 ring-white/10 transition hover:bg-white/[.1] focus:ring-accent disabled:opacity-60"
                >
                  {ACTIONS.map(a => (
                    <option key={a.code} value={a.code} className="bg-zinc-900 text-white">
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        {status.kind !== 'idle' && (
          <div className="absolute bottom-6 left-1/2 max-w-md -translate-x-1/2">
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

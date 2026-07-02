import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Card from '../ui/Card'
import Slider from '../ui/Slider'
import { ipc, DeviceSettings } from '../../lib/ipc'
import { notifyError } from '../../lib/toast'

const STAGE_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#ec4899']
const DEFAULT_DPIS = [400, 800, 1600, 5600]
const DPI_MIN = 50
const DPI_MAX = 42000
const DPI_STEP = 50

interface Props {
  connected: boolean
  demoMode?: boolean
  initialSettings: DeviceSettings | null
}

export default function DpiTab({ connected, demoMode = false, initialSettings }: Props) {
  const { t } = useTranslation()
  const [activeStage, setActiveStage] = useState(0)
  const [dpis, setDpis] = useState(DEFAULT_DPIS)
  // Raw text while the user is typing in the number field; null = not editing.
  // Normalizing only on commit keeps the field typeable (e.g. "8" on the way
  // to "800" must not be clamped to 50 mid-keystroke).
  const [draft, setDraft] = useState<string | null>(null)

  useEffect(() => {
    if (!initialSettings) return
    setActiveStage(initialSettings.active_dpi_stage)
    setDpis(Array.from(initialSettings.dpi_values) as number[])
  }, [initialSettings])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleStageClick = async (i: number) => {
    setActiveStage(i)
    setDraft(null)
    if (demoMode) return
    try {
      await ipc.setDpiStage(i)
    } catch (e) {
      notifyError(t('errors.applyFailed', { error: String(e) }))
    }
  }

  const normalizeDpi = (value: number) => {
    const clamped = Math.min(DPI_MAX, Math.max(DPI_MIN, value))
    return Math.round(clamped / DPI_STEP) * DPI_STEP
  }

  const handleDpiChange = (v: number) => {
    const nextDpi = normalizeDpi(v)
    setDpis(prev => { const next = [...prev]; next[activeStage] = nextDpi; return next })
    if (demoMode) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        await ipc.setDpiValue(activeStage, nextDpi)
      } catch (e) {
        notifyError(t('errors.applyFailed', { error: String(e) }))
      }
    }, 200)
  }

  const commitDraft = () => {
    if (draft === null) return
    const parsed = Number(draft)
    if (draft.trim() !== '' && Number.isFinite(parsed)) {
      handleDpiChange(parsed)
    }
    setDraft(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[.32em] text-accent/80">{t('dpi.eyebrow')}</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">{t('dpi.title')}</h2>
      </div>

      <Card>
        <p className="mb-4 text-sm text-white/62">{t('dpi.stage')}</p>
        <div className="grid grid-cols-4 gap-3">
          {dpis.map((dpi, i) => (
            <button
              key={i}
              onClick={() => handleStageClick(i)}
              disabled={!connected}
              className={`rounded-2xl border p-4 text-left transition-all disabled:opacity-40 ${
                activeStage === i
                  ? 'border-accent bg-white/[.13] shadow-[0_0_30px_rgb(var(--color-accent)/.12)]'
                  : 'border-white/10 bg-white/[.05] hover:bg-white/[.09]'
              }`}
            >
              <span className="mb-3 block h-1.5 w-10 rounded-full" style={{ backgroundColor: STAGE_COLORS[i] }} />
              <p className="text-xs text-white/50">{t('dpi.stageLabel', { num: i + 1 })}</p>
              <p className="text-2xl font-black">{dpi}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <label htmlFor="dpi-value" className="text-sm text-white/62">{t('dpi.value')}</label>
          <div className="flex items-center gap-2">
            <input
              id="dpi-value"
              type="number"
              min={DPI_MIN}
              max={DPI_MAX}
              step={DPI_STEP}
              value={draft ?? String(dpis[activeStage])}
              disabled={!connected}
              onChange={e => setDraft(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={e => { if (e.key === 'Enter') commitDraft() }}
              className="w-32 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-right text-xl font-black text-accent outline-none transition-colors focus:border-accent disabled:opacity-40"
            />
            <span className="text-sm text-white/55">DPI</span>
          </div>
        </div>
        <Slider
          min={DPI_MIN}
          max={DPI_MAX}
          step={DPI_STEP}
          value={dpis[activeStage]}
          onChange={handleDpiChange}
          disabled={!connected}
        />
        <div className="flex justify-between text-xs text-white/45 mt-2">
          <span>50</span><span>42000</span>
        </div>
      </Card>

    </div>
  )
}

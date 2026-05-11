import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Card from '../ui/Card'
import Slider from '../ui/Slider'
import Switch from '../ui/Switch'
import { ipc, PollingRate, Lod, DeviceSettings } from '../../lib/ipc'

const POLLING_OPTIONS: { label: string; value: PollingRate; experimental?: boolean }[] = [
  { label: '125 Hz', value: 'Hz125' },
  { label: '250 Hz', value: 'Hz250' },
  { label: '500 Hz', value: 'Hz500' },
  { label: '1000 Hz', value: 'Hz1000' },
  { label: '2000 Hz', value: 'Hz2000' },
  { label: '4000 Hz', value: 'Hz4000' },
  { label: '8000 Hz', value: 'Hz8000' },
]

const LOD_OPTIONS: { label: string; value: Lod; experimental?: boolean }[] = [
  { label: '0.7 mm', value: 'Mm07' },
  { label: '1 mm', value: 'Mm1' },
  { label: '2 mm', value: 'Mm2' },
]

const isEnabledOption = (experimental?: boolean) => !experimental

interface Props { connected: boolean; initialSettings: DeviceSettings | null }

export default function PerformanceTab({ connected, initialSettings }: Props) {
  const { t } = useTranslation()
  const [pollingRate, setPollingRate] = useState<PollingRate>('Hz2000')
  const [lod, setLod] = useState<Lod>('Mm07')
  const [sleep, setSleep] = useState(6)
  const sleepRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debounce, setDebounce] = useState(8)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [ripple, setRipple] = useState(false)
  const [linearCorrection, setLinearCorrection] = useState(false)
  const [motionSync, setMotionSync] = useState(false)
  const [workMode, setWorkMode] = useState(1)

  const isHighPolling = (r: PollingRate) => ['Hz2000', 'Hz4000', 'Hz8000'].includes(r)

  useEffect(() => {
    if (!initialSettings) return
    setPollingRate(initialSettings.polling_rate)
    setLod(initialSettings.lod)
    setLinearCorrection(initialSettings.linear_correction)
    setRipple(initialSettings.waveform_control)
    setMotionSync(initialSettings.motion_sync)
    setSleep(initialSettings.sleep)
    setWorkMode(initialSettings.work_mode)
  }, [initialSettings])

  const handleSleep = (v: number) => {
    setSleep(v)
    if (sleepRef.current) clearTimeout(sleepRef.current)
    sleepRef.current = setTimeout(async () => {
      try { await ipc.setSleep(v) } catch {}
    }, 200)
  }

  const handleMotionSync = async (enabled: boolean) => {
    setMotionSync(enabled)
    try { await ipc.setMotionSync(enabled) } catch {}
  }

  const handleWorkMode = async (mode: number) => {
    setWorkMode(mode)
    try { await ipc.setWorkMode(mode) } catch {}
  }

  const handlePolling = async (rate: PollingRate) => {
    const option = POLLING_OPTIONS.find(o => o.value === rate)
    if (!option || !isEnabledOption(option.experimental)) return
    setPollingRate(rate)
    try {
      if (isHighPolling(rate)) {
        await ipc.setWorkMode(2)
        setWorkMode(2)
        await ipc.setPollingRate(rate)
      } else {
        await ipc.setPollingRate(rate)
        if (workMode === 2) {
          await ipc.setWorkMode(1)
          setWorkMode(1)
        }
      }
    } catch {}
  }

  const handleLod = async (l: Lod) => {
    const option = LOD_OPTIONS.find(o => o.value === l)
    if (!option || !isEnabledOption(option.experimental)) return

    setLod(l)
    try { await ipc.setLod(l) } catch {}
  }

  const handleLinearCorrection = async (enabled: boolean) => {
    setLinearCorrection(enabled)
    try { await ipc.setLinearCorrection(enabled) } catch {}
  }

  const handleWaveformControl = async (enabled: boolean) => {
    setRipple(enabled)
    try { await ipc.setWaveformControl(enabled) } catch {}
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[.32em] text-accent/80">Latency control</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">{t('performance.title')}</h2>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <div className="flex justify-between mb-3">
          <p className="text-sm text-white/62">{t('performance.sleepTimer')}</p>
          <p className="text-sm font-semibold">
            {sleep} × 10 s
            <span className="ml-2 text-white/45 text-xs">({Math.floor(sleep * 10 / 60) > 0 ? `${Math.floor(sleep * 10 / 60)} min ${sleep * 10 % 60}s` : `${sleep * 10}s`})</span>
          </p>
        </div>
        <Slider min={1} max={255} value={sleep} onChange={handleSleep} disabled={!connected} />
        <div className="flex justify-between text-xs text-white/45 mt-2"><span>10 s</span><span>42.5 min</span></div>
      </Card>

      <Card>
        <p className="text-sm text-white/62 mb-3">{t('performance.pollingRate')}</p>
        <div className="flex flex-wrap gap-2">
          {POLLING_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => handlePolling(o.value)}
              disabled={!connected || !isEnabledOption(o.experimental)}
              className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                pollingRate === o.value
                  ? 'border-accent bg-accent/15 text-accent shadow-[0_0_22px_rgb(var(--color-accent)/.12)]'
                  : 'border-white/10 bg-white/[.05] text-white/78 hover:border-white/25 hover:bg-white/[.09]'
              } disabled:cursor-not-allowed disabled:opacity-40`}
              title={o.experimental ? 'Not sent to the mouse until this frame is verified.' : undefined}
            >
              {o.label}{o.experimental && <span className="ml-1 opacity-50">({t('performance.experimental')})</span>}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex justify-between mb-3">
          <p className="text-sm text-white/62">{t('performance.debounce')}</p>
          <p className="text-sm font-semibold">{debounce} {t('performance.debounceUnit')}</p>
        </div>
        <Slider min={0} max={20} value={debounce} onChange={v => {
          setDebounce(v)
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(async () => {
            try { await ipc.setDebounce(v) } catch {}
          }, 200)
        }} disabled={!connected} />
        <div className="flex justify-between text-xs text-white/45 mt-2"><span>0 ms</span><span>20 ms</span></div>
      </Card>

      <Card>
        <p className="text-sm text-white/62 mb-3">{t('performance.lod')}</p>
        <div className="flex gap-3">
          {LOD_OPTIONS.map(o => (
            <label key={o.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="lod"
                checked={lod === o.value}
                onChange={() => handleLod(o.value)}
                disabled={!connected || !isEnabledOption(o.experimental)}
                className="accent-accent"
              />
              <span className="text-sm">
                {o.label}{o.experimental && <span className="ml-1 opacity-50">({t('performance.experimental')})</span>}
              </span>
            </label>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        {([
          ['linear', linearCorrection, handleLinearCorrection, true],
          ['ripple', ripple, handleWaveformControl, true],
          ['motionSync', motionSync, handleMotionSync, true],
        ] as const).map(([key, val, set, wired]) => (
          <div key={key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm">{t(`performance.${key}`)}</p>
              {!wired && <span className="rounded-full border border-accent/30 px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent/80">Not wired</span>}
            </div>
            <Switch checked={val} onChange={v => set(v)} disabled={!connected || !wired} />
          </div>
        ))}
      </Card>

      <Card>
        <p className="text-sm text-white/62 mb-3">{t('performance.workMode')}</p>
        <div className="flex gap-3">
          {([0, 1, 2] as const).map(m => {
            const isDisabled = !connected || isHighPolling(pollingRate) || m === 2
            return (
              <label key={m} className={`flex items-center gap-2 ${isDisabled ? 'cursor-default opacity-50' : 'cursor-pointer'}`}>
                <input
                  type="radio"
                  name="workMode"
                  checked={workMode === m}
                  onChange={() => !isDisabled && handleWorkMode(m)}
                  disabled={isDisabled}
                  className="accent-accent"
                />
                <span className="text-sm">
                  {t(`performance.${m === 0 ? 'lowPower' : m === 1 ? 'highPerf' : 'ultraPerf'}`)}
                  {m === 2 && <span className="ml-1 text-xs text-white/40">({t('performance.auto')})</span>}
                </span>
              </label>
            )
          })}
        </div>
        {workMode === 2 && (
          <p className="text-xs text-accent/70 mt-3">{t('performance.ultraAutoNote')}</p>
        )}
      </Card>
      </div>
    </div>
  )
}

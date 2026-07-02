import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Card from '../ui/Card'
import Switch from '../ui/Switch'
import { ipc, DeviceSettings } from '../../lib/ipc'
import { notifyError } from '../../lib/toast'

interface Props {
  connected: boolean
  demoMode?: boolean
  initialSettings: DeviceSettings | null
}

export default function AdvancedTab({ connected, demoMode = false, initialSettings }: Props) {
  const { t } = useTranslation()
  // Receiver LED and long-distance mode are written to the dongle and have no
  // known read-back, so they keep local defaults until changed.
  const [receiverLed, setReceiverLed] = useState(2) // modes: 1=Hz, 2=battery, 3=warning
  const [fps20k, setFps20k] = useState(false)
  const [longDistance, setLongDistance] = useState(false)
  const [workingMode, setWorkingMode] = useState(0)
  const [rageTime, setRageTime] = useState(6)
  const [angleEnabled, setAngleEnabled] = useState(false)
  const [angle, setAngle] = useState(0)
  const angleRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const RAGE_TIMES = [1, 3, 6, 12, 18, 36, 60, 90]

  useEffect(() => {
    if (!initialSettings) return
    setFps20k(initialSettings.fps20k)
    setWorkingMode(initialSettings.full_power)
    setRageTime(initialSettings.rage_time)
    setAngleEnabled(initialSettings.angle_enabled)
    setAngle(initialSettings.angle)
  }, [initialSettings])

  const reportError = (e: unknown) => notifyError(t('errors.applyFailed', { error: String(e) }))

  const handleReceiverLed = async (mode: number) => {
    const previous = receiverLed
    setReceiverLed(mode)
    if (demoMode) return
    try { await ipc.setReceiverLed(mode) } catch (e) { setReceiverLed(previous); reportError(e) }
  }

  const handleFps20k = async (enabled: boolean) => {
    const previous = fps20k
    setFps20k(enabled)
    if (demoMode) return
    try { await ipc.setFps20k(enabled) } catch (e) { setFps20k(previous); reportError(e) }
  }

  const handleLongDistance = async (enabled: boolean) => {
    const previous = longDistance
    setLongDistance(enabled)
    if (demoMode) return
    try { await ipc.setLongDistance(enabled) } catch (e) { setLongDistance(previous); reportError(e) }
  }

  const handleWorkingMode = async (enabled: boolean) => {
    const previous = workingMode
    const mode = enabled ? 1 : 0
    setWorkingMode(mode)
    if (demoMode) return
    try { await ipc.setWorkingMode(mode) } catch (e) { setWorkingMode(previous); reportError(e) }
  }

  const handleRageTime = async (seconds: number) => {
    const previous = rageTime
    setRageTime(seconds)
    if (demoMode) return
    try { await ipc.setRageTime(seconds) } catch (e) { setRageTime(previous); reportError(e) }
  }

  const handleAngleEnabled = async (enabled: boolean) => {
    const previous = angleEnabled
    setAngleEnabled(enabled)
    if (demoMode) return
    try { await ipc.setAngle(enabled, angle) } catch (e) { setAngleEnabled(previous); reportError(e) }
  }

  const handleAngle = (val: number) => {
    setAngle(val)
    if (demoMode || !angleEnabled) return
    if (angleRef.current) clearTimeout(angleRef.current)
    angleRef.current = setTimeout(async () => {
      try { await ipc.setAngle(true, val) } catch (e) { reportError(e) }
    }, 150)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[.32em] text-accent/80">{t('advanced.eyebrow')}</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">{t('advanced.title')}</h2>
      </div>
      <Card>
        <p className="text-sm text-white/62 mb-3">{t('advanced.receiverLed')}</p>
        <div className="flex gap-3">
          {([1, 2, 3] as const).map(mode => (
            <label key={mode} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="receiver-led"
                checked={receiverLed === mode}
                onChange={() => handleReceiverLed(mode)}
                disabled={!connected}
                className="accent-accent"
              />
              <span className="text-sm">
                {mode === 1 ? t('advanced.receiverLedHz') : mode === 2 ? t('advanced.receiverLedBattery') : t('advanced.receiverLedWarning')}
              </span>
            </label>
          ))}
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">{t('performance.workingMode')}</p>
          <Switch checked={workingMode === 1} onChange={handleWorkingMode} disabled={!connected} />
        </div>
        <p className="text-xs text-white/55 mb-3">{t('performance.workingModeDesc')}</p>
        {workingMode === 1 && (
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs text-white/62 shrink-0">{t('performance.workingModeDuration')}</p>
            <div className="flex flex-wrap gap-2">
              {RAGE_TIMES.map(s => (
                <button
                  key={s}
                  onClick={() => handleRageTime(s)}
                  disabled={!connected}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition disabled:opacity-40 ${
                    rageTime === s
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-white/10 bg-white/[.05] text-white/78 hover:bg-white/[.09]'
                  }`}
                >
                  {s}s
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">{t('performance.longDistance')}</p>
          <Switch checked={longDistance} onChange={handleLongDistance} disabled={!connected} />
        </div>
        <p className="text-xs text-white/55 mb-2">{t('performance.longDistanceDesc')}</p>
        <p className="text-xs text-amber-400/80">⚠ {t('performance.longDistanceWarn')}</p>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">{t('advanced.angleTitle')}</p>
          <Switch checked={angleEnabled} onChange={handleAngleEnabled} disabled={!connected} />
        </div>
        <p className="text-xs text-white/55 mb-4">{t('advanced.angleDesc')}</p>
        {angleEnabled && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">{t('advanced.angleLabel')}</span>
              <span className="text-sm font-bold tabular-nums">{angle > 0 ? `+${angle}` : angle}°</span>
            </div>
            <input
              type="range"
              min={-45}
              max={45}
              value={angle}
              onChange={e => handleAngle(Number(e.target.value))}
              disabled={!connected}
              className="w-full accent-accent disabled:opacity-40"
            />
            <div className="flex justify-between text-[10px] text-white/30">
              <span>−45°</span>
              <span>0°</span>
              <span>+45°</span>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">{t('performance.fps20k')}</p>
          <Switch checked={fps20k} onChange={handleFps20k} disabled={!connected} />
        </div>
        <p className="text-xs text-white/55 mb-2">{t('performance.fps20kDesc')}</p>
        <p className="text-xs text-amber-400/80">⚠ {t('performance.fps20kWarn')}</p>
      </Card>
    </div>
  )
}

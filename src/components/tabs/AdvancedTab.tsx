import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Card from '../ui/Card'
import Switch from '../ui/Switch'
import { ipc } from '../../lib/ipc'

interface Props { connected: boolean }

export default function AdvancedTab({ connected }: Props) {
  const { t } = useTranslation()
  const [receiverLed, setReceiverLed] = useState(2) // modes: 1=Hz, 2=battery, 3=warning
  const [fps20k, setFps20k] = useState(false)
  const [longDistance, setLongDistance] = useState(false)
  const [workingMode, setWorkingMode] = useState(0)
  const [rageTime, setRageTime] = useState(6)
  const [angleEnabled, setAngleEnabled] = useState(false)
  const [angle, setAngle] = useState(0)

  const RAGE_TIMES = [1, 3, 6, 12, 18, 36, 60, 90]

  const handleReceiverLed = async (mode: number) => {
    setReceiverLed(mode)
    try { await ipc.setReceiverLed(mode) } catch {}
  }

  const handleFps20k = async (enabled: boolean) => {
    setFps20k(enabled)
    try { await ipc.setFps20k(enabled) } catch {}
  }

  const handleLongDistance = async (enabled: boolean) => {
    setLongDistance(enabled)
    try { await ipc.setLongDistance(enabled) } catch {}
  }

  const handleWorkingMode = async (enabled: boolean) => {
    const mode = enabled ? 1 : 0
    setWorkingMode(mode)
    try { await ipc.setWorkingMode(mode) } catch {}
  }

  const handleRageTime = async (seconds: number) => {
    setRageTime(seconds)
    try { await ipc.setRageTime(seconds) } catch {}
  }

  const handleAngleEnabled = async (enabled: boolean) => {
    setAngleEnabled(enabled)
    try { await ipc.setAngle(enabled, angle) } catch {}
  }

  const handleAngle = async (val: number) => {
    setAngle(val)
    if (angleEnabled) try { await ipc.setAngle(true, val) } catch {}
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[.32em] text-accent/80">Device behavior</p>
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
          <p className="text-sm font-semibold">Angle Snapping</p>
          <Switch checked={angleEnabled} onChange={handleAngleEnabled} disabled={!connected} />
        </div>
        <p className="text-xs text-white/55 mb-4">Corrects cursor drift when the mouse is held at a slight angle. Range: −45° to +45°.</p>
        {angleEnabled && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Angle</span>
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

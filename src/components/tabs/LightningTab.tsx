import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Card from '../ui/Card'
import Slider from '../ui/Slider'
import { ipc, DeviceSettings, DpiLedMode } from '../../lib/ipc'
import { notifyError } from '../../lib/toast'

type LedMode = 'off' | 'solid' | 'breathing'

const LED_MODE_FROM_RAW: Record<number, LedMode> = { 0: 'off', 1: 'solid', 2: 'breathing' }
const LED_MODE_TO_IPC: Record<LedMode, DpiLedMode> = { off: 'Off', solid: 'Solid', breathing: 'Breathing' }

interface Props {
  connected: boolean
  demoMode?: boolean
  initialSettings: DeviceSettings | null
}

export default function LightningTab({ connected, demoMode = false, initialSettings }: Props) {
  const { t } = useTranslation()
  const [ledMode, setLedMode] = useState<LedMode>('off')
  const [brightness, setBrightness] = useState(5)
  const [speed, setSpeed] = useState(3)
  const brightnessRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const speedRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!initialSettings) return
    setLedMode(LED_MODE_FROM_RAW[initialSettings.dpi_led_mode] ?? 'off')
    setBrightness(Math.min(10, Math.max(1, initialSettings.dpi_led_brightness)))
    setSpeed(Math.min(5, Math.max(1, initialSettings.breathing_speed)))
  }, [initialSettings])

  const reportError = (e: unknown) => notifyError(t('errors.applyFailed', { error: String(e) }))

  const handleLedMode = async (mode: LedMode) => {
    const previous = ledMode
    setLedMode(mode)
    if (demoMode) return
    try {
      await ipc.setDpiLedMode(LED_MODE_TO_IPC[mode])
    } catch (e) {
      setLedMode(previous)
      reportError(e)
    }
  }

  const handleBrightness = (v: number) => {
    setBrightness(v)
    if (demoMode) return
    if (brightnessRef.current) clearTimeout(brightnessRef.current)
    brightnessRef.current = setTimeout(async () => {
      try { await ipc.setDpiLedBrightness(v) } catch (e) { reportError(e) }
    }, 150)
  }

  const handleSpeed = (v: number) => {
    setSpeed(v)
    if (demoMode) return
    if (speedRef.current) clearTimeout(speedRef.current)
    speedRef.current = setTimeout(async () => {
      try { await ipc.setBreathingSpeed(v) } catch (e) { reportError(e) }
    }, 150)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[.32em] text-accent/80">{t('lightning.eyebrow')}</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">{t('lightning.title')}</h2>
      </div>

      <Card>
        <p className="text-sm text-white/62 mb-3">{t('lightning.ledEffect')}</p>
        <div className="flex gap-3">
          {(['off', 'solid', 'breathing'] as const).map(mode => (
            <label key={mode} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="lightning-led"
                checked={ledMode === mode}
                onChange={() => handleLedMode(mode)}
                disabled={!connected}
                className="accent-accent"
              />
              <span className="text-sm">
                {t(`lightning.led${mode.charAt(0).toUpperCase()}${mode.slice(1)}`)}
              </span>
            </label>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-white/62">{t('lightning.brightness')}</p>
          <span className="text-sm font-bold text-accent">{brightness}</span>
        </div>
        <Slider
          min={1}
          max={10}
          step={1}
          value={brightness}
          onChange={handleBrightness}
          disabled={!connected || ledMode === 'off'}
        />
        <div className="flex justify-between text-xs text-white/45 mt-2">
          <span>1</span><span>10</span>
        </div>
      </Card>

      {ledMode === 'breathing' && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-white/62">{t('lightning.speed')}</p>
            <span className="text-sm font-bold text-accent">{speed}</span>
          </div>
          <Slider
            min={1}
            max={5}
            step={1}
            value={speed}
            onChange={handleSpeed}
            disabled={!connected}
          />
          <div className="flex justify-between text-xs text-white/45 mt-2">
            <span>1</span><span>5</span>
          </div>
        </Card>
      )}
    </div>
  )
}

import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Card from '../ui/Card'
import Slider from '../ui/Slider'
import { ipc } from '../../lib/ipc'

interface Props {
  connected: boolean
}

export default function LightningTab({ connected }: Props) {
  const { t } = useTranslation()
  const [ledMode, setLedMode] = useState<'off' | 'solid' | 'breathing'>('off')
  const [brightness, setBrightness] = useState(5)
  const [speed, setSpeed] = useState(3)
  const brightnessRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const speedRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleLedOff = async () => {
    setLedMode('off')
    try { await ipc.setDpiLedMode('Off') } catch {}
  }

  const handleLedSolid = async () => {
    setLedMode('solid')
    try { await ipc.setDpiLedMode('Solid') } catch {}
  }

  const handleLedBreathing = async () => {
    setLedMode('breathing')
    try { await ipc.setDpiLedMode('Breathing') } catch {}
  }

  const handleBrightness = (v: number) => {
    setBrightness(v)
    if (brightnessRef.current) clearTimeout(brightnessRef.current)
    brightnessRef.current = setTimeout(async () => {
      try { await ipc.setDpiLedBrightness(v) } catch {}
    }, 150)
  }

  const handleSpeed = (v: number) => {
    setSpeed(v)
    if (speedRef.current) clearTimeout(speedRef.current)
    speedRef.current = setTimeout(async () => {
      try { await ipc.setBreathingSpeed(v) } catch {}
    }, 150)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[.32em] text-accent/80">LED</p>
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
                onChange={mode === 'off' ? handleLedOff : mode === 'solid' ? handleLedSolid : handleLedBreathing}
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

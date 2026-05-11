import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Card from '../ui/Card'
const SPECS = [
  { key: 'sensor',      value: 'PixArt PAW3950' },
  { key: 'dpi',         value: '50 – 42,000 DPI' },
  { key: 'pollingRate', value: '125 / 250 / 500 / 1000 / 2000 / 4000 / 8000 Hz' },
  { key: 'switches',    value: 'Omron (mechanical)' },
  { key: 'weight',      value: '48 g ± 2 g' },
  { key: 'connectivity',value: '2.4 GHz wireless · Bluetooth · USB wired' },
  { key: 'battery',     value: '300 mAh' },
  { key: 'dimensions',  value: '121.0 × 61.3 × 38.1 mm' },
  { key: 'material',    value: 'Carbon-fibre composite' },
  { key: 'chip',        value: 'Nordic 54L15' },
]

interface Props {
  onReset?: () => Promise<void>
}

export default function OtherTab({ onReset }: Props) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[.32em] text-accent/80">Device</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">{t('other.title')}</h2>
      </div>

      <Card>
        <p className="text-sm text-white/62 mb-4">{t('other.specs')}</p>
        <div className="space-y-3">
          {SPECS.map(s => (
            <div key={s.key} className="flex items-baseline justify-between gap-4">
              <span className="text-xs text-white/50 shrink-0">{t(`other.spec_${s.key}`)}</span>
              <span className="text-sm font-semibold text-right">{s.value}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="text-sm text-white/62 mb-3">{t('other.factoryReset')}</p>
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="rounded-xl bg-red-500/85 px-4 py-2 text-sm font-bold hover:bg-red-400"
          >
            {t('other.factoryReset')}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-400">{t('other.factoryResetConfirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => onReset?.().finally(() => setConfirming(false))}
                className="rounded-xl bg-red-500/85 px-4 py-2 text-sm font-bold hover:bg-red-400"
              >
                {t('other.confirm')}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="rounded-xl bg-white/[.08] px-4 py-2 text-sm font-bold hover:bg-white/[.13]"
              >
                {t('other.cancel')}
              </button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <p className="text-sm font-semibold mb-2">{t('other.about')}</p>
        <p className="text-sm text-white/62">{t('other.aboutText')}</p>
      </Card>
    </div>
  )
}

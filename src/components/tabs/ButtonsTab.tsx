import { useTranslation } from 'react-i18next'
import mouseTopImage from '../../assets/fly-pro-top.png'

const CALLOUTS = [
  {
    label: 'Left Button',
    cardClass: 'left-[28%] top-[21%]',
    markerClass: 'left-[44%] top-[25%]',
  },
  {
    label: 'Middle Button',
    cardClass: 'left-[56%] top-[19%]',
    markerClass: 'left-[50%] top-[25%]',
  },
  {
    label: 'Right Click',
    cardClass: 'left-[63%] top-[30%]',
    markerClass: 'left-[56%] top-[31%]',
  },
  {
    label: 'Forward',
    cardClass: 'left-[24%] top-[46%]',
    markerClass: 'left-[40%] top-[47%]',
  },
  {
    label: 'Backward',
    cardClass: 'left-[31%] top-[58%]',
    markerClass: 'left-[42%] top-[59%]',
  },
]

export default function ButtonsTab() {
  const { t } = useTranslation()
  return (
    <div className="min-h-[calc(100vh-7rem)]">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[.32em] text-accent/80">Mouse Configuration</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">{t('buttons.title')}</h2>
        </div>
        <button className="rounded-xl bg-white/[.09] px-5 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/[.14]">
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

        {CALLOUTS.map(item => (
          <div key={item.label}>
            <div className={`absolute ${item.cardClass}`}>
              <div className="rounded-lg bg-zinc-900/80 px-4 py-2 shadow-xl shadow-black/30 ring-1 ring-white/10 backdrop-blur">
                <p className="text-[10px] text-white/42">{item.label}</p>
                <p className="text-sm font-bold">{item.label}</p>
              </div>
            </div>
            <span
              className={`absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dotted border-accent ${item.markerClass}`}
            />
          </div>
        ))}

        <p className="absolute bottom-16 left-1/2 max-w-md -translate-x-1/2 text-center text-sm text-white/58">
          {t('buttons.placeholder')}
        </p>
      </div>
    </div>
  )
}

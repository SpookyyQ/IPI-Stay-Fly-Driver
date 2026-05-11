import { useTranslation } from 'react-i18next'
import mouseTopImage from '../../assets/fly-pro-top.png'

const CALLOUTS = [
  { label: 'Left Button',   className: 'left-[11%] top-[26%]', dot: 'right-[-28px] top-1/2' },
  { label: 'Middle Button', className: 'right-[19%] top-[35%]', dot: 'left-[-28px] top-1/2' },
  { label: 'Right Click',   className: 'right-[5%]  top-[48%]', dot: 'left-[-28px] top-1/2' },
  { label: 'Forward',       className: 'left-[7%]   top-[55%]', dot: 'right-[-28px] top-1/2' },
  { label: 'Backward',      className: 'left-[24%]  top-[68%]', dot: 'right-[-28px] top-1/2' },
  { label: 'DPI Cycle',     className: 'right-[12%] top-[79%]', dot: 'left-[-28px] top-1/2' },
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
          <div key={item.label} className={`absolute ${item.className}`}>
            <div className="rounded-lg bg-zinc-900/80 px-4 py-2 shadow-xl shadow-black/30 ring-1 ring-white/10 backdrop-blur">
              <p className="text-[10px] text-white/42">{item.label}</p>
              <p className="text-sm font-bold">{item.label}</p>
            </div>
            <span className={`absolute h-5 w-5 -translate-y-1/2 rounded-full border-2 border-dotted border-accent ${item.dot}`} />
          </div>
        ))}

        <p className="absolute bottom-16 left-1/2 max-w-md -translate-x-1/2 text-center text-sm text-white/58">
          {t('buttons.placeholder')}
        </p>
      </div>
    </div>
  )
}

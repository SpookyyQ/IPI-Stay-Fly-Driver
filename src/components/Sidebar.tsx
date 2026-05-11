import { useTranslation } from 'react-i18next'
import { Boxes, ChevronDown, Gauge, Home, Languages, Mouse, SlidersHorizontal, Wand2, Zap } from 'lucide-react'
import mouseImage from '../assets/fly-pro-top.png'

type Tab = 'home' | 'dpi' | 'performance' | 'buttons' | 'advanced' | 'other' | 'lightning'

export type { Tab }

interface Props {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const navItems: { id: Tab; labelKey: string; icon: typeof Mouse }[] = [
  { id: 'buttons', labelKey: 'tabs.buttons', icon: Mouse },
  { id: 'dpi', labelKey: 'tabs.dpi', icon: SlidersHorizontal },
  { id: 'lightning', labelKey: 'tabs.lightning', icon: Zap },
  { id: 'performance', labelKey: 'tabs.performance', icon: Gauge },
  { id: 'advanced', labelKey: 'tabs.advanced', icon: Wand2 },
  { id: 'other', labelKey: 'tabs.other', icon: Boxes },
]

const languageOptions = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'es-MX', label: 'Español (México)' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'pl', label: 'Polski' },
  { code: 'pt', label: 'Português' },
  { code: 'zh', label: '中文（简体）' },
]

export default function Sidebar({ activeTab, onTabChange }: Props) {
  const { i18n, t } = useTranslation()
  const activeLanguage = i18n.resolvedLanguage ?? i18n.language
  const baseLanguage = activeLanguage.split('-')[0]
  const selectedLanguage = languageOptions.some(option => option.code === activeLanguage)
    ? activeLanguage
    : languageOptions.some(option => option.code === baseLanguage)
      ? baseLanguage
    : 'en'

  return (
    <aside className="w-[250px] shrink-0 border-r border-white/10 bg-black/55 shadow-2xl shadow-black/25 backdrop-blur-xl flex flex-col">
      <div className="px-4 py-4">
        <button onClick={() => onTabChange('home')} className="w-full rounded-xl bg-white/[.05] px-4 py-3 text-left transition hover:bg-white/[.08]">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <img src={mouseImage} alt="" className="h-8 w-8 object-contain opacity-80" draggable={false} />
                <p className="text-base font-semibold">IPI FLY PRO</p>
              </div>
              <Home size={14} className="text-white/40" />
            </div>

          </div>
        </button>
      </div>

      <nav className="flex-1 px-3 py-5">
        <p className="px-3 pb-3 text-xs text-white/42">Mouse Configuration</p>
        <div className="space-y-1.5">
          {navItems.map(item => {
            const Icon = item.icon
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                  active
                    ? 'bg-white/13 text-white shadow-lg shadow-black/10'
                    : 'text-white/78 hover:bg-white/[.07] hover:text-white'
                }`}
              >
                {active && <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-accent" />}
                <Icon size={18} className={active ? 'text-accent' : 'text-white/65 group-hover:text-accent'} />
                <span>{t(item.labelKey)}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <div className="mx-3 mb-4 rounded-2xl border border-white/10 bg-white/[.07] p-3">
        <label htmlFor="language-select" className="mb-2 flex items-center gap-2 text-xs text-white/55">
          <Languages size={13} className="text-accent/80" />
          {t('app.language')}
        </label>
        <div className="relative">
          <select
            id="language-select"
            value={selectedLanguage}
            onChange={event => i18n.changeLanguage(event.target.value)}
            className="h-10 w-full appearance-none rounded-lg border border-white/10 bg-white/[.08] px-3 pr-9 text-sm font-semibold text-white outline-none transition hover:bg-white/[.12] focus:border-accent/70 focus:ring-2 focus:ring-accent/20"
          >
            {languageOptions.map(option => (
              <option key={option.code} value={option.code} className="bg-zinc-950 text-white">
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/45"
          />
        </div>
      </div>
    </aside>
  )
}

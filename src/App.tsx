import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import type { Tab } from './components/Sidebar'
import TopBar from './components/TopBar'
import DpiTab from './components/tabs/DpiTab'
import PerformanceTab from './components/tabs/PerformanceTab'
import LightningTab from './components/tabs/LightningTab'
import ButtonsTab from './components/tabs/ButtonsTab'
import AdvancedTab from './components/tabs/AdvancedTab'
import OtherTab from './components/tabs/OtherTab'
import HomeTab from './components/tabs/HomeTab'
import DevPanel from './components/DevPanel'
import { ipc, StatusInfo, DeviceSettings } from './lib/ipc'

const DEMO_STATUS: StatusInfo = {
  connected: true,
  battery_percent: 87,
  raw_status: 'demo',
  raw_battery: 'demo',
  last_error: '',
}

const DEMO_SETTINGS: DeviceSettings = {
  polling_rate: 'Hz2000',
  lod: 'Mm07',
  dpi_values: [400, 800, 1600, 5600],
  active_dpi_stage: 1,
  motion_sync: true,
  linear_correction: false,
  waveform_control: false,
  sleep: 6,
  full_power: 0,
  work_mode: 1,
  rage_time: 6,
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [demoMode, setDemoMode] = useState(false)
  const [status, setStatus] = useState<StatusInfo>({
    connected: false,
    battery_percent: 0,
    raw_status: '',
    raw_battery: '',
    last_error: '',
  })
  const [settings, setSettings] = useState<DeviceSettings | null>(null)
  const [devOpen, setDevOpen] = useState(false)

  const pollStatus = useCallback(async () => {
    if (demoMode) {
      setStatus(DEMO_STATUS)
      setSettings(DEMO_SETTINGS)
      return
    }

    try {
      const s = await ipc.getStatus()
      setStatus(prev => {
        if (!prev.connected && s.connected) {
          ipc.readSettings().then(setSettings).catch(() => {})
        }
        return {
          ...s,
          // keep last known battery if we get a 0 while still connected
          battery_percent: (s.connected && s.battery_percent === 0 && prev.battery_percent > 0)
            ? prev.battery_percent
            : s.battery_percent,
        }
      })
    } catch (e) {
      setStatus(prev => ({ ...prev, connected: false, last_error: String(e) }))
    }
  }, [demoMode])

  useEffect(() => {
    pollStatus()
    if (demoMode) return
    const id = setInterval(pollStatus, 5000)
    return () => clearInterval(id)
  }, [demoMode, pollStatus])

  useEffect(() => {
    if (demoMode && devOpen) setDevOpen(false)
  }, [demoMode, devOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (demoMode) return
      if (e.ctrlKey && e.shiftKey && e.key === 'D') setDevOpen(v => !v)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [demoMode])

  return (
    <div className={`atk-shell flex h-screen w-screen overflow-hidden text-white ${demoMode ? 'demo-shell' : ''}`}>
      <div className="atk-ribbon" />
      {tab !== 'home' && <Sidebar activeTab={tab} onTabChange={setTab} />}
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar status={status} demoMode={demoMode} onDemoModeChange={setDemoMode} />
        {demoMode && (
          <div className="demo-mode-banner">
            <span className="demo-mode-dot" />
            <span>DEMO MODE</span>
            <span className="font-semibold text-white/68">Virtual mouse active - hardware communication disabled</span>
          </div>
        )}
        <main className="relative flex-1 overflow-y-auto p-7">
          <div className="tab-switcher">
            <div className={`tab-panel ${tab === 'home' ? 'tab-panel-active' : ''}`}>
              <HomeTab status={status} demoMode={demoMode} onNavigate={setTab} />
            </div>
            <div className={`tab-panel ${tab === 'buttons' ? 'tab-panel-active' : ''}`}><ButtonsTab /></div>
            <div className={`tab-panel ${tab === 'dpi' ? 'tab-panel-active' : ''}`}>
              <DpiTab connected={status.connected} demoMode={demoMode} initialSettings={settings} />
            </div>
            <div className={`tab-panel ${tab === 'lightning' ? 'tab-panel-active' : ''}`}>
              <LightningTab connected={status.connected} demoMode={demoMode} />
            </div>
            <div className={`tab-panel ${tab === 'performance' ? 'tab-panel-active' : ''}`}>
              <PerformanceTab connected={status.connected} demoMode={demoMode} initialSettings={settings} />
            </div>
            <div className={`tab-panel ${tab === 'advanced' ? 'tab-panel-active' : ''}`}><AdvancedTab connected={status.connected} demoMode={demoMode} /></div>
            <div className={`tab-panel ${tab === 'other' ? 'tab-panel-active' : ''}`}>
              <OtherTab onReset={() =>
                demoMode
                  ? Promise.resolve()
                  : ipc.factoryReset().then(() => ipc.readSettings()).then(setSettings).catch(() => {})
              } />
            </div>
          </div>
        </main>
      </div>
      {devOpen && <DevPanel onClose={() => setDevOpen(false)} />}
    </div>
  )
}

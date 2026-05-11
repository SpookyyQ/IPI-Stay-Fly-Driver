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

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
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
  }, [])

  useEffect(() => {
    pollStatus()
    const id = setInterval(pollStatus, 5000)
    return () => clearInterval(id)
  }, [pollStatus])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') setDevOpen(v => !v)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="atk-shell flex h-screen w-screen overflow-hidden text-white">
      <div className="atk-ribbon" />
      {tab !== 'home' && <Sidebar activeTab={tab} onTabChange={setTab} />}
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar status={status} />
        <main className="relative flex-1 overflow-y-auto p-7">
          <div className={tab === 'home' ? '' : 'hidden'}>
            <HomeTab status={status} onNavigate={setTab} />
          </div>
          <div className={tab === 'buttons' ? '' : 'hidden'}><ButtonsTab /></div>
          <div className={tab === 'dpi' ? '' : 'hidden'}>
            <DpiTab connected={status.connected} initialSettings={settings} />
          </div>
          <div className={tab === 'lightning' ? '' : 'hidden'}>
            <LightningTab connected={status.connected} />
          </div>
          <div className={tab === 'performance' ? '' : 'hidden'}>
            <PerformanceTab connected={status.connected} initialSettings={settings} />
          </div>
          <div className={tab === 'advanced' ? '' : 'hidden'}><AdvancedTab connected={status.connected} /></div>
          <div className={tab === 'other' ? '' : 'hidden'}>
            <OtherTab onReset={() =>
              ipc.factoryReset().then(() => ipc.readSettings()).then(setSettings).catch(() => {})
            } />
          </div>
        </main>
      </div>
      {devOpen && <DevPanel onClose={() => setDevOpen(false)} />}
    </div>
  )
}

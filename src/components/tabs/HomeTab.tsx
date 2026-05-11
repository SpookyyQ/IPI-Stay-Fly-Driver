import { useState, useCallback } from 'react'
import { Settings2, Wifi, WifiOff, Plus } from 'lucide-react'
import mouseImage from '../../assets/fly-pro-top.png'
import { ipc, StatusInfo } from '../../lib/ipc'
import type { Tab } from '../Sidebar'
import AddDeviceDialog from '../AddDeviceDialog'

interface Props {
  status: StatusInfo
  onNavigate: (tab: Tab) => void
}

export default function HomeTab({ status, onNavigate }: Props) {
  const [addOpen, setAddOpen] = useState(false)

  const handleConnect = useCallback(() => {
    // trigger immediate status refresh so the card updates without waiting 5s
    ipc.getStatus().catch(() => {})
  }, [])

  const mouseCard = (
    <div
      onClick={() => status.connected && onNavigate('buttons')}
      className={`relative flex flex-col w-[340px] h-[440px] rounded-2xl overflow-hidden border border-white/10 bg-white/[.04] transition ${
        status.connected ? 'cursor-pointer hover:bg-white/[.07] hover:border-white/20' : 'cursor-default'
      }`}
    >
      <div className="flex-1 flex items-center justify-center">
        <img
          src={mouseImage}
          alt="IPI FLY PRO"
          draggable={false}
          className={`h-[280px] object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,.55)] transition ${
            status.connected ? '' : 'opacity-25 grayscale'
          }`}
        />
      </div>

      <div className="px-5 py-4 bg-black/35 border-t border-white/10">
        <p className="text-lg font-black tracking-tight">IPI FLY PRO</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            {status.connected
              ? <Wifi size={14} className="text-accent" />
              : <WifiOff size={14} className="text-white/30" />}
            <span className={`text-sm ${
              status.connected ? 'text-white/65' : 'text-white/30'
            }`}>
              {status.connected ? 'Connected' : 'Not connected'}
            </span>
          </div>
          {status.connected && (
            <button
              onClick={e => { e.stopPropagation(); onNavigate('buttons') }}
              className="p-1.5 rounded-lg hover:bg-white/15 text-white/45 hover:text-white transition"
              title="Configure"
            >
              <Settings2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )

  const addCard = (
    <button
      onClick={() => setAddOpen(true)}
      className="flex flex-col items-center justify-center w-[340px] h-[440px] rounded-2xl border-2 border-dashed border-white/15 transition hover:border-accent/50 hover:bg-white/[.03] gap-4"
    >
      <div className="w-16 h-16 rounded-full bg-white/[.06] flex items-center justify-center">
        <Plus size={28} className="text-white/35" />
      </div>
      <p className="text-sm text-white/35">Add Device</p>
    </button>
  )

  return (
    <div className="-m-7 flex min-h-[calc(100vh-3rem)] items-center justify-center">
      <div className="flex gap-6 items-center">
        {!status.connected && addCard}
        {mouseCard}
      </div>
      {addOpen && <AddDeviceDialog onClose={() => setAddOpen(false)} onConnect={handleConnect} />}
    </div>
  )
}

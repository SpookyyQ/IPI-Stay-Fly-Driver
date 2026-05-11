import { useEffect, useState } from 'react'
import { X, Usb } from 'lucide-react'
import { ipc, HidDeviceInfo } from '../lib/ipc'

const IPI_VID = 0x3554
const IPI_PID = 0xF517

interface Props {
  onClose: () => void
  onConnect?: () => void
}

export default function AddDeviceDialog({ onClose, onConnect }: Props) {
  const [devices, setDevices] = useState<HidDeviceInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ipc.listHidDevices()
      .then(setDevices)
      .catch(() => setDevices([]))
      .finally(() => setLoading(false))
  }, [])

  const isCompatible = (d: HidDeviceInfo) =>
    d.vendor_id === IPI_VID && d.product_id === IPI_PID

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[500px] rounded-2xl bg-[#111] border border-white/10 shadow-2xl shadow-black/60"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <p className="font-semibold">Select Device</p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 max-h-[360px] overflow-y-auto space-y-2">
          {loading && (
            <p className="text-sm text-white/50 text-center py-10">Scanning USB devices…</p>
          )}
          {!loading && devices.length === 0 && (
            <p className="text-sm text-white/50 text-center py-10">No HID devices found</p>
          )}
          {devices.map((d, i) => {
            const compat = isCompatible(d)
            return (
              <button
                key={i}
                disabled={!compat}
                onClick={() => { onConnect?.(); onClose() }}
                className={`w-full flex items-center gap-4 p-3 rounded-xl border text-left transition ${
                  compat
                    ? 'border-accent/40 bg-accent/[.07] hover:bg-accent/[.14] cursor-pointer'
                    : 'border-white/[.06] bg-white/[.02] cursor-not-allowed opacity-50'
                }`}
              >
                <Usb size={18} className={compat ? 'text-accent' : 'text-white/25'} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${
                    compat ? 'text-white' : 'text-white/55'
                  }`}>
                    {d.product_string || 'Unknown Device'}
                  </p>
                  <p className="text-xs text-white/30 mt-0.5">
                    {d.manufacturer_string ? `${d.manufacturer_string} · ` : ''}
                    VID&nbsp;0x{d.vendor_id.toString(16).padStart(4,'0').toUpperCase()}&nbsp;
                    PID&nbsp;0x{d.product_id.toString(16).padStart(4,'0').toUpperCase()}
                  </p>
                </div>
                {compat && (
                  <span className="shrink-0 text-xs font-bold text-accent">Connect</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="px-6 py-4 border-t border-white/10">
          <p className="text-xs text-white/35 text-center">
            Plug in your IPI FLY PRO USB receiver — it will be detected automatically
          </p>
        </div>
      </div>
    </div>
  )
}

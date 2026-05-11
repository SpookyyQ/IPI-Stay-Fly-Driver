import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { ipc } from '../lib/ipc'

interface CapturedFrame { ts: number; hex: string }

export default function DevPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [frame, setFrame] = useState('')
  const [response, setResponse] = useState('')
  const [capturing, setCapturing] = useState(false)
  const [captured, setCaptured] = useState<CapturedFrame[]>([])
  const captureStart = useRef<CapturedFrame[]>([])

  const send = async () => {
    try {
      const res = await ipc.sendRaw(frame.trim())
      setResponse(res)
    } catch (e) {
      setResponse(String(e))
    }
  }

  const toggleCapture = () => {
    if (capturing) {
      setCaptured(captureStart.current)
      setCapturing(false)
    } else {
      captureStart.current = []
      setCapturing(true)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface-800 border border-surface-600 rounded-xl w-[560px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <span className="font-semibold">{t('dev.title')}</span>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <p className="text-xs text-surface-200 mb-1">{t('dev.sendFrame')}</p>
            <div className="flex gap-2">
              <input
                value={frame}
                onChange={e => setFrame(e.target.value)}
                placeholder="07 00 00 04 02 00 55 00 ..."
                className="flex-1 bg-surface-900 border border-surface-600 rounded px-3 py-1.5 text-sm font-mono"
              />
              <button
                onClick={send}
                className="px-4 py-1.5 rounded bg-accent text-black text-sm font-medium hover:bg-accent-hover"
              >
                {t('dev.send')}
              </button>
            </div>
          </div>
          {response && (
            <div>
              <p className="text-xs text-surface-200 mb-1">{t('dev.response')}</p>
              <pre className="bg-surface-900 rounded p-3 text-xs font-mono overflow-x-auto">{response}</pre>
            </div>
          )}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <p className="text-sm">{t('dev.diffCapture')}</p>
              <button
                onClick={toggleCapture}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  capturing ? 'bg-red-600 hover:bg-red-500' : 'bg-surface-700 hover:bg-surface-600'
                }`}
              >
                {capturing ? t('dev.stopCapture') : t('dev.startCapture')}
              </button>
            </div>
            {captured.length > 0 && (
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-surface-200">
                    <th className="text-left py-1">T+ms</th>
                    <th className="text-left py-1">Frame</th>
                  </tr>
                </thead>
                <tbody>
                  {captured.map((f, i) => (
                    <tr key={i} className="border-t border-surface-700">
                      <td className="py-1 pr-4">{f.ts}</td>
                      <td className="py-1">{f.hex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

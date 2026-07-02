import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { ipc } from '../lib/ipc'

export default function DevPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [frame, setFrame] = useState('')
  const [response, setResponse] = useState('')

  const send = async () => {
    try {
      const res = await ipc.sendRaw(frame.trim())
      setResponse(res)
    } catch (e) {
      setResponse(String(e))
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
        </div>
      </div>
    </div>
  )
}

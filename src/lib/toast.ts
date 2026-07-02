// Tiny pub/sub for transient in-app notifications, so hardware-write failures
// are surfaced instead of being swallowed by empty catch blocks.

export interface Toast {
  id: number
  kind: 'error' | 'ok'
  text: string
}

type Listener = (toast: Toast) => void

let nextId = 1
const listeners = new Set<Listener>()

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit(kind: Toast['kind'], text: string) {
  const toast: Toast = { id: nextId++, kind, text }
  listeners.forEach(l => l(toast))
}

export function notifyError(text: string) {
  emit('error', text)
}

export function notifyOk(text: string) {
  emit('ok', text)
}

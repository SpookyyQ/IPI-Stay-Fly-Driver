import React from 'react'
import ReactDOM from 'react-dom/client'
import { appWindow } from '@tauri-apps/api/window'
import App from './App'
import TrayFlyout from './components/TrayFlyout'
import './i18n'
import './index.css'
import { applyTheme, getStoredTheme } from './lib/themes'

applyTheme(getStoredTheme())

const isTray = appWindow.label === 'tray'

if (isTray) {
  // The flyout window is transparent; drop the opaque page background.
  document.documentElement.style.background = 'transparent'
  document.body.style.background = 'transparent'
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isTray ? <TrayFlyout /> : <App />}
  </React.StrictMode>
)

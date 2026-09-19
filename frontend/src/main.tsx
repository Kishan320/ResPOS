import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useAuthStore } from './store/authStore'
import { useI18nStore } from './i18n/i18nStore'

// Always set an explicit theme so OS dark mode cannot wash out text
const theme = useAuthStore.getState().theme || 'light'
document.documentElement.setAttribute('data-theme', theme)
if (!document.documentElement.getAttribute('data-theme')) {
  document.documentElement.setAttribute('data-theme', 'light')
}

// Resolve the language (cookie / default) before the first render so no
// English flash happens for German users. Also sets <html lang>.
useI18nStore.getState()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './index.css'
import App from './App.tsx'
import { initSentry } from './sentry'

// before render, so errors thrown during the first mount are still captured
initSentry()

createRoot(document.getElementById('root')!).render(<App />)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@sistem/tokens/tokens.css'
import '@fontsource/karantina/700.css'
import './styles/fonts.css'
import './styles/globals.css'
import App from './App.tsx'
import { AppProviders } from './app/providers/AppProviders'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)

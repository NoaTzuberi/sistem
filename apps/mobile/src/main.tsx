import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@sistem/tokens/tokens.css'
import './styles/globals.css'
import './styles/typography.css'
import './styles/animations.css'
import './styles/workoutColors.css'
import App from './App.tsx'
import { AppProviders } from './app/providers/AppProviders'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)

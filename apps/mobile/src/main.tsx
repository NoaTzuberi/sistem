import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@sistem/tokens/tokens.css'
// The trainee type system, self-hosted (works offline in the Capacitor build): Karantina (Hebrew display),
// Barlow Condensed (numbers / Latin display), JetBrains Mono (eyebrows), Rubik (text).
// The weight files carry unicode-range per subset: the browser only fetches the subsets a page uses.
import '@fontsource/karantina/700.css'
import '@fontsource/barlow-condensed/500.css'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource/barlow-condensed/700-italic.css'
import '@fontsource/barlow-condensed/800-italic.css'
import '@fontsource/jetbrains-mono/700.css'
import '@fontsource/rubik/400.css'
import '@fontsource/rubik/500.css'
import '@fontsource/rubik/600.css'
import '@fontsource/rubik/700.css'
import './styles/fonts.css'
import './styles/globals.css'
import './styles/typography.css'
import './styles/animations.css'
import './styles/workoutColors.css'
import './styles/achievementColors.css'
import App from './App.tsx'
import { AppProviders } from './app/providers/AppProviders'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)

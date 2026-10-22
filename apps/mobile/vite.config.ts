import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// Set only by `npm run dev:phone` (scripts/dev-phone.mjs). Dev server only — `vite build` ignores it.
const phoneHttps = process.env.SISTEM_DEV_HTTPS === '1'
const apiTarget = process.env.SISTEM_API_PROXY_TARGET ?? 'http://localhost:5002'

// The sub-path the app is served from. Set only by the GitHub Pages workflow
// (.github/workflows/deploy.yml); everywhere else the app lives at the root.
const basePath = process.env.SISTEM_BASE_PATH ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  // The app version on Profile ("SISTEM · V0.6"): this package's version, set by npm when it runs a script.
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  // Self-signed HTTPS so a phone gets a secure context (Screen Wake Lock needs one).
  plugins: [react(), ...(phoneHttps ? [basicSsl()] : [])],
  server: {
    // Listen on the local network so a phone on the same Wi-Fi can open the app.
    host: true,
    // Same-origin API for the phone: /api goes from the Vite server to the local API,
    // so the phone never needs "localhost" (that would be the phone itself).
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
})

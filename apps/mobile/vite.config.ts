import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// Set only by `npm run dev:phone` (scripts/dev-phone.mjs). Dev server only — `vite build` ignores it.
const phoneHttps = process.env.SISTEM_DEV_HTTPS === '1'

// The sub-path the app is served from. Set only by the GitHub Pages workflow
// (.github/workflows/deploy.yml); everywhere else the app lives at the root.
const basePath = process.env.SISTEM_BASE_PATH ?? '/'

/**
 * Dev server only: where `/api` goes. SISTEM_API_PROXY_TARGET wins (dev-phone); else the origin of an
 * absolute VITE_API_URL in .env (http://localhost:5002/api → http://localhost:5002); else the local server.
 */
function apiProxyTarget(mode: string): string {
  if (process.env.SISTEM_API_PROXY_TARGET) return process.env.SISTEM_API_PROXY_TARGET
  const apiUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL ?? ''
  try {
    return new URL(apiUrl).origin
  } catch {
    return 'http://localhost:5002'
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
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
    // Same-origin API (the app calls /api in dev — src/app/config/env.ts): the Vite server forwards it,
    // so no device ever needs "localhost" (on a phone that would be the phone itself).
    proxy: {
      '/api': { target: apiProxyTarget(mode), changeOrigin: true },
    },
  },
}))

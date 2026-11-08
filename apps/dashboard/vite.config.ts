import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

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

// Port 5174 so the dashboard runs next to the mobile app (5173) with `npm run dev:all`.
export default defineConfig(({ mode }) => ({
  base: basePath,
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    // Listen on the local network too (the LAN URL), like the mobile app.
    host: true,
    // The dashboard calls /api in dev (src/app/config/env.ts); the Vite server forwards it.
    proxy: {
      '/api': { target: apiProxyTarget(mode), changeOrigin: true },
    },
  },
}))

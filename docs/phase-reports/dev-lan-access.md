# Dev: the apps work from the LAN URL (and a phone on the same Wi-Fi)

Date: 2026-11-08. Server tests 719/719 (3 new CORS cases), copy parity 42/42, lint + audits clean, all apps build.

## Summary
- **Cause.** Opened by Vite's Network URL, the app still called the API at `VITE_API_URL`
  (`http://localhost:5002/api`). On the computer, CORS refused that origin. On a phone, `localhost` is the phone
  itself. Both cases fell back to the generic "ההתחברות נכשלה".
- **Client (dev only).** Both apps call the same-origin `/api` in dev (`API_BASE_URL` in `app/config/env.ts`), and
  the Vite dev proxy forwards it to the origin of `VITE_API_URL` (else `localhost:5002`; `SISTEM_API_PROXY_TARGET`
  still wins for `dev:phone`). Builds (production, GitHub Pages, Capacitor) use `VITE_API_URL` unchanged.
  The dashboard now has `server.host: true` + the same proxy (the mobile app already had both).
- **Server CORS (development only).** `isAllowedOrigin` (config/clientOrigins.ts) = the exact `CLIENT_ORIGINS` list,
  plus, when NODE_ENV isn't production, private LAN origins (192.168.*, 10.*, 172.16–31.*) on 5173 / 5174 (http or
  https). Production accepts exactly `CLIENT_ORIGINS`. That is the variable production already used; it was not
  switched to CLIENT_URL / DASHBOARD_URL.
- **"No connection to the server".** Login / sign-up (mobile) and the dashboard login now show
  `common.noConnection` when the API never answered. That covers offline, a wrong address, CORS, and a proxy 5xx
  without the API's `code` / `message`. Before, they showed the generic failure line. Helpers: api-client
  `isNoConnectionError`, `isAuthNoConnection`.

## Verified (WebKit at iPhone size + Chromium, opened by the Mac's LAN IP `http://10.100.102.2`)
Isolated in-memory database, not your dev DB:
- mobile sign-up → `/start`, mobile login → `/home`, dashboard login → `/`;
- server stopped → mobile and dashboard both show "אין חיבור לשרת. בדקי את החיבור לאינטרנט ונסי שוב."
  (screenshot `finish-partials/lan-no-connection-mobile.png`).
- Your running `npm run dev:all` reloaded the new config by itself. `/api/health` answers through
  `http://10.100.102.2:5173` and `:5174`. The server sends CORS headers to `http://10.100.102.2:5173` and none to
  a public origin.
- **Not tested on a real iPhone** (no device here). Open `http://<Mac LAN IP>:5173` in Safari on the same Wi-Fi and
  sign up / log in. If it doesn't load, check the macOS firewall allows `node`.

## Copy
`common.noConnection` — he "אין חיבור לשרת. בדקי את החיבור לאינטרנט ונסי שוב." / en "No connection to the server.
Check your internet connection and try again." **PLACEHOLDER**: the request mentioned a message "below", but its
text didn't come through. Send the wording and it replaces this line.

## Files changed
`apps/{mobile,dashboard}/vite.config.ts`, `apps/{mobile,dashboard}/src/app/config/env.ts`,
`apps/{mobile,dashboard}/src/services/api/apiClient.ts`, `apps/mobile/src/features/auth/pages/{Login,Register}/*.tsx`,
`apps/dashboard/src/features/auth/pages/Login/Login.tsx`, `apps/server/src/app.ts`,
`apps/server/src/config/clientOrigins.ts` + its test, `packages/api-client/src/{createApiClient,authApi,index}.ts`,
`packages/shared/src/copy/{he,en}.ts`, `README.md` (Testing on a phone).

## Dependencies
None.

## Known issues / TODOs
- `packages/shared/src/copy/{he,en}.ts` and `packages/api-client/src/index.ts` also hold the finish-partials changes
  (not committed yet). Run the finish-partials commits first: those three files then carry this task's lines too.
  The commit below has the rest.
- `scripts/dev-phone.mjs` still sets `VITE_API_URL=/api`. It's now redundant but harmless.

## Suggested commits
```sh
git add -A -- apps/mobile/vite.config.ts apps/dashboard/vite.config.ts apps/mobile/src/app/config/env.ts apps/dashboard/src/app/config/env.ts apps/mobile/src/services/api/apiClient.ts apps/dashboard/src/services/api/apiClient.ts apps/mobile/src/features/auth/pages/Login/Login.tsx apps/mobile/src/features/auth/pages/Register/Register.tsx apps/dashboard/src/features/auth/pages/Login/Login.tsx apps/server/src/app.ts apps/server/src/config/clientOrigins.ts apps/server/src/config/__tests__/clientOrigins.test.ts packages/api-client/src/createApiClient.ts packages/api-client/src/authApi.ts packages/shared/src/copy/he.ts packages/shared/src/copy/en.ts packages/api-client/src/index.ts README.md docs/phase-reports/dev-lan-access.md
git commit -m "fix(dev): apps work from the LAN URL (same-origin /api proxy, dev-only LAN CORS) and show no-connection on login"
```

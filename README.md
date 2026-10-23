# Sistem

link for the coach dev: https://noatzuberi.github.io/sistem/#/login
link for the trainer app: https://noatzuberi.github.io/sistem/mobile/#/login

Sistem is a mobile coaching app that connects a personal **Coach** with her **Trainees**.
A trainee signs up, completes an onboarding questionnaire, receives a weekly training
plan built by the coach, follows and logs workouts, and tracks progress. The coach
manages trainees and builds plans from a web dashboard and a coach mode in the app.

This repository is a fork of ATLAS that is being converted step by step.
See [`docs/PRD.md`](./docs/PRD.md) for the product and
[`docs/BUILD_PLAN.md`](./docs/BUILD_PLAN.md) for the phase plan.

## Repository layout (npm workspaces)

| Path | Package | What it is |
|---|---|---|
| `apps/mobile` | `@sistem/mobile` | Mobile app — React 19, Vite, TypeScript, React Router, axios, GSAP, plain CSS. Trainee and coach mode by role. To be wrapped with Capacitor. |
| `apps/dashboard` | `@sistem/dashboard` | Coach web dashboard — React + Vite (desktop-first). |
| `apps/server` | `@sistem/server` | API — Node.js, Express 5, TypeScript, MongoDB (Mongoose), JWT auth. Vitest + mongodb-memory-server. |
| `packages/types` | `@sistem/types` | API contract types shared by all three. |
| `packages/api-client` | `@sistem/api-client` | axios client factory + shared auth calls. |
| `packages/tokens` | `@sistem/tokens` | Design tokens (`tokens.css`, PRD §12). |

## Running locally

Prerequisites: Node.js ≥ 20.19 and a MongoDB connection string. Everything runs from the
repo root; there is one `npm install` and one lockfile.

```bash
npm install
cp apps/server/.env.example apps/server/.env         # then fill in the values
cp apps/mobile/.env.example apps/mobile/.env
cp apps/dashboard/.env.example apps/dashboard/.env
npm run dev        # server (http://localhost:5002) + mobile app (http://localhost:5173)
npm run dev:all    # + coach dashboard (http://localhost:5174)
```

The onboarding videos (`apps/mobile/src/assets/onBoardingvid/`) are not in the repo yet;
the mobile app only builds where they exist locally (moved to Cloudinary in Phase 2c).

### Testing on a phone

DEV ONLY. Runs the server and the mobile app so a phone on the **same Wi-Fi** as the Mac
can open the app (the dashboard is not included).

```bash
npm run dev:phone
```

1. Stop `npm run dev` first — the app needs port 5173 and the script refuses another port
   (so the printed address is always the real one).
2. The script prints the address to open on the phone, e.g. `https://192.168.1.23:5173`
   (the Mac's local IP). Vite also prints it as `Network:`.
3. Open that address in Safari on the iPhone. The first time, macOS may ask whether `node`
   may accept incoming connections — allow it.

What it does, and why:

- **Same-origin API.** The app calls `/api` on its own address and the Vite dev server
  forwards it to the local server (`http://localhost:<PORT from apps/server/.env>`). The phone
  only needs the Vite address — `localhost` on the phone would be the phone itself. For this run
  only, `VITE_API_URL` is set to `/api` (it overrides `apps/mobile/.env`; no file changes).
- **Network.** The Vite dev server listens on all interfaces (`server.host: true`), also with
  plain `npm run dev`.
- **HTTPS.** The app is served over HTTPS with a self-signed certificate
  (`@vitejs/plugin-basic-ssl`), because the Screen Wake Lock API (screen stays on during a
  workout) only works in a secure context. Only `dev:phone` turns it on; `npm run dev` stays HTTP.

**The certificate warning.** The certificate is not signed by a trusted authority, so the phone
shows a warning the first time. On iPhone Safari:

1. Safari shows **"This Connection Is Not Private"**.
2. Tap **Show Details**, then the link **visit this website**.
3. Confirm with **Visit Website** (enter the iPhone passcode if asked).

The app then loads and Safari remembers the exception for that address. If the Mac's IP changes
or the certificate is regenerated (it is cached in `node_modules/.vite`), the warning comes back
once — accept it again. Screen Wake Lock in Safari needs iOS 16.4 or later.

If the phone can't reach the address: check both devices are on the same network (guest /
office Wi-Fi often blocks devices from seeing each other; the iPhone's own hotspot works),
and that the macOS firewall allows `node`.

None of this touches production: the proxy, `host` and HTTPS settings only apply to the Vite
dev server, and `npm run build` still uses `VITE_API_URL` from `apps/mobile/.env`.

### Optional data

```bash
npm run import:exercises          # exercise library from the Kaggle CSV (facts only); also tags + groups it
npm run clean:exercise-names      # drops the dataset's "30 …" name prefix (safe to re-run; ids / slugs unchanged)
npm run group:exercises           # movement patterns + equipment-variant families (safe to re-run; coach edits kept)
npm run seed:knowledge            # knowledge base embeddings (needs VOYAGE_API_KEY)
npm run seed:dev                  # DEV ONLY: 1 coach + 2 onboarded trainees (one with a plan)
npm run promote:coach -- <email>  # DEV ONLY: make an existing user a coach
npm run create:admin              # create the ADMIN_EMAIL account (or add the admin role)
```

`create:admin` reads `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12+ characters, needed only to create an
account or with `-- --reset-password`; never the seed password, never printed) and optional `ADMIN_NAME`.
A new account gets only the admin role; an existing one keeps her roles and password. It prints the
target database and refuses a non-local one unless `-- --allow-remote` is added.

`seed:dev` and `promote:coach` refuse to run with `NODE_ENV=production` and refuse a
non-local database unless `--allow-remote` is added (they print which database they
will touch). Seed accounts: `coach@sistem.dev`, `trainee1@sistem.dev`,
`trainee2@sistem.dev`, password `sistem-dev-1234` — or your own with `SEED_PASSWORD=<12+ characters>`
(always set it for a database a public server uses; it is never printed).

Deploying the server: `docs/deploy/render.md` (Render Blueprint `render.yaml`).

New trainees are assigned to the coach in `DEFAULT_COACH_EMAIL` (apps/server/.env), or to
the only coach if there is exactly one; otherwise they stay unassigned until a coach is
promoted or seeded.

### Other commands (from the root)

| Command | What it does |
|---|---|
| `npm run build` | Build every app |
| `npm run lint` | Lint mobile + dashboard (oxlint) |
| `npm test` | Run the server test suite |
| `npm run dev:server` / `dev:mobile` / `dev:dashboard` | Run one app |
| `npm run dev:phone` | DEV ONLY: server + mobile app over HTTPS on the local network (see "Testing on a phone") |
| `npm start -w @sistem/server` | Run the compiled server |

## Docs

- [`docs/PRD.md`](./docs/PRD.md) — product requirements (source of truth)
- [`docs/BUILD_PLAN.md`](./docs/BUILD_PLAN.md) — phases and owner decisions
- [`docs/phase-reports/`](./docs/phase-reports/) — one report per completed phase
- [`docs/Onboarding.txt`](./docs/Onboarding.txt) — current onboarding copy

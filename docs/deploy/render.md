# Deploying the server to Render (free tier)

The two front ends are on GitHub Pages (`.github/workflows/deploy.yml`):

- coach dashboard — `https://noatzuberi.github.io/sistem/`
- trainee app — `https://noatzuberi.github.io/sistem/mobile/`

This checklist puts `apps/server` on Render so they have an API to talk to. Render reads
`render.yaml` (a Blueprint) from the repo. No secret is in the repo: you type them into Render.

## Before you start

- [ ] `render.yaml` is committed and pushed to `main` (Render reads it from GitHub).
- [ ] **Use a separate database for production.** In MongoDB Atlas the database is the name after
      the last `/` in the connection string — use a new one (for example `sistem-prod`), not your
      development one. Your development database may hold the `@sistem.dev` seed accounts, whose
      password is public (it is written in the README and in `seedDev.ts`).
- [ ] In Atlas, the database user the server will use has a long, random password and only the
      "read and write" role on that one database.

## 1. Create the service

- [ ] Sign up at <https://render.com> (sign in with GitHub is the simplest).
- [ ] **New → Blueprint** → connect the GitHub account → pick the `Sistem` repository.
- [ ] Render shows one service, `sistem-api` (Node, free, Frankfurt), and asks for the values
      marked "sync: false". Fill them in (next step), then **Apply**.

## 2. Environment variables

Type these in Render's dashboard (the service → **Environment**). Never paste them anywhere else.

| Key | Needed? | What to enter |
|---|---|---|
| `DATABASE_URL` | yes | The Atlas connection string of the **production** database. |
| `JWT_SECRET` | yes | A long random value. Make one with `openssl rand -base64 48`. The server refuses to start in production without it. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | for photos | Cloudinary → Settings → API Keys. Without them the server runs, but Daily Pump / progress / meal photos fail. |
| `RESEND_API_KEY`, `EMAIL_FROM` | optional | Password-reset email (backlog). Empty = no email is sent. |
| `DEFAULT_COACH_EMAIL` | optional | The coach new sign-ups are assigned to. Empty = the only coach, when there is exactly one. |
| `GEMINI_API_KEY`, `VOYAGE_API_KEY` | not now | The AI drafts are **off** in production (see below), so these are not read. |

If Render does not accept an empty value for an optional key, delete that key in the dashboard —
the server treats a missing key as empty.

Already set by `render.yaml` (nothing to type):

- `NODE_ENV=production`, `NODE_VERSION=22`
- `CLIENT_URL=https://noatzuberi.github.io/sistem/mobile/#` — the trainee app: invite `/join` links and
  password-reset links start with it.
- `DASHBOARD_URL=https://noatzuberi.github.io/sistem/#` — the coach dashboard: the admin's one-time
  "set password" links start with it.

  Both are **required**: in production the server refuses to start when one is missing, is not
  `https`, or points at `localhost` (no fallback — a wrong link would reach real people). The value
  is everything before the route. GitHub Pages uses hash routing, so both end with `/#`
  (a link becomes `…/sistem/mobile/#/join/ABC123`); without the `#` the links open a 404. If the
  service was created by hand rather than from the Blueprint, type these two in **Environment**.
  If the sites move (for example a custom domain), change both here.
- `CLIENT_ORIGINS=https://noatzuberi.github.io` — the only website allowed to call the API. It is
  the origin only (no `/sistem/`). If the site ever moves, change it here; several origins are
  separated by commas.
- `AI_PAID_TIER=false` — the server never calls the AI in production until this is `true`, and it
  must stay `false` while the provider is Gemini's free tier (PRD §14: no real trainee data there).
- `FEATURE_NUTRITION_RECIPES=false`, `FEATURE_WATER_TRACKING=false`
- `PORT` is given by Render itself. Do not add it.

## 3. MongoDB Atlas — let Render in

- [ ] Atlas → **Network Access** → **Add IP Address** → **Allow access from anywhere**
      (`0.0.0.0/0`) → Confirm.

Why: Render's free tier has no fixed outgoing IP address, so a single address cannot be listed.

The trade-off: the cluster now answers connection attempts from the whole internet. The only
thing protecting the data is the database user's name and password. So:

- keep that password long, random and used nowhere else;
- give that user access to the production database only;
- never put the connection string in the repo, a screenshot or a chat;
- if it ever leaks, change the password in Atlas and update `DATABASE_URL` in Render.

(A paid Render plan has fixed outgoing addresses that can be listed instead.)

## 4. First deploy

- [ ] Wait for the deploy to turn **Live** (the first build takes a few minutes).
- [ ] In **Logs** you should see `Sistem server running on port …`.
      `Failed to connect to MongoDB` means `DATABASE_URL` or step 3 is wrong.
- [ ] Copy the service URL at the top of the page — it looks like
      `https://sistem-api.onrender.com` (Render adds letters if the name is taken).
- [ ] Open `<service-url>/api/health` in a browser. Expected: `{"ok":true}`.

## 5. Point the front ends at it

- [ ] GitHub → the repository → **Settings → Secrets and variables → Actions → Variables** tab →
      **New repository variable**: name `VITE_API_URL`, value `<service-url>/api`
      (for example `https://sistem-api.onrender.com/api` — no trailing slash).
      It is a **variable**, not a secret: this address is public and ends up in the site's files.
- [ ] GitHub → **Actions → Deploy to GitHub Pages → Run workflow** (branch `main`).
      The address is built into the site, so it only changes after this run.

## 6. Demo accounts (optional)

A guest can always sign up as a trainee, but after the questionnaire she lands on the
"your plan is being built" screen. To let guests see the rest, create the demo accounts:
one coach (`coach@sistem.dev`) and two trainees (`trainee1@sistem.dev` on the waiting screen,
`trainee2@sistem.dev` with a published plan and three months of body tracking).

Run this on your own computer, from the repo root, in a new terminal window. It asks for the
values without showing them and without saving them in the shell history (zsh):

```bash
read -s "DATABASE_URL?Production DATABASE_URL: " && export DATABASE_URL && echo
read -s "SEED_PASSWORD?Password for the demo accounts (12+ characters): " && export SEED_PASSWORD && echo

npm run import:exercises                 # the exercise library the demo plan needs
npm run seed:dev -- --allow-remote       # prints the database it will write to — check the name

unset DATABASE_URL SEED_PASSWORD
```

- Check the `Database: … / <name>` line the script prints: it must be the production database.
- `SEED_PASSWORD` is yours — choose it, keep it out of the repo, and give it to guests yourself.
  Without it the script uses the public development password: never do that here.
- Accounts that already exist are left unchanged (also their password).
- `import:exercises` needs the CSV in `apps/server/data/raw/` on your computer.
- The food list is seeded too when `apps/server/data/nutrition/food-lists.json` is on your computer.

Things to know before sharing demo accounts:

- Everyone who has the password shares the same accounts and can change or delete what is in them.
- While the demo coach is the only coach, every guest who signs up is assigned to her — so anyone
  logged in as the demo coach sees those guests' names, emails and questionnaire answers.
- Photos guests upload are stored in your Cloudinary account.

## 7. Test

- [ ] `<service-url>/api/health` → `{"ok":true}`.
- [ ] Open `https://noatzuberi.github.io/sistem/mobile/` → sign up with a new email → the
      questionnaire opens. Then log out and log in again.
- [ ] Open `https://noatzuberi.github.io/sistem/` → log in as the coach → the new trainee is listed.
- [ ] If login says it could not connect: open the browser's developer tools → Network. A request
      to `api.invalid` means step 5 was skipped or the workflow was not re-run. A "CORS" error means
      `CLIENT_ORIGINS` in Render is not exactly `https://noatzuberi.github.io`.

## Cold starts (free tier)

Render puts a free service to sleep after about 15 minutes without requests. The next request
wakes it, which takes up to about a minute — the first login of the day can look stuck or fail
once. Opening `<service-url>/api/health` first wakes it up. Deploys also restart the service.
A paid instance does not sleep.

## Later changes

Every push to `main` redeploys the server (and the Pages site). To change a secret: Render →
the service → Environment → edit → Save (the service restarts).

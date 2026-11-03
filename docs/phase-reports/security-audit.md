# Security audit (2026-11-03)

## Summary
- **Posture: Good, with two items needing the owner (Needs work until they're done).** Auth, role checks,
  coach ↔ trainee scoping, private photos and token handling were already solid and well tested.
- **Top 3 risks found:**
  1. **Admin takeover through public sign-up (High, fixed).** At every server start the account whose email
     equals `ADMIN_EMAIL` gets the admin role. Sign-up is public and emails are not verified, so if `ADMIN_EMAIL`
     was set before the admin account existed, whoever registered that address first became admin on the next
     restart. Sign-up now refuses that address (answers "email taken").
  2. **Rate limits shared by everyone behind Render's proxy (High, code fixed — needs your config).** Without
     Express `trust proxy`, every visitor has the proxy's address: 20 login attempts per 15 min for the WHOLE
     app, so one person (or a bot) could lock everyone out of login. New `TRUST_PROXY` env (hop count).
  3. **Vulnerable packages (High/Critical, fixed).** `body-parser` + `qs` (server runtime DoS), `axios` +
     `follow-redirects` (apps), plus dev tools. `npm audit fix` (lockfile only, no major bumps): 12 → 2 moderate
     (both inside dev-only `nodemon`).
- Also added: security headers + no `X-Powered-By`, a JSON error handler (no stack traces, details only in the
  log), JWT algorithm pinned to HS256, a 100-char cap on the public exercise search, security event logging.

## Findings
| # | Item | Status | Sev. | Found | Done | Files |
|---|---|---|---|---|---|---|
| 1 | Hard-coded keys | Already OK | – | None in code (regex scan of HEAD + full history). | – | – |
| 2 | Env vars | Already OK | – | `.env*` ignored, `.env.example` placeholders only; `VITE_*` = API URL, app URLs, hash flag only. | Added `TRUST_PROXY` to `.env.example`. | apps/server/.env.example |
| 3 | Secrets in git history | Already OK | – | gitleaks/trufflehog not installed; manual regex scan of all 228 commits (Mongo URIs, Google/Resend/Voyage/Cloudinary/GitHub/AWS keys, private keys, JWTs, env assignments): only placeholders and a fake test URL. `CLAUDE.md` (ATLAS era) and `docs/THIRD_PARTY_CONTENT.md` are untracked now but still in old commits — no secrets in them. | – | – |
| 4 | Rotate exposed keys | N/A | – | Nothing was exposed. | – | – |
| 5 | Exposed files | Already OK | – | Pages serves only `dist/`; no source maps in builds; server serves no static files. | – | – |
| 6 | Server-side auth | Already OK | – | Every router uses `requireAuth` / `requireRole`; roles read from the DB per request. | – | – |
| 7 | Password hashing | Already OK | – | bcrypt, 12 rounds. | – | – |
| 8 | Reset links | Already OK (1 note) | Low | 32 random bytes, SHA-256 stored, 1 h, single use (conditional update), new link cancels old. Admin set-password link = 48 h (owner design). **Trainee** reset does not sign out other sessions (staff resets do). | Not changed — your decision (below). | auth.service.ts |
| 9 | Session cookies | N/A + note | Low | No cookies: JWT (7 days) in localStorage, sent as Bearer. Logout only clears the device. | Recommendation only (G). | – |
| 10 | Admin routes / IDOR | **Fixed** | High | Role checks + `loadCoachTrainee` (live coaching) correct and tested. Privilege escalation via `ADMIN_EMAIL` sign-up (see Summary). Preferences PATCH is a strict whitelist (no roles / coachId / status). | Sign-up refuses the ADMIN_EMAIL address. | auth.service.ts |
| 11 | Rate limiting | **Fixed (needs config)** | High | Limits exist on login / register / reset / set-password / join / messages, but all users share one bucket behind Render. | `trust proxy` from `TRUST_PROXY`; `rate_limited` is logged. | app.ts, config/env.ts, config/trustProxy.ts |
| 12 | Database | Needs your action | Medium | Atlas allows 0.0.0.0/0 (Render free has no fixed IP — doc'd). Couldn't check Atlas from here (and no prod access by rule). | Checklist below (H). | – |
| 13 | Injection | Already OK | – | Mongoose only; no `$where`; no regex from input (search is scored in memory); Express 5 query parser gives no nested objects; bodies validated by type before queries; ids checked with `isValidObjectId`. | – | – |
| 14 | Server validation | Already OK | – | Hand-written validators per feature (strict whitelists), not a schema library — consistent and tested. | Search length capped (public, scored per request). | exercise.validation.ts |
| 15 | XSS | Already OK | – | No `dangerouslySetInnerHTML` / `innerHTML` / `eval`. Coach payment link: https only (no `javascript:`). Emails contain no user text. | – | – |
| 16 | CSRF | N/A | – | Bearer header auth, no cookies; no GET route changes state. | – | – |
| 17 | File uploads | Already OK | – | Raw body ≤ 3 MB, JPEG/PNG/WebP by magic bytes, Cloudinary `authenticated` assets, server-made random names, re-encoded to JPG ≤ 2000 px (drops EXIF/GPS). HEIC is refused (the phone converts to JPEG first). | – | – |
| 18 | Prices / payments | N/A | – | No payment processing; the coach's payment link is display only (https validated). | – | – |
| 19 | HTTPS | Partly fixed / your action | Medium | Render and Pages are HTTPS. No HSTS before. | HSTS on the API in production. Check "Enforce HTTPS" in Pages. | securityHeaders.middleware.ts |
| 20 | CORS | Already OK | – | Exact allow-list, never `*`, no credentials. | – | – |
| 21 | Security headers | **Fixed** (API) | Medium | None set; `X-Powered-By: Express`. | CSP `default-src 'none'; frame-ancestors 'none'`, nosniff, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, Permissions-Policy, COOP, HSTS (prod). Self-written (15 lines) — no new dependency. Front ends: Pages can't set headers (see recommendations). | securityHeaders.middleware.ts, app.ts |
| 22 | Debug in prod | **Fixed** | Low | Express' default error page (HTML; stack hidden only because NODE_ENV=production). | JSON `{ code }` only (`bad_request` / `payload_too_large` / `server_error`); details logged with method + path only. | errorHandler.middleware.ts |
| 23 | Vulnerable packages | **Fixed** | High | 12 (2 critical, 5 high). | `npm audit fix`: 2 moderate left (nodemon → minimatch, dev only; the "fix" is a downgrade to nodemon 1.0.2 — not applied). | package-lock.json |
| 24 | Unused packages | Already OK | – | Server dependencies are all imported (`csv-parse` by the exercise import). Nothing to remove. | – | – |
| 25 | Security logging | **Fixed** | Medium | No auth event logs. | One JSON line per event in the Render log: `login_failed` (ip + 12-char email hash), `login_succeeded`, `password_reset_requested` / `_done`, `set_password_done`, `forbidden`, `rate_limited`, `admin_action`. Never passwords, tokens, emails, bodies. | middleware/securityLog.ts + callers |
| A | Coach ↔ trainee IDOR | Already OK | – | All `/api/coach/trainees/:traineeId/*` go through `loadCoachTrainee` (LIVE coaching with this coach → else 404); after the end only the photo-free archive. Tests exist: another coach 404, ended coaching closed out, another trainee's log / plan 404. | – | – |
| B | Private photos | Already OK | – | `authenticated` assets, 1 h `private_download_url` made after the access check, storage id never sent; magic bytes, 3 MB; re-encode strips EXIF. | – | – |
| C | Tokens | Already OK (notes) | Low | Reset / set-password: random, hashed, single use, 1 h / 48 h. Invite codes are stored plain (they are shareable links by design; personal = single use, 14 d, email-checked). Links only from CLIENT_URL / DASHBOARD_URL (https enforced in prod). | – | – |
| D | Admin role | **Fixed** | High | The env var is `ADMIN_EMAIL` (one address, not `ADMIN_EMAILS`). No role in sign-up or PATCH. Sign-up hole fixed (item 10). | – | – |
| E | Food bank | Already OK | – | `/api/admin/foods` admin only; coach edits own items, a system item edit makes her copy (tested). | – | – |
| F | Client bundle | Already OK | – | No keys, no source maps; only the API URL and public app URLs. | – | – |
| G | Auth storage | Recommendation | Low | JWT in localStorage, 7 days; no server logout. | Not migrated (as asked). | – |
| H | Atlas | Needs your action | Medium | See action items. | – | – |
| I | Gitignored data | Already OK (1 note) | Low | All listed paths ignored; `.env*`, `docs/reference`, `food-lists.json` never in history. `CLAUDE.md` + `THIRD_PARTY_CONTENT.md` are in old commits. | Cleanup plan below (not run). | – |
| J | Email | Already OK | – | Resend key server only; emails hold only fixed copy + server-built links; reset is limited per IP and per email; coach creation is admin only. | – | – |
| K | Account deletion | **Missing** | Medium | No way to delete an account (Apple requires in-app deletion for App Store apps; also privacy law). `deletePrivatePhoto` exists for it. | Not built — new feature, needs your decision. | – |
| – | Shared exercise library | Note | Low | Any coach can rename / merge / split the GLOBAL exercise families, which every coach sees. Fine while coaches are trusted and admin-created. | Not changed. | exerciseFamilies |

## Action items for you (by priority)
1. **Set `TRUST_PROXY` on Render** (service → Environment), or say "yes" and I'll add it to `render.yaml`. I didn't
   change production config. To find the right number: temporarily log `req.ip` next to `X-Forwarded-For` for one
   request; use the smallest number where `req.ip` is your own address (Render is usually `1`). Too high lets a
   client fake its address and skip the rate limits.
2. **If `ADMIN_EMAIL` is set on Render**, check in the admin dashboard (or Atlas, read-only) that the account with
   that email is really yours and was made by `create:admin`. If not: remove its admin role and tell me.
3. **Atlas (H):** separate DB users for dev and prod, each "readWrite" on ONE database only; long random
   passwords used nowhere else; 0.0.0.0/0 stays only because Render free has no fixed IP (a paid Render plan or
   an Atlas private endpoint lets you list addresses instead). Turn on Atlas alerts for failed auth.
4. **GitHub Pages:** Settings → Pages → "Enforce HTTPS" on.
5. **Decide:** should a trainee's password reset sign out her other devices (staff resets already do)? I recommend
   yes — a one-line change.
6. **Decide on account deletion (K)** before App Store submission.
7. **Log alerts:** in Render (or a log drain) alert on many `"event":"login_failed"` from one `ip`, or on one
   `emailHash`, and on any `admin_action` you didn't do.
8. **History cleanup (optional, only if the repo is or becomes public):** old commits hold the ATLAS-era
   `CLAUDE.md` and `docs/THIRD_PARTY_CONTENT.md` (no secrets). Plan, NOT run: back up the repo →
   `git filter-repo --invert-paths --path CLAUDE.md --path docs/THIRD_PARTY_CONTENT.md` on a fresh mirror clone →
   force-push all branches → everyone re-clones. It rewrites every commit id, so only if those files matter.

## Verification
| Test | Result |
|---|---|
| Full server suite (`npm test`) | 706 / 706 pass (one archive test flaked once under load — a fire-and-forget notification; passes 3/3 alone and in the re-run). i18n parity 39 / 39. |
| New `middleware/__tests__/securityHardening.test.ts` (8) | Pass: headers present + no X-Powered-By; broken JSON → 400 `{code:'bad_request'}` with no stack; 200 KB body → 413 JSON; HS512 token → 401; `alg: none` token → 401; sign-up with ADMIN_EMAIL (other case) → 409 and no account; search of 101 chars → 400; `TRUST_PROXY` parser. |
| Protected / admin routes without auth or with the wrong role | Existing tests: 401 / 403, another coach 404, suspended coach 403, ended coaching closed. |
| NoSQL / XSS payloads | Code review: inputs type-checked before every query; no HTML sinks. Existing validation tests. |
| Rate limits | Existing tests ("rate-limits requests per email", "join codes are rate-limited"). |
| Uploads | Existing tests: wrong type 415, too large 413, photo only as signed link. |
| Expired / used reset token | Existing test "a new request cancels the older link; an expired link fails" + single-use check. |
| Manipulated price | N/A (no payments). |
| `npm run lint` / `npm run build` | Pass (only the existing fast-refresh warnings). |
| Secret scan re-run on the built bundles | No keys, no `.map` files. |
| Dependency audit re-run | 2 moderate (dev only). |

## Remaining risks & recommendations
- **JWT in localStorage (G):** fine while there is no XSS (none found). For Capacitor, move it to the platform's
  secure storage (Keychain / Keystore plugin); consider shorter tokens (e.g. 1 day + refresh) and a "sign out
  everywhere" that raises `sessionVersion`. Not migrated, as asked.
- `optionalAuth` (join preview only) doesn't check `sessionVersion`; it only personalizes a public preview — low.
- **Front-end headers:** Pages can't send CSP / frame headers. A `<meta http-equiv="Content-Security-Policy">` in
  both `index.html` files is possible but must list the API, Cloudinary and fonts — worth doing with a real
  browser check, not blind.
- Login timing differs for unknown emails; sign-up already says "email taken", so it reveals nothing new.
- Invite codes stored plain: acceptable for shareable links; hash them if personal invites ever carry more access.
- The rate limiter is in memory (resets on restart; one instance). A shared store is needed with several instances.
- The global exercise library is editable by every coach (see table).

## Files changed
- Added: `apps/server/src/middleware/securityHeaders.middleware.ts`, `errorHandler.middleware.ts`, `securityLog.ts`,
  `middleware/__tests__/securityHardening.test.ts`, `apps/server/src/config/trustProxy.ts`, this report.
- Modified: `apps/server/src/app.ts`, `config/env.ts`, `middleware/auth.middleware.ts`, `optionalAuth.middleware.ts`,
  `rateLimit.middleware.ts`, `features/auth/auth.service.ts`, `auth.controller.ts`, `features/admin/admin.controller.ts`,
  `features/exercises/exercise.validation.ts`, `apps/server/.env.example`, `package-lock.json`.
- Dependencies: none added or removed; lockfile updated within existing ranges.

## Suggested commits
```bash
git add -A -- package-lock.json
git commit -m "fix(deps): npm audit fix for body-parser, qs, axios, follow-redirects and dev tools"

git add -A -- apps/server/src/features/auth/auth.service.ts
git commit -m "fix(server): public sign-up can no longer claim the ADMIN_EMAIL address"

git add -A -- apps/server/src/config/trustProxy.ts apps/server/src/config/env.ts apps/server/.env.example
git commit -m "fix(server): TRUST_PROXY so rate limits see the client address behind a proxy"

git add -A -- apps/server/src/middleware/securityHeaders.middleware.ts apps/server/src/middleware/errorHandler.middleware.ts apps/server/src/app.ts
git commit -m "feat(server): security headers, no X-Powered-By, JSON error handler without stack traces"

git add -A -- apps/server/src/middleware/optionalAuth.middleware.ts apps/server/src/features/exercises/exercise.validation.ts
git commit -m "fix(server): pin optional JWT verification to HS256 and cap the public exercise search length"

git add -A -- apps/server/src/middleware/securityLog.ts apps/server/src/middleware/auth.middleware.ts apps/server/src/middleware/rateLimit.middleware.ts apps/server/src/features/auth/auth.controller.ts apps/server/src/features/admin/admin.controller.ts
git commit -m "feat(server): HS256-only auth tokens; log auth, permission, rate-limit and admin events without personal data"

git add -A -- apps/server/src/middleware/__tests__/securityHardening.test.ts docs/phase-reports/security-audit.md
git commit -m "test(server): security hardening checks; docs: security audit report"
```

# Sign-up errors (LAN dev) · coach welcome + Settings → עזרה · one questionnaire check style

Date: 2026-11-08. Server tests 719/719, copy parity 42/42, lint + i18n + contrast audits clean, every app builds.
Screenshots: `docs/phase-reports/signup-welcome-checks/` (isolated in-memory database, not your dev DB).

## Summary
- **Sign-up cause.** Opened from Vite's Network URL, the app called the API at `localhost:5002`. On the computer CORS
  refused that origin; on a phone `localhost` is the phone itself. The page then showed the generic "ההרשמה נכשלה".
  The dev-only fix (same-origin `/api` + Vite proxy, `host: true` in both apps, LAN CORS in development only) was
  made earlier today (`dev-lan-access.md`, still uncommitted). It's included in commit 1 below. Re-checked now from
  `http://10.100.102.2:5173`: the server answers through the proxy and directly, with CORS headers for the LAN origin.
  Other checks: the server was running, validation and `email_taken` return proper codes, nothing returned 500,
  TRUST_PROXY is unset (correct locally), and the ADMIN_EMAIL guard answers like `email_taken`.
- **Specific errors** come from the server's stable codes, never its wording (`features/auth/data/authFailure.ts`).
  Field codes show under their field. Email taken shows the message plus a "להתחברות" link. A wrong password shows
  the server's localized sentence. The generic line appears only for unknown errors. Dashboard login also handles the
  rate limit. Error text and the field's error ring use a new darker cherry (no red).
- **Welcome screen** before the tour (first visit), and **Settings → עזרה → מדריך לדשבורד** replaces the old
  "סיור במערכת" card. The last step's "סיום" closes the tour with a toast.
- **Questionnaire**: every single- and multi-select now uses the same drawn check, and every selected chip uses
  Neon Pink (`--color-primary`). Logic and answers are unchanged.

## 1. Sign-up / login errors
| Case | Hebrew (DRAFT) | English (DRAFT) | Where |
|---|---|---|---|
| Email taken (`email_taken`) | כבר יש חשבון עם המייל הזה + link "להתחברות" | There is already an account with this email + "Log in" | form line |
| Rate limited (`too_many_requests`) | יותר מדי ניסיונות. נסי שוב בעוד כמה דקות | Too many attempts. Try again in a few minutes. | form line (mobile + dashboard) |
| No connection / server down | אין חיבור לשרת. בדקי את החיבור ונסי שוב. | No connection to the server. Check your connection and try again. | form line (mobile + dashboard) |
| Validation (`name_required`, `email_invalid`, `password_too_short`, `password_required`, `passwords_differ`) | the existing field messages | the existing field messages | under the field |
| Wrong email / password | the server's existing sentence | same | form line |
| Unknown | ההרשמה נכשלה. נסי שוב. / ההתחברות נכשלה. נסי שוב. | unchanged | form line |

"No connection" also covers a 5xx without the API's JSON (what the Vite proxy returns when the server is down). That
behavior comes from this morning's fix.

**Color.** Cherry Rose `#a50047` measures about 3.6:1 on the glass card over Neon Pink, below the 4.5:1 that 14px text
needs. New `--color-primary-deeper: #6b002e` (palette) measures about 4.9–5.9:1 along the gradient. It's used through
`--color-auth-error` (domains/auth.css) for field errors, the form line, and the field's error ring.

**Rate limit (local).** The limits are in memory: restarting the server resets them. With `npm run dev`, save any
server file (nodemon restarts) or type `rs` in its terminal. Through the Vite proxy every device shares one address,
so 20 sign-ins per 15 minutes ran out fast. In development only (NODE_ENV unset / `development`) the auth and join
limits are now ×10: auth 200 / 15 min, join 600 / 15 min. Production and tests keep 20 / 60.

## 2. Welcome screen + Settings → עזרה
| Key | Hebrew (DRAFT) | English (DRAFT) |
|---|---|---|
| title | היי {name}, ברוכה הבאה! | Hi {name}, welcome! |
| titleNoName | היי, ברוכה הבאה! | Hi, welcome! |
| intro | איזה כיף שאת איתנו. כאן תנהלי את המתאמנות שלך, תבני תוכניות אימון ותזונה ותעקבי אחרי ההתקדמות שלהן. | So glad you're here. This is where you manage your trainees, build workout and nutrition plans, and follow their progress. |
| offer | רוצה סיור קצר בדשבורד? זה לוקח בערך דקה. | Want a quick tour of the dashboard? It takes about a minute. |
| start | בואי נתחיל בסיור | Let's start the tour |
| later | אולי אחר כך | Maybe later |
| note | אפשר תמיד לחזור למדריך מתוך הגדרות ← עזרה | You can always come back to the guide from Settings → Help |
| close (aria) | סגירה | Close |
| finishedToast | זהו! המדריך תמיד מחכה לך בהגדרות ← עזרה | That's it! The guide is always waiting in Settings → Help |
| helpTitle / guideRow | עזרה / מדריך לדשבורד | Help / Dashboard guide |

- **Seen mark:** reuses `CoachProfile.tourCompletedAt`, so there's no schema change. "אולי אחר כך", Esc and × set it. "בואי
  נתחיל" opens step 1, and ending the tour sets it as before. Checked: after Esc a reload shows nothing.
- **Card:** the tour's scrim plus a 6px blur, white card, radius 28, padding 32, max-width 440. It shows her photo
  when she has one, else the logo mark, at 64px. The 44px title has her first name isolated in `<bdi>`. Two stacked
  52px pills: pink, and soft `#f5f3f6`. The note is 13px muted. Focus starts on "בואי נתחיל" and stays inside the card.
  Opening is scale 0.96 → 1 plus a 300ms ease-out fade; reduced motion = fade only (checked). Presses scale to 0.97.
  The tokens are in `domains/dashboard.css` (tour section).
- **Settings:** a new "עזרה" section (soft grouped list on a white panel) with one row, "מדריך לדשבורד", and a new
  `book` line icon. It starts the tour at step 1 without the welcome. The old `TourReplayCard` was deleted, not
  duplicated, and its copy keys were removed.

## 3. Questionnaire selection style
| Step | Before | After |
|---|---|---|
| Goals, Equipment, Exercise prefs, Recovery (`OptionList multi`) | drawn check, Neon Pink | unchanged |
| Q.04 Frequency, experience (`OptionList single`) | filled Neon Pink circle + white check | drawn check (still `role="radio"`) |
| Basic profile, Frequency (days 1–7, "הלו״ז שלי משתנה"), Nutrition (`SelectableChip`) | fill `--solid-pink` #d4005c (darker) | fill `--color-primary`, like the checks |
| Activities, Starting photo (`ActivityWheel`, `DeckButton`) | their own controls, not option selects | unchanged |

White on Neon Pink is 3.8:1, which the palette allows for 18px+ or bold text. The selected chip label turns bold. A
hidden bold copy reserves its width, so selecting never shifts the row. The day numbers are 18px. Chip press is now
0.97 (was 0.96).
Screenshots: `before-*.png` / `after-*.png` (Q.04 frequency, goals, basic profile, equipment).

## Verified
- From the LAN URL (WebKit, iPhone size): sign-up → `/start`, login → `/home`. Email taken (he + en; the link goes to
  `/login`), rate limit, no connection, server field error under the email field, wrong password, unknown → generic.
- Dashboard (Chromium, via the LAN URL): welcome he / en / 390px reduced motion; Esc / later set `tourCompletedAt`;
  start → step 1; last button "סיום" → toast; Settings → עזרה → tour from step 1, no welcome.
- **Not tested on a real iPhone** (no device here). Open `http://<Mac LAN IP>:5173` in Safari on the same Wi-Fi. If it
  doesn't load, allow `node` in the macOS firewall.

## Files changed
- Added: `apps/mobile/src/features/auth/data/authFailure.ts`, `apps/mobile/src/features/auth/components/AuthFormError/*`,
  `apps/dashboard/src/features/tour/components/TourWelcome/*`, `apps/dashboard/src/features/coachSettings/components/HelpSection/*`,
  this report + `signup-welcome-checks/`.
- Modified: mobile `auth/pages/{Login,Register}`, `auth/copy/{he,en}`, `AuthField.css`, `AuthScreen.css`,
  `onboarding/components/{OptionList,SelectableChip}/*`; dashboard `features/auth/pages/Login/Login.tsx`,
  `tour/hooks/{useTour.tsx,useTourKeyboard.ts}`, `TourOverlay.tsx`, `tour/copy/{he,en}`, `CoachSettingsPage.tsx`,
  `AppShell.tsx`, `Icon/iconPaths.ts`; server `middleware/rateLimit.middleware.ts`; `packages/api-client/src/authApi.ts`;
  `packages/tokens/{base/palette.css,domains/auth.css,domains/dashboard.css}`. The earlier LAN fix's files are in commit 1.
- Deleted: `apps/dashboard/src/features/tour/components/TourReplayCard/*`.

## Dependencies
None.

## Known issues / TODOs
- **Commit order matters.** Your commits 35f3d9c and 65ae2eb already include two lines from this work: the
  `tooManyAttempts` + new `noConnection` copy in `packages/shared`, and the `authErrorCode` export in api-client
  `index.ts`. HEAD now exports `authErrorCode`, which only exists in the uncommitted `authApi.ts`, so HEAD alone
  doesn't type-check. Commit 1 fixes that.
- **The dashboard never loads the Karantina font file.** Only the mobile app ships `@fontsource` faces, so on the
  dashboard every "Karantina" title (tour cards, this welcome) falls back to a system bold. The welcome uses the same
  `--font-display` token as the tour. Fixing it means adding `@fontsource/karantina` to the dashboard. It's a new
  dependency for that workspace, so it needs your OK.
- All new copy is DRAFT. The `←` in Hebrew and `→` in English point forward in each reading direction.
- `scripts/dev-phone.mjs` still sets `VITE_API_URL=/api`. That's redundant now and harmless.

## Suggested commits
1. `fix(auth): apps work from the LAN URL and show specific sign-up / login errors`
2. `feat(dashboard): welcome before the coach tour, Settings → Help guide, finish toast`
3. `fix(mobile): one selection style across the questionnaire`
4. `docs: reports for LAN access and sign-up errors / welcome / questionnaire checks`

```sh
git add -A -- apps/mobile/vite.config.ts apps/dashboard/vite.config.ts apps/mobile/src/app/config/env.ts apps/dashboard/src/app/config/env.ts apps/mobile/src/services/api/apiClient.ts apps/dashboard/src/services/api/apiClient.ts apps/mobile/src/features/auth apps/dashboard/src/features/auth/pages/Login/Login.tsx apps/server/src/config/clientOrigins.ts apps/server/src/config/__tests__/clientOrigins.test.ts apps/server/src/middleware/rateLimit.middleware.ts packages/api-client/src/authApi.ts packages/api-client/src/createApiClient.ts packages/tokens/base/palette.css packages/tokens/domains/auth.css README.md
git commit -m "fix(auth): apps work from the LAN URL and show specific sign-up / login errors"
git add -A -- apps/dashboard/src/features/tour apps/dashboard/src/features/coachSettings apps/dashboard/src/components/layout/AppShell/AppShell.tsx apps/dashboard/src/components/common/Icon/iconPaths.ts packages/tokens/domains/dashboard.css
git commit -m "feat(dashboard): welcome before the coach tour, Settings → Help guide, finish toast"
git add -A -- apps/mobile/src/features/onboarding/components/OptionList apps/mobile/src/features/onboarding/components/SelectableChip
git commit -m "fix(mobile): one selection style across the questionnaire"
git add -A -- docs/phase-reports/dev-lan-access.md docs/phase-reports/signup-welcome-checks.md docs/phase-reports/signup-welcome-checks
git commit -m "docs: reports for LAN access and sign-up errors / welcome / questionnaire checks"
```

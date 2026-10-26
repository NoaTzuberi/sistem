# Coach dashboard — forgot password + show / hide password

Date: 2026-10-26 · Scope: coach dashboard + the server endpoints it needs. Trainee app screens untouched.

## Summary

- Dashboard login has a "שכחתי סיסמה" link under the password field → `/forgot-password` (email prefilled from
  the login field) → always the same "sent" state, "שליחה שוב" after 60 s, "חזרה להתחברות".
- The emailed link opens `/reset-password?token=…` (built from `DASHBOARD_URL`): the link is checked first, then
  new password + confirm with inline rules and errors → "הסיסמה עודכנה" → login. A bad / expired / used link shows
  "הקישור לא תקף או שפג תוקפו" + "שליחת קישור חדש".
- Server: coach / admin accounts asking from the dashboard get a 60-minute, single-use dashboard link (only the
  hash stored, a new link cancels older ones). Using it signs out every older session of that account.
  Rate limits per IP and per email. The admin page has a fallback "שליחת קישור איפוס" that shows a one-time link.
- Every dashboard password field (login, reset ×2, set-password ×2) uses one `PasswordField` with an eye toggle.

## Audit — what already existed (reused)

- `POST /api/auth/forgot-password` + `/reset-password`: random 32-byte token, SHA-256 hash in
  `User.passwordResetTokenHash`, 1 h expiry, same answer for unknown emails. The link always pointed to the
  trainee app (`CLIENT_URL`). Kept as is for trainees.
- `POST /api/auth/set-password` + the admin's 48 h set-password link (same token fields).
- `authRateLimit` (20 / 15 min per IP) on every auth route.
- Email: Resend (`email.service.ts`), Hebrew / English by the user's language.
- Dashboard: Login (the "forgot" pill was built but hidden behind `FORGOT_PASSWORD_ENABLED`), SetPasswordPage.

## What changed

### Server
- `User.sessionVersion` (number, default 0) — schema addition. Every JWT now carries `sv`; `requireAuth` reads
  the user's version and refuses a token with an older one (tokens issued before this change = version 0, so
  nobody is logged out by the deploy). Cost: one `_id` lookup per authenticated request.
- `requestPasswordReset(email, app)`: `app: 'dashboard'` + a coach / admin account → `issuePasswordResetLink`
  (60 min, `DASHBOARD_URL/reset-password?token=`) + `sendDashboardResetEmail`. Anything else → the old trainee
  flow, unchanged. The email is not awaited, so the answer takes the same time for known and unknown emails.
- `consumeResetToken`: one conditional update sets the password and burns the token (two requests with one link
  can't both succeed). For coach / admin accounts it also raises `sessionVersion` (older sessions logged out).
  Used by both reset-password and set-password. Trainee accounts keep their sessions, as before.
- `POST /api/auth/reset-password/check` `{ token }` → `{ valid }` (the reset screen asks before showing the form).
- Rate limits: forgot-password = per IP (existing 20 / 15 min) + NEW per email 5 / hour (`resetEmailRateLimit`,
  email lowercased); reset-password and check = per IP. Per-email doesn't apply to reset (the request has only
  the token; tokens are 256-bit random).
- Admin fallback: `POST /api/admin/coaches/:coachId/reset-link` → `{ kind: 'reset_password', setPasswordUrl,
  expiresAt, emailSent: false }` — same token rules, never emailed, never logged. `CoachPasswordLinkResponse`
  gained `kind` (`set_password` | `reset_password`).
- Logging: tokens and links are never logged, except **development only** (`NODE_ENV=development`) when the email
  didn't go out: `[dev only] Dashboard password reset link for <email>: <link>` in the local server console.
- New email copy keys `email_dashboard_reset_*` (he + en). The trainee reset email keeps its own keys.

### Dashboard
- `features/auth/components/PasswordField` — the ONE password field: the login pill + eye toggle at the inline
  end (both directions), `type` password ↔ text, `aria-label` "הצגת הסיסמה" / "הסתרת הסיסמה" + `aria-pressed`,
  44 px hit area, a pointer press keeps the focus and caret in the input, spell check / autocorrect off.
- `hooks/usePasswordVisibility` — one per field; `hide()` after a successful submit; leaving the screen unmounts
  it (hidden again).
- `hooks/usePasswordReset` — `usePasswordResetRequest` (send, same "sent" state, 60 s cooldown) and
  `usePasswordReset` (token check, rules, inline errors, save, invalid-link state).
- `components/PasswordCard` (`pw-` classes) — the card frame for both new screens; state swaps fade in (off with
  reduced motion).
- Pages `ForgotPasswordPage` (`/forgot-password`), `ResetPasswordPage` (`/reset-password`).
- Login: forgot link (passes the typed email), `PasswordField`, email `autocomplete="username"`.
  `FORGOT_PASSWORD_ENABLED` removed.
- SetPasswordPage: both fields use `PasswordField`; hidden again after success.
- Admin CoachesPage: "שליחת קישור איפוס" per coach who already has a password; `PasswordLink` shows the reset
  title / hint for `kind: 'reset_password'`.
- api-client: `requestPasswordReset(email, app?)`, `checkResetToken`, `createResetLink`, `AuthApiError` (carries the
  server `code`; `resetPassword` throws it — still an `Error`, so the mobile app is unaffected).

## Email provider status

- Code: Resend, configured by `RESEND_API_KEY` + `EMAIL_FROM`. Without the key nothing is sent (the dashboard
  still shows "sent" — by design).
- `render.yaml` declares both `RESEND_API_KEY` and `EMAIL_FROM` with `sync: false` — their production values live
  only in the Render dashboard and **can't be verified from the repo**. Please check them there.
- Local `apps/server/.env`: `RESEND_API_KEY` is set, `EMAIL_FROM` is not → the default sender
  `onboarding@resend.dev` (Resend's test sender), which only delivers to the Resend account owner's own address.
- **Until a verified sending domain is set as `EMAIL_FROM` in production, assume reset emails do not reach
  coaches.** Use the admin fallback ("שליחת קישור איפוס" on `/admin/coaches`) and send her the link yourself.

## PLACEHOLDER copy (all drafts for the owner)

| key | he | en |
|---|---|---|
| login.forgot | שכחתי סיסמה | Forgot password? |
| passwordField.show | הצגת הסיסמה | Show password |
| passwordField.hide | הסתרת הסיסמה | Hide password |
| passwordReset.requestTitle | איפוס סיסמה | Reset password |
| passwordReset.requestText | נשלח לך קישור למייל כדי לבחור סיסמה חדשה | We'll email you a link to choose a new password |
| passwordReset.send | שליחת קישור | Send link |
| passwordReset.sending | שולחת… | Sending… |
| passwordReset.sentText | אם יש חשבון עם המייל הזה, שלחנו אליו קישור. כדאי לבדוק גם בספאם | If there's an account with this email, we sent it a link. Check your spam folder too |
| passwordReset.resend | שליחה שוב | Send again |
| passwordReset.resendIn | שליחה שוב ({seconds}) | Send again ({seconds}) |
| passwordReset.toLogin | חזרה להתחברות | Back to login |
| passwordReset.emailInvalid | צריך כתובת מייל תקינה. | Enter a valid email address. |
| passwordReset.sendFailed | לא הצלחנו לשלוח. אפשר לנסות שוב. | We couldn't send it. Try again. |
| passwordReset.resetTitle | בחירת סיסמה חדשה | Choose a new password |
| passwordReset.resetText | בחרי סיסמה חדשה לחשבון שלך. | Choose a new password for your account. |
| passwordReset.newPassword | סיסמה חדשה | New password |
| passwordReset.confirm | אימות הסיסמה | Confirm password |
| passwordReset.ruleLength | לפחות 8 תווים | At least 8 characters |
| passwordReset.ruleMatch | שתי הסיסמאות זהות | Both passwords match |
| passwordReset.tooShort | הסיסמה קצרה מדי. צריך לפחות 8 תווים. | Too short. Use at least 8 characters. |
| passwordReset.mismatch | הסיסמאות לא זהות. | The passwords don't match. |
| passwordReset.save | שמירת סיסמה חדשה | Save new password |
| passwordReset.saving | שומרת… | Saving… |
| passwordReset.saveFailed | לא הצלחנו לשמור. אפשר לנסות שוב. | We couldn't save it. Try again. |
| passwordReset.checking | בודקת את הקישור… | Checking the link… |
| passwordReset.doneTitle | הסיסמה עודכנה | Password updated |
| passwordReset.doneText | אפשר להתחבר עם הסיסמה החדשה. | You can log in with your new password. |
| passwordReset.toLoginButton | להתחברות | Log in |
| passwordReset.invalidTitle | הקישור לא תקף או שפג תוקפו | This link is invalid or has expired |
| passwordReset.invalidText | אפשר לבקש קישור חדש. הוא תקף לשעה. | Ask for a new link. It works for one hour. |
| passwordReset.newLink | שליחת קישור חדש | Send a new link |
| admin resetLink | שליחת קישור איפוס | Send reset link |
| admin resetLinkTitle | קישור לאיפוס סיסמה | Password reset link |
| admin resetLinkHint | הקישור עובד פעם אחת, עד {date}. כשהיא משתמשת בו, היא מתנתקת מכל שאר המכשירים. | The link works once, until {date}. Using it signs her out on every other device. |
| admin resetLinkCopyNote | הקישור לא נשלח במייל. צריך להעתיק ולשלוח לה אותו. | This link isn't emailed. Copy it and send it to her. |
| email_dashboard_reset_subject (server) | איפוס סיסמה ל-Sistem | Reset your Sistem password |
| email_dashboard_reset_title | איפוס סיסמה | Reset your password |
| email_dashboard_reset_body | קיבלנו בקשה לאפס את הסיסמה שלך ללוח הבקרה של Sistem. | We got a request to reset your Sistem dashboard password. |
| email_dashboard_reset_button | בחירת סיסמה חדשה | Choose a new password |
| email_dashboard_reset_expiry | הקישור תקף לשעה ולשימוש אחד. | The link works for one hour, once. |
| email_dashboard_reset_ignore | אם לא ביקשת, אפשר להתעלם. הסיסמה שלך לא תשתנה. | If you didn't ask for this, you can ignore it. Your password won't change. |

## Dependencies

None added or removed.

## How to test

Automated: `npm test` (49 + 3 files, 704 tests pass), `npm run lint` (clean, i18n + contrast audits included),
`npm run build -w @sistem/dashboard`. New: `apps/server/src/features/auth/__tests__/passwordReset.test.ts`
(same answer for unknown email, single use, sessions logged out, new link cancels the old, expired / invalid,
trainee flow unchanged, admin fallback, per-email rate limit).

Manual (`npm run dev:all`, coach `coach@sistem.dev` from `npm run seed:dev`):

- [ ] Request with an existing email and with a non-existing one → the same message.
- [ ] The email arrives (needs a working Resend key + verified sender; locally the link is printed in the server
      console when the email can't go out).
- [ ] Open the link → reset works → "הסיסמה עודכנה" → login with the new password. A second tab / browser that was
      logged in as that coach is sent to login on its next request.
- [ ] Expired link (wait 60 min, or set `passwordResetExpires` in the past), used link (open it again), invalid
      link (change one character) → "הקישור לא תקף או שפג תוקפו" + "שליחת קישור חדש".
- [ ] Resend cooldown: "שליחה שוב (60…1)", then active.
- [ ] Rate limit: the 6th request for one email within an hour → error line; another email still works.
- [ ] Admin fallback: `/admin/coaches` → "שליחת קישור איפוס" → copy the link → it works once, for 60 minutes.
- [ ] Show / hide on: login, reset (new + confirm, each separate), set-password (both). Caret stays in place;
      Tab reaches the eye; screen reader reads "הצגת הסיסמה" + pressed state. Hidden again after success.
- [ ] Password manager: login autofills (username + current-password); reset / set-password offer a strong
      new password.
- [ ] EN / LTR: switch the language toggle → all texts English, the eye at the right (inline end).
- [ ] Reduced motion: no fade / press scale.

## Known issues / TODOs

- **Production email unverified** (see above). Until then the admin fallback is the way.
- `requireAuth` now does one DB lookup per request (needed for "log out old sessions" with stateless JWTs).
- Trainee resets still keep the trainee's other sessions (task said not to change trainee behavior). Recommended
  to apply the same logout to trainees later — one line in `consumeResetToken`.
- The per-email limit also applies to the trainee app's forgot-password (5 / hour per address) — a security-only
  change, same answer for every address.
- The rate-limit store is in memory (resets on restart; one server instance today).
- The reset screen has no username field, so some password managers may save the new password without the email.
- All copy is PLACEHOLDER (table above). Not checked in a browser in this session — please run the manual list.

## Suggested commits

1. `feat(server): dashboard password reset with session logout, per-email limit and admin reset link`
   — `apps/server/src/features/users/user.model.ts`, `apps/server/src/middleware/auth.middleware.ts`,
   `apps/server/src/middleware/rateLimit.middleware.ts`, `apps/server/src/features/auth/*` (service, controller,
   routes, validation, email service, `__tests__/passwordReset.test.ts`), `apps/server/src/features/admin/*`
   (service, controller, routes), `apps/server/src/i18n/locales/{he,en}.ts`, `packages/types/src/accounts.ts`,
   `packages/api-client/src/{authApi,accountsApi,index}.ts`
2. `feat(dashboard): forgot / reset password screens, PasswordField with show / hide, admin reset link`
   — the dashboard files listed below
3. `docs: dashboard password reset report` — this file

```bash
git add -A -- apps/server/src/features/users/user.model.ts apps/server/src/middleware/auth.middleware.ts apps/server/src/middleware/rateLimit.middleware.ts apps/server/src/features/auth apps/server/src/features/admin/admin.service.ts apps/server/src/features/admin/admin.controller.ts apps/server/src/features/admin/admin.routes.ts apps/server/src/i18n/locales/he.ts apps/server/src/i18n/locales/en.ts packages/types/src/accounts.ts packages/api-client/src/authApi.ts packages/api-client/src/accountsApi.ts packages/api-client/src/index.ts
git commit -m "feat(server): dashboard password reset with session logout, per-email limit and admin reset link"
```

```bash
git add -A -- apps/dashboard/src/app/config/routes.ts apps/dashboard/src/app/router/AppRouter.tsx apps/dashboard/src/copy/he.ts apps/dashboard/src/copy/en.ts apps/dashboard/src/features/auth apps/dashboard/src/features/admin apps/dashboard/src/services/auth/authService.ts apps/dashboard/src/services/admin/adminService.ts
git commit -m "feat(dashboard): forgot / reset password screens, PasswordField with show / hide, admin reset link"
```

```bash
git add -A -- docs/phase-reports/dashboard-password-reset.md
git commit -m "docs: dashboard password reset report"
```

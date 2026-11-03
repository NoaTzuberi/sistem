# Security follow-ups (2026-11-03): TRUST_PROXY, sign-out on reset, account deletion

## Summary
- **TRUST_PROXY=1** is in `render.yaml` (sistem-api, plain value) and documented in `docs/deploy/render.md`.
- **Password reset signs out everywhere**: every reset (trainee too) raises `sessionVersion`, so all older
  tokens stop; `/auth/reset-password` now answers a fresh session (`token` + `user` + `message`). The trainee
  app signs her in and follows her app state; the dashboard signs a coach / admin in (others see the done card).
- **Account deletion**: `DELETE /api/account` (own account only — the id comes from the token; password
  re-check; 5 tries / 15 min per user). Mobile: Settings → "מחיקת חשבון" (also on the coach-mode Profile);
  dashboard: Settings page. Copy he + en (DRAFT, feminine).

## What deletion does (`features/account/account.service.ts`)
1. Checks first, nothing touched before: admin → 403; password missing → 400 / wrong → 403; a coach with any
   LIVE coaching (waiting or active) → 409 "end their coaching first".
2. Photos: every known id (profile, Daily Pump, progress + starting, meals) is destroyed, then her 4 Cloudinary
   folders are deleted by prefix (catches photos the DB lost) and listed again — anything left → 503 and
   NOTHING else is deleted, so she can retry.
3. Her live coachings end (`ended`, `endedAt`); her data is deleted: questionnaire, workout / cardio / meal /
   water logs, PRs, achievements, body metrics, own cardio + own nutrition target, memberships, her
   notifications, and the coach-side records about her (plans, nutrition plans + versions, AI drafts, messages,
   reactions, coach notifications carrying her name).
4. Coach: profile, communities (+ their memberships), invites, her own / copied foods (`scope: coach`),
   templates, recipes, training + nutrition settings, AI drafts, messages. **System foods untouched.**
5. The User document goes last → every token fails `requireAuth`. Log: `account_deleted` with the user id only.
- Kept on purpose: the ended Coaching rows (dates only). The coach's archive skips a deleted trainee and
  `/coach/archive/:id` answers 404. Plans a deleted coach wrote for ex-trainees stay with those trainees.
- An account without a password (future Google / Apple sign-in) confirms with the word "מחיקה" / "DELETE"
  (server-ready; the UI only asks for the password today).

## Files changed
- Added: `apps/server/src/features/account/` (constants, controller, routes, service, validation,
  `__tests__/accountDeletion.test.ts`), `apps/mobile/src/features/account/` (copy, `useDeleteAccount`,
  `DeleteAccountButton`, `DeleteAccountSheet`), `apps/dashboard/src/features/account/` (copy, hook,
  `DeleteAccountSection`, `DeleteAccountSheet`), this report.
- Modified: `render.yaml`, `docs/deploy/render.md`; server `app.ts`, `auth.service.ts`, `auth.controller.ts`,
  `passwordReset.test.ts`, `user.model.ts` (comment), `auth.middleware.ts` (comment), `coachTrainee.middleware.ts`,
  `rateLimit.middleware.ts`, `securityLog.ts`, `privatePhoto.service.ts`, `i18n/locales/{he,en}.ts`;
  `packages/types/src/index.ts`, `packages/api-client/src/authApi.ts`; mobile `AuthContext.tsx`, `authService.ts`,
  `ResetPassword.tsx`, auth copy (unused `resetDone` removed), `SettingsPage.tsx`, `CoachProfilePage.{tsx,css}`;
  dashboard `authService.ts`, `usePasswordReset.ts`, `CoachSettingsPage.tsx`.
- Dependencies: none.

## How to test
- `npm test` → 712 / 712 server + 41 / 41 i18n parity. New: own account only (body `userId` refused, no token
  401), wrong / missing password changes nothing, every stored photo removed incl. an orphan (others' kept),
  storage failure → 503 and nothing deleted, coaching ended, token 401 after, coach blocked while trainees are
  live, coach foods / templates gone + system food kept, admin refused, trainee reset signs out old token.
- `npm run lint`, `npm run build` → clean.
- Manual (not done in a browser here): trainee Settings → מחיקת חשבון → wrong password shows the server's
  sentence → right password → login screen; logging in again fails. Dashboard Settings as a coach with a
  trainee → "end their coaching first". Reset a password on phone A → phone B is signed out.

## Known issues / TODOs
- Deploy: after this lands, check `req.ip` once on Render (should be your address) — see render.md.
- The PRD backlog line "Delete a trainee's photos with her account" (§ backlog) is now done — update the PRD
  when convenient (not edited here).
- Copy is DRAFT (he + en) apart from your two button labels.
- No transaction (Atlas free / test DB): a failure after the photo step leaves a partial delete; running it again
  finishes it (every step is idempotent).

## Suggested commits
Run the security-audit commits (docs/phase-reports/security-audit.md) first — several files overlap.

```bash
git add -A -- render.yaml docs/deploy/render.md
git commit -m "chore(deploy): TRUST_PROXY=1 for sistem-api on Render"

git add -A -- apps/server/src/features/auth/auth.service.ts apps/server/src/features/auth/auth.controller.ts apps/server/src/features/auth/__tests__/passwordReset.test.ts apps/server/src/features/users/user.model.ts apps/server/src/middleware/auth.middleware.ts packages/api-client/src/authApi.ts packages/types/src/index.ts apps/mobile/src/services/auth/AuthContext.tsx apps/mobile/src/services/auth/authService.ts apps/mobile/src/features/auth/pages/ResetPassword/ResetPassword.tsx apps/mobile/src/features/auth/copy/he.ts apps/mobile/src/features/auth/copy/en.ts apps/dashboard/src/services/auth/authService.ts apps/dashboard/src/features/auth/hooks/usePasswordReset.ts
git commit -m "feat(auth): every password reset signs out all sessions and signs her in fresh; DELETE /account client call"

git add -A -- apps/server/src/features/account apps/server/src/app.ts apps/server/src/features/privatePhotos/privatePhoto.service.ts apps/server/src/middleware/coachTrainee.middleware.ts apps/server/src/middleware/rateLimit.middleware.ts apps/server/src/middleware/securityLog.ts apps/server/src/i18n/locales/he.ts apps/server/src/i18n/locales/en.ts
git commit -m "feat(server): DELETE /api/account removes her data and stored photos, ends coachings, refuses admins and coaches with live trainees"

git add -A -- apps/mobile/src/features/account apps/mobile/src/features/profile/pages/SettingsPage/SettingsPage.tsx apps/mobile/src/features/coach/pages/CoachProfilePage/CoachProfilePage.tsx apps/mobile/src/features/coach/pages/CoachProfilePage/CoachProfilePage.css
git commit -m "feat(mobile): delete account from Settings and the coach Profile"

git add -A -- apps/dashboard/src/features/account apps/dashboard/src/features/coachSettings/pages/CoachSettingsPage/CoachSettingsPage.tsx docs/phase-reports/security-followups.md
git commit -m "feat(dashboard): delete account from Settings; docs: security follow-ups report"
```

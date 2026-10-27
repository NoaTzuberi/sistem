# Auth screens — direction B card + full-bleed track background

## Summary
Every signed-out screen (/join, login, sign-up, forgot / reset password) and the admin-only screen share one
`AuthScreen`. The background art is UNCHANGED (owner correction): the same TrackBackground (gradient, running-track
lines, runners, entrance timeline). Only its layer sizing changed for full-bleed: fixed, top/sides 0, height 100lvh
(fills under iOS Safari's floating toolbar), and html/body take the gradient's edge color (Cherry Rose) while an auth
screen is mounted. The glass card and the old outlined buttons are gone: one solid white card, a pink primary pill and
a soft secondary pill (`AuthButton`), fields with labels above (`AuthField`), and a segmented language switch (white
thumb, spring). The join screen shows the coach (avatar ring, Karantina name, invite line), the explanation with her
first name, three steps 01–03, and the dead-link card ("הקישור לא תקף"). Home: not touched.

## Files changed
- Added: `features/auth/components/AuthButton/*`, `features/auth/hooks/useAuthThemeColor.ts` (theme-color only while an
  auth screen is open), `features/join/components/JoinCoachBlock/*`, `features/join/components/JoinSteps/*`,
  `features/join/data/joinDisplay.ts`
- Modified: `TrackBackground.css` (sizing only), `AuthScreen`, `AuthField`, `PasswordVisibilityToggle.css`, Login /
  Register / ForgotPassword / ResetPassword, `LanguageSwitch` (`variant="stage"`), JoinPage, AdminOnlyPage,
  `useJoinInvite` (signUpWithoutCoach, enterCode), auth + join copy, `packages/tokens/tokens.css` (section 16 auth
  tokens; removed the unused glass-bg / glass-bg-strong / glass-border / glass-outline)
- Deleted: `features/auth/components/AuthCard/*`, `AuthSubmitButton/*`, ForgotPassword.css, ResetPassword.css

## Dependencies
None.

## How to test
- `npm run lint` · `npm run build -w @sistem/mobile` · `npm run test:i18n` (all pass)
- `/join/<valid code>` signed out → coach block, steps, "הרשמה" / "יש לי כבר חשבון"; `/join/anything` → dead-link card.
- `/login`, `/register`, `/forgot-password`, `/reset-password?token=x` → track background + white card; switch EN ↔ HE (LTR/RTL).
- Checked in desktop Chrome: no horizontal scroll at 320 / 375 / 430 px; on auth screens html/body = Cherry Rose.
- Home: no home / styles / layout file changed by this task; on /home html stays transparent, body #fcfcfc, no
  theme-color tag, no auth rule applies.
- NOT yet checked on a real iPhone Safari (notch, home bar, keyboard on sign-up) or Android Chrome — run
  `npm run dev:phone` and check both.

## Known issues / TODOs
- Signed out, "יש לי קוד" opens the sign-up (entering a code needs an account; the first-run screen after sign-up
  offers it). Signed in it opens the coach-code screen; for coach / admin accounts it is hidden.
- Signed in on a dead link the primary button is "המשך" (no "sign up without a coach" for an existing account).
- Expired / revoked / used-up links still show their specific reason line under the new title.
- The card entrance keeps the original GSAP timeline (rise 0.7 s), not the 280 ms from the first prompt — it is one
  timeline with the track's animation, which stays as it was.
- English wording of the new lines is a draft (Hebrew lines marked `// owner`).
- Old copy key `forgotShort` and join `title` / `invitedBy` removed (unused).

## Suggested commits
1. `feat(mobile): direction B auth cards — white card, pills, segmented language switch, full-bleed track`

```
git add -A -- apps/mobile/src/components/common/LanguageSwitch apps/mobile/src/components/common/TrackBackground apps/mobile/src/features/auth apps/mobile/src/features/join packages/tokens/tokens.css docs/phase-reports/auth-screens-direction-b.md
git commit -m "feat(mobile): direction B auth cards — white card, pills, segmented language switch, full-bleed track"
```

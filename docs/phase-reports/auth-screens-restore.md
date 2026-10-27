# Auth screens — original design restored + invite window in the same language

## Summary
The direction B redesign (commit bdd76cb + the auth tokens in 0e8c6b5) is reverted. Every auth file is back to its
version in 1e25638 (identical to eada422, the last commit with the glass tokens): glass card, pill fields with icon
chips, pink submit pill with arrow, outlined "הרשמה" switch, original language switch. The four glass tokens
(--glass-bg, --glass-bg-strong, --glass-border, --glass-outline) are back in tokens.css; the unused direction-B tokens
are removed. The background art is unchanged. The /join window is now a sibling of login: the same glass card,
logo + tagline, primary pill and language switch, with a coach block at the top of the card.

## Kept from later work
- Login: show / hide password eye (next to the original "שכחתי" pill); the typed email goes to the forgot screen.
- Join logic: `useJoinInvite` signUpWithoutCoach / enterCode / canEnterCode / isSignedIn; `firstNameOf`; every state
  (sign up, join confirm, community, already coached, other coach, not a trainee, dead link, failed).
- Join copy marked "owner" (invite line, hint with the first name, dead-link title / hint / buttons). Removed: the 3-step
  copy (JoinSteps component deleted).
- White bars, nothing visible: `<html data-surface="auth">` (useAuthSurface) → html/body = --color-auth-stage (bottom
  pink), theme-color = --color-auth-stage-top; TrackBackground fixed full-bleed 100lvh; viewport-fit=cover (index.html);
  the original safe-area padding.

## Invite window (/join/<code>)
- `JoinCoachBlock`: 56px avatar (photo or initials, white ring), name in Karantina at the login title size, the invite
  line in full text color (no muted grey on glass).
- Buttons: `AuthSubmitButton` (login's pink pill) gained `type` / `onClick` / `variant`; `secondary` = the outlined pill of
  login's "הרשמה" switch, full width. The common Button with pink side bars is no longer used on auth / join screens.
- States: invite → coach block, one line, "הרשמה" + "יש לי כבר חשבון". Already coached → coach block with "את כבר
  בליווי של …" + "המשך". Dead link → "הקישור לא תקף" (login title style), "בקשי מהמאמנת קישור חדש", "הרשמה בלי מאמנת"
  (signed in: "המשך") + "יש לי קוד".

## Files changed
- Restored from 1e25638: LanguageSwitch (tsx, css), AuthScreen (+ useAuthSurface, html[data-surface] rule, optional
  title), AuthField, AuthCard, AuthSubmitButton (+ variant / type / onClick), PasswordVisibilityToggle.css, auth copy
  (forgotShort back), Login (+ eye, email state), Login.css, Register, ForgotPassword (+ .css), ResetPassword (+ .css),
  AdminOnlyPage (tsx, css).
- Rewritten: JoinPage (tsx, css), JoinCoachBlock (tsx, css). Join copy: steps removed.
- Deleted: AuthButton/*, JoinSteps/*, hooks/useAuthThemeColor.ts (→ useAuthSurface.ts).
- packages/tokens/tokens.css: glass tokens back; section 16 = stage colors + join avatar size / ring.
- docs: this report; auth-screens-direction-b.md marked superseded.

## Dependencies
None.

## How to test
- `npm run lint` · `npm run test:i18n` · `npm run build -w @sistem/mobile` (all pass).
- Checked with Playwright WebKit, iPhone 13, HE + EN: login next to the original (eada422 served from a `git archive`
  copy) matches; the only differences are the eye icon and pink html/body. Join, already coached, dead link: as above.
- Phone after deploy: open /join/<code>, /join/nope, /login; check no white bars top / bottom (clear Safari website data
  or use a Private tab).

## Known issues / TODOs
- Forgot / reset password are restored exactly as they were in 1e25638: the plain white page (AuthCard, common
  Input / Button with pink side bars), not the glass card. Moving them onto the glass card is a small follow-up —
  owner to decide.
- On iPhone SE the invite line can still wrap under the name.
- The eye button is 36px (original size) — below the 44px touch target.

## Suggested commits
1. `refactor(mobile): restore the original auth screens; invite window on the login glass card`

```
git add -A -- apps/mobile/src/components/common/LanguageSwitch apps/mobile/src/features/auth apps/mobile/src/features/join packages/tokens/tokens.css docs/phase-reports/auth-screens-restore.md docs/phase-reports/auth-screens-direction-b.md
git commit -m "refactor(mobile): restore the original auth screens; invite window on the login glass card"
git push
```

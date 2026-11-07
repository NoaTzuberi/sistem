# Design groups 4 + 5 (items 1–2) — built (2026-11-07)

## Summary
- **Language switch** (both apps): a segmented control — soft grey track + white sliding thumb on light surfaces
  (coach Profile, dashboard), white 20% track on the pink auth screen. No more cherry fill.
- **Forgot / reset password** now use the login screen (pink stage, glass card, pill fields, language switch).
  Sent state = "נשלח אלייך מייל" + the server's line + a soft "חזרה להתחברות". No / bad link = a notice with
  "בקשת קישור חדש". A successful reset still goes straight into the app, then shows the toast "הסיסמה עודכנה"
  (DRAFT, + EN) — an app-wide toast (`services/toast/appToast.ts` + `AppToast`, mounted once in AppRouter).
- **Achievements page** = the Profile board: hero, "הבא בתור" (the closest badge of up to 3 categories, bars in
  the category color), one white numbers card (workouts / volume / PRs + best streak · this week), then the badges.
  Coach mode: the Overview shows the streak card + the new numbers card (without its streak line, so nothing
  repeats); the trainee's Body tab shows the same badge board (no hero) instead of the old side-bar list.
- **Messages** (both sides): own bubbles in the stage pink `#E0005F` (`--color-profile-stage-to`, ~4.8:1 with white),
  her bubbles white with her avatar on the last of each run, day pills "היום" / "אתמול" / "יום ב׳, 3 בנוב׳", empty
  state = big avatar + name, soft composer with a pink send button; the composer stays above the iOS keyboard
  (`useKeyboardInset`). Coach list: search by trainee name, white grouped rows, an empty state with an icon.
- **Coach Profile**: ink stage + white name card (avatar, COACH, name), then grouped lists — הקישור שלי, תשלומים,
  בדשבורד (only "פתחי את הדשבורד המלא" + the note; "פרטים אישיים" and "הודעות שנשלחות עם התוכנית" left out as asked),
  הגדרות (language; the mode switch row only with both roles), התנתקות, מחיקת חשבון.
- **Audit leftovers**: no side bars left in mobile — Button (its pink side brackets), CoachIntro, PlanExerciseList
  (superset bar; the "סופרסט A" label stays), PersonalRecordList, UnlockedAchievements → rounded soft cards.
  `Button` primary = the pink pill, secondary = the soft pill (no outline anywhere). Number-only letter-spacing kept.

## Files changed
- Added: `apps/mobile/src/services/toast/appToast.ts`, `components/common/AppToast/`,
  `features/auth/components/{AuthNotice,AuthFooterLink}/`, `features/achievements/components/NextUpCard/`,
  `features/coach/components/{ProfileRow,CoachLinkRow,PaymentsRow}/`
- Deleted: `features/auth/components/AuthCard/`, `CoachDashboardLink/CoachDashboardLink.css` (→ AuthFooterLink.css),
  `features/auth/pages/ResetPassword/ResetPassword.css`, `features/achievements/components/AchievementList/`,
  `features/coach/components/{CoachLinkCard,PaymentsCard,DashboardLinkRow}/`
- Modified: LanguageSwitch, AuthScreen, AuthSubmitButton (`soft` variant, `to`), CoachDashboardLink, Forgot / Reset pages,
  auth / achievements / messages / coach copy (he + en), AchievementsTab (`showHero`, `renderMiddle`), ProgressStats,
  AchievementsPage, TraineeAchievements, MessageThread, ThreadScreen, MessageComposer, `messages/data/messageTime.ts`,
  coach MessagesPage, ThreadRow, CoachProfilePage, Button.css, CoachIntro.css, PersonalRecordList.css, PlanExerciseList,
  UnlockedAchievements.css, AppRouter; `packages/shared/src/achievementBoard.ts` (`closestBadges`);
  `packages/tokens/tokens.css` (language switch, auth notice, achievements, messages, coach profile sizes; own bubble
  color); dashboard `LanguageToggle` + `Sidebar.css`.
- Copy removed (unused now): auth `emailPlaceholder`, `newPasswordInputPlaceholder`; achievements `unlockedTitle`,
  `lockedTitle`, `unlockedOn`, `times`, `statAchievements`; coach `profile.paymentsText`.
- New copy: auth `resetSentTitle` (owner's wording), `passwordUpdated` (DRAFT); messages `today` / `yesterday`
  (approved); coach `linkRow`, `paymentsRow`, `dashboardTitle` (from the approved preview). EN = DRAFT.
- Dependencies: none.

## How to test
- `npm run lint` (oxlint + i18n audit + contrast audit — no findings), `npm run test:i18n` (41 / 41),
  `npx tsc --noEmit -p apps/mobile/tsconfig.app.json`, the dashboard's, `npm run build` — all pass.
- Forgot: /forgot-password → any email → the sent card → "חזרה להתחברות". /reset-password (no token) → the notice.
  Reset from a real emailed link → lands in the app with "הסיסמה עודכנה" (not run end to end: needs a real token).
- Profile → הישגים: hero, הבא בתור, numbers card, badges. Coach → trainee → סקירה (streak + numbers) and גוף (badges).
- Messages both sides (dev DB now has 4 test messages between coach@ and trainee2@); on an iPhone, open the keyboard.
- Coach → פרופיל; coach → הודעות → type in the search.
- Screenshots (gitignored): `docs/design-preview/screenshots/real-g45/<screen>-{before,after}.jpg`
  (achievements, messages, coach-thread, coach-messages, coach-profile, coach-overview, coach-body, coach-workouts,
  workout-log, workout-summary, workout-detail, nutrition, login, forgot, forgot-sent-after, reset, reset-invalid).

## Known issues / TODOs
- `tokens.css` carries the new tokens of every part below; it goes in the first commit (language switch).
- The coach Overview no longer shows the "8 / 28 הישגים" tile (the new numbers card has 3 numbers); the full count is
  in the Body tab's badge board. Say if it should come back.
- "הבא בתור" rule (in code, `closestBadges`): the closest badge per category, top 3 categories. The preview's sample
  picked slightly differently.
- Not changed: the join screen's outlined `AuthSubmitButton` "secondary" (not in the audit list) and the 4 dashboard
  side bars. The coach Messages row time can read "לפני דק׳ (1)" (existing `formatTimeAgo` direction issue).
- Found, not fixed (onboarding is protected): `StartingPhotoStep.css` uses `--line-height-normal`, which doesn't exist.
- Process: I ran `git mv` once by mistake (it staged a rename); I unstaged it right away with `git restore --staged`.
  The index is empty.

## Suggested commits
The previous report's commits are already in (`4bce7ee`). Order matters only for `tokens.css` (first commit).

```bash
git add -A -- packages/tokens/tokens.css apps/mobile/src/components/common/LanguageSwitch apps/mobile/src/features/auth/components/AuthScreen apps/dashboard/src/components/common/LanguageToggle apps/dashboard/src/components/layout/Sidebar/Sidebar.css
git commit -m "feat: segmented language switch with a sliding white thumb in both apps"
git add -A -- apps/mobile/src/features/auth apps/mobile/src/components/common/AppToast apps/mobile/src/services/toast apps/mobile/src/app/router/AppRouter.tsx
git commit -m "feat(mobile): forgot and reset password on the login stage, app toast after a reset"
git add -A -- apps/mobile/src/features/achievements/components/AchievementList apps/mobile/src/features/achievements/components/AchievementsTab apps/mobile/src/features/achievements/components/ProgressStats apps/mobile/src/features/achievements/components/NextUpCard apps/mobile/src/features/achievements/copy apps/mobile/src/features/achievements/pages/AchievementsPage apps/mobile/src/features/coach/components/TraineeAchievements packages/shared/src/achievementBoard.ts
git commit -m "feat(mobile): achievements page on the profile board with next up and one numbers card"
git add -A -- apps/mobile/src/features/messages apps/mobile/src/features/coach/pages/MessagesPage apps/mobile/src/features/coach/components/ThreadRow
git commit -m "feat(mobile): message bubbles with day pills and avatars, coach messages search"
git add -A -- apps/mobile/src/features/coach/pages/CoachProfilePage apps/mobile/src/features/coach/components/ProfileRow apps/mobile/src/features/coach/components/CoachLinkRow apps/mobile/src/features/coach/components/PaymentsRow apps/mobile/src/features/coach/components/CoachLinkCard apps/mobile/src/features/coach/components/PaymentsCard apps/mobile/src/features/coach/components/DashboardLinkRow apps/mobile/src/features/coach/copy
git commit -m "feat(mobile): coach profile on the stage with grouped lists"
git add -A -- apps/mobile/src/components/common/Button apps/mobile/src/features/nutrition/components/CoachIntro apps/mobile/src/features/workouts/components/PersonalRecordList apps/mobile/src/features/workouts/components/PlanExerciseList apps/mobile/src/features/achievements/components/UnlockedAchievements
git commit -m "style(mobile): pill buttons and no side bars"
git add -A -- docs/phase-reports/design-groups-4-5-build.md
git commit -m "docs: report for design groups 4 and 5 build"
```

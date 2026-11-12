# Trainee details sheet, coach notifications, calmer login (preview)

## Summary

- **1 · Trainee details (coach mode): BUILT.** Her name, her photo and the ⋯ on her page open one details sheet:
  header (72px avatar, Karantina name, status chip, "מתאמנת מ־{date}"), "פרטים אישיים", "מטרות והעדפות" (+ "לשאלון
  המלא" → Body tab, the questionnaire opens and scrolls into view), "ליווי", and "סיום ליווי" in Cherry text at the
  bottom (the existing confirm flow). Rows without data are not shown.
- **3 · Coach notifications (mobile): BUILT.** Same look and wording as the dashboard bell: 40px icon tile on the
  type's soft tint, bold title, one sub line, time ago, pink unread dot; groups היום / אתמול / מוקדם יותר; Karantina
  "התראות" + "סימון הכול כנקרא"; the dashboard's empty line. The icon / color / sub line per type now come from
  `@sistem/shared` for both apps. The dock / bell count stays in sync (same unread store as before).
- **2 · Calmer login: PREVIEW ONLY — waiting for "approved".** `docs/design-preview/login-calm.html` (gitignored):
  today vs A (simpler translucent card) vs B / B2 (no card, white pills), for login and sign-up. Nothing in the app
  changed for part 2.

## Audit (part 1)

| Field | Exists? | Source |
|---|---|---|
| Name, email, avatar, status, coaching start | yes | user / coaching (already sent) |
| Birth date → age, height, weight (starting weight) | yes | questionnaire |
| Goal, training days, experience, injuries/limitations, diet / allergies | yes | questionnaire |
| Discipline | yes, not sent before | `Coaching.discipline` → **new** `CoachTraineeDetail.discipline` |
| Multi-week position ("שבוע 2 מתוך 4") | yes, not sent before | plan block → **new** `CoachTraineeDetail.planBlock` |
| **Phone** | **no** | sign-up never collects it → no phone row and no WhatsApp action. Needs a decision (add to sign-up / onboarding?). |

- **Privacy:** unchanged access rule — `GET /coach/trainees/:id` answers only a coach with a LIVE coaching (waiting or
  active; waiting coaches need the questionnaire to build the first plan). Ended coachings use the archive endpoint,
  which got nothing new. No password / token fields are read. Copying the email goes to the clipboard only (no log).
- **Dashboard:** its trainee page already shows the email (header) and every questionnaire answer (Questionnaire tab),
  so no change there. It does not show discipline or age — say if you want them.

## Files changed

- Server: `coach/coach.service.ts` (discipline + planBlock in the detail), `plans/__tests__/planBlock.test.ts` (2 tests).
- Types: `CoachTraineeDetail.discipline`, `.planBlock`.
- Shared: `coachNotifications.ts` (`tone`, `icon`, `describeCoachNotificationSub`, `notificationDayGroup`); copy
  `coachNotifications.waitingForPlan|weekSummary` (moved from the dashboard), `coach.inbox.groupToday|groupYesterday|
  groupEarlier|now`; removed unused `coach.inbox.title|loadError`.
- Tokens: notice type colors + `--surface-notice-quiet` moved from `domains/dashboard.css` to `semantic/states.css`
  (same values); new `--color-notice-new-soft|done-soft`; coach.css `--size-coach-avatar-sheet`,
  `--radius-coach-details-group`, `--size-coach-details-tile`, `--size-coach-notice-tile|dot`.
- Dashboard: `notifications/data/notificationItems.ts` reads icon / tone / sub from shared (looks the same);
  copy keys removed (now shared).
- Mobile: new `TraineeDetailsSheet/`, `InboxRow/`, `data/traineeDetails.ts`, `hooks/useTraineeDetailsSheet.ts`,
  `hooks/useCoachInbox.ts`; changed `TraineeDetailPage`, `QuestionnaireCard`, `TraineeBody`, `CoachAvatar` (size
  `sheet`), `InboxPage` (rewritten; old styles gone), coach copy; deleted `TraineeMoreMenu/`.

## Dependencies

None.

## Copy (DRAFT, he / en)

| Key | עברית | English |
|---|---|---|
| details.open | פרטי המתאמנת | Trainee details |
| details.traineeSince | מתאמנת מ־{date} | Training since {date} |
| details.personal | פרטים אישיים | Personal details |
| details.copyEmail / copied | העתקת האימייל / האימייל הועתק | Copy the email / Email copied |
| details.age / height / startWeight | גיל / גובה / משקל התחלתי | Age / Height / Starting weight |
| details.goalsTitle | מטרות והעדפות | Goals & preferences |
| details.goal / days / experience | מטרה / ימי אימון בשבוע / ניסיון | Goal / Training days a week / Experience |
| details.limitations / nutrition | פציעות ומגבלות / הערות תזונה | Injuries & limitations / Nutrition notes |
| details.fullQuestionnaire | לשאלון המלא | Full questionnaire |
| details.coachingTitle / coachingStart | ליווי / תחילת הליווי | Coaching / Coaching started |
| details.discipline / plan | תחום / תוכנית נוכחית | Discipline / Current plan |
| details.planWeekly / planBlock / noPlan | שבועית / שבוע {week} מתוך {length} / אין תוכנית השבוע | Weekly / Week {week} of {length} / No plan this week |
| inbox.groupToday / Yesterday / Earlier | היום / אתמול / מוקדם יותר | Today / Yesterday / Earlier |
| inbox.now | עכשיו | Now |

## How to test

- `npm run lint`: clean (the 5 old warnings stay). `npm test`: 742 + 51 pass. Mobile + dashboard + server type checks clean.
- `npm run check:tokens`: lists only the 7 new tokens (the moved ones resolve to the same values).
- Phone, coach mode: trainee → tap her name / photo / ⋯ → the sheet; copy the email; "לשאלון המלא" → Body tab with the
  questionnaire open; "סיום ליווי" → the existing confirm. Today → bell → the new list; tap → her page; "סימון הכול כנקרא".

## Known issues / TODOs

- No phone in the data (see audit) → no call / WhatsApp yet.
- The dashboard's 48h-window alerts ("דורש טיפול") are made from the trainees list in the dashboard only; the mobile
  list shows the server notifications (waiting trainees are on Today already). Say if you want them in the phone too.
- Mobile read rows: white card without shadow (the dashboard's frosted panel has no equivalent on the phone page).
- English screenshots not taken: after login the coach's saved language (he) wins, and I didn't change the dev account.
- Login preview: fonts and the logo load from the running dev server (`npm run dev`).

## Screenshots

`docs/phase-reports/trainee-details-notifications/`: `details-2-*` (sheet top / bottom, 390 and 320), `detail-page-*`,
`inbox-*` (390, 320), `dashboard-bell` (unchanged look), `login-*` (before / A / B / B2, login and sign-up).
No sideways scroll and no console errors.

## Suggested commits

```
git add -A -- apps/server/src/features/coach/coach.service.ts apps/server/src/features/plans/__tests__/planBlock.test.ts packages/types/src/index.ts
git commit -m "feat(coach): trainee detail carries discipline and multi-week position"
git add -A -- packages/shared packages/tokens apps/dashboard/src/features/notifications apps/dashboard/src/features/trainees/copy
git commit -m "refactor(shared): notification icon, tone and sub line shared by both apps"
git add -A -- apps/mobile/src/features/coach/components/TraineeDetailsSheet apps/mobile/src/features/coach/components/TraineeMoreMenu apps/mobile/src/features/coach/components/CoachAvatar apps/mobile/src/features/coach/components/QuestionnaireCard apps/mobile/src/features/coach/components/TraineeBody apps/mobile/src/features/coach/data/traineeDetails.ts apps/mobile/src/features/coach/hooks/useTraineeDetailsSheet.ts apps/mobile/src/features/coach/pages/TraineeDetailPage apps/mobile/src/features/coach/copy
git commit -m "feat(mobile): trainee details sheet in coach mode"
git add -A -- apps/mobile/src/features/coach/components/InboxRow apps/mobile/src/features/coach/hooks/useCoachInbox.ts apps/mobile/src/features/coach/pages/InboxPage
git commit -m "feat(mobile): coach notifications in the dashboard style"
git add -A -- docs/phase-reports/trainee-details-notifications.md docs/phase-reports/trainee-details-notifications
git commit -m "docs: trainee details + coach notifications report with screenshots"
```

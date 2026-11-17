# Trainee details sheet, phone, coach notifications, calmer coach Today (preview)

## Summary

- **1 · Trainee details (coach mode): BUILT.** Her name, her photo and the ⋯ on her page open one details sheet:
  header (72px avatar, Karantina name, status chip, "מתאמנת מ־{date}"), "פרטים אישיים", "מטרות והעדפות" (+ "לשאלון
  המלא" → Body tab, the questionnaire opens and scrolls into view), "ליווי", and "סיום ליווי" in Cherry text at the
  bottom (the existing confirm flow). Rows without data are not shown.
- **3 · Coach notifications (mobile): BUILT.** Same look and wording as the dashboard bell: 40px icon tile on the
  type's soft tint, bold title, one sub line, time ago, pink unread dot; groups היום / אתמול / מוקדם יותר; Karantina
  "התראות" + "סימון הכול כנקרא"; the dashboard's empty line. The icon / color / sub line per type now come from
  `@sistem/shared` for both apps. The dock / bell count stays in sync (same unread store as before).
- **Phone (owner's answer 1): BUILT.** Optional phone in onboarding (basic-profile step, line "כדי שהמאמנת תוכל ליצור
  איתך קשר") and in the trainee's Settings (row → sheet: save / remove). The server checks it (Israeli local numbers
  → +972, other countries need + or 00) and stores E.164 on the User. Only she (AuthUser) and a coach with a live
  coaching (trainee detail) get it — never the trainees list or the archive. The coach sheet shows it: tap = call,
  a WhatsApp button (wa.me).
- **Dashboard (answer 2): BUILT.** The trainee header chips now start with the discipline (when set) and "גיל {age}".
- **Login preview: DISCARDED** (misunderstood). The preview files are deleted; login / sign-up were never changed.
- **Coach Today, calmer: PREVIEW ONLY — waiting for "approved".** `docs/design-preview/coach-today-calm.html`
  (gitignored): today vs A (calm) vs B (minimal), for a busy day, a quiet day and a new coach. The audit and where
  every element moves are tables in the preview. The 48-hour alerts on the phone (answer 3) are part of this screen,
  so they are built after the approval.

## Audit (part 1)

| Field | Exists? | Source |
|---|---|---|
| Name, email, avatar, status, coaching start | yes | user / coaching (already sent) |
| Birth date → age, height, weight (starting weight) | yes | questionnaire |
| Goal, training days, experience, injuries/limitations, diet / allergies | yes | questionnaire |
| Discipline | yes, not sent before | `Coaching.discipline` → **new** `CoachTraineeDetail.discipline` |
| Multi-week position ("שבוע 2 מתוך 4") | yes, not sent before | plan block → **new** `CoachTraineeDetail.planBlock` |
| Phone | added (2026-11-12) | optional, onboarding + Settings → `User.phone` (E.164) → `CoachTraineeDetail.phone` |

- **Privacy:** unchanged access rule — `GET /coach/trainees/:id` answers only a coach with a LIVE coaching (waiting or
  active; waiting coaches need the questionnaire to build the first plan). Ended coachings use the archive endpoint,
  which got nothing new. No password / token fields are read. Copying the email goes to the clipboard only (no log).
- **Dashboard:** its trainee page already showed the email and every questionnaire answer; discipline and age are now
  header chips.

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

- Phone: server `users/phone.ts` (normalizer), `user.model.ts` (`phone`), `users.validation|service|controller|routes`
  (PATCH /users/me/phone), `auth/auth.service.ts` (`AuthUser.phone`), onboarding constants / validation / service
  (field `phone` on basic_profile), i18n `phone_invalid`, `users/__tests__/phone.test.ts` (18 tests); types
  (`AuthUser.phone`, `CoachTraineeDetail.phone`, `OnboardingAnswersPayload.phone`, `UpdatePhonePayload`); api-client
  `updatePhone`; mobile onboarding (types, formState, BasicProfileStep, copy, onboardingService), profile
  (`usePhoneSetting`, `PhoneSheet/`, SettingsPage, copy, useQuestionnaire), coach sheet phone row + `whatsAppLink`.
- Age: `ageOn` moved to `@sistem/shared` format.ts (both apps); dashboard `traineeHeader.ts`, TraineeHeader, copy `ageChip`.

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

- `npm run lint`: clean (the 5 old warnings stay). `npm test`: 760 + 51 pass. Mobile + dashboard + server type checks clean.
- `npm run check:tokens`: lists only the 7 new tokens (the moved ones resolve to the same values).
- Phone, coach mode: trainee → tap her name / photo / ⋯ → the sheet; copy the email; "לשאלון המלא" → Body tab with the
  questionnaire open; "סיום ליווי" → the existing confirm. Today → bell → the new list; tap → her page; "סימון הכול כנקרא".

## Known issues / TODOs

- No phone in the data (see audit) → no call / WhatsApp yet.
- The dashboard's 48h-window alerts ("דורש טיפול") are made from the trainees list in the dashboard only; the mobile
  list shows the server notifications (waiting trainees are on Today already). Say if you want them in the phone too.
- Mobile read rows: white card without shadow (the dashboard's frosted panel has no equivalent on the phone page).
- English screenshots not taken: after login the coach's saved language (he) wins, and I didn't change the dev account.
- The phone was not screenshotted: no dev trainee has one, and I didn't write test data to the dev database.
- Today preview: the "נשארו 6 שע׳" row is mocked (no dev trainee is inside the 12-hour window right now); the quiet and new-coach "before" shots use mocked API answers in the browser only.

## Screenshots

`docs/phase-reports/trainee-details-notifications/`: `details-2-*` (sheet top / bottom, 390 and 320), `detail-page-*`,
`inbox-*` (390, 320), `dashboard-bell` (unchanged look), `today-*` (before / A / B × busy, quiet, new coach).
No sideways scroll and no console errors.

## Suggested commits

The first part of this work is already committed (b174459 … f8cf2f1). These cover the rest:

```
git add -A -- apps/server/src/features/users apps/server/src/features/auth/auth.service.ts apps/server/src/features/onboarding apps/server/src/features/coach/coach.service.ts apps/server/src/i18n packages/types/src/index.ts packages/api-client/src/authApi.ts
git commit -m "feat(users): optional trainee phone (onboarding + settings), E.164, seen only by her live coach"
git add -A -- apps/mobile/src/features/onboarding apps/mobile/src/features/profile apps/mobile/src/services/onboarding/onboardingService.ts apps/mobile/src/services/users/usersService.ts
git commit -m "feat(mobile): phone field in onboarding and settings"
git add -A -- apps/mobile/src/features/coach packages/shared/src/format.ts
git commit -m "feat(mobile): call and WhatsApp in the coach's trainee details sheet"
git add -A -- apps/dashboard/src/features/trainees
git commit -m "feat(dashboard): age and discipline in the trainee header"
git add -A -- docs/phase-reports/trainee-details-notifications.md docs/phase-reports/trainee-details-notifications
git commit -m "docs: phone, dashboard header and coach Today preview in the report"
```

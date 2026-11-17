# Coach Today, variant A ("calm") — BUILT

## Summary

The approved preview (`docs/design-preview/coach-today-calm.html`, variant A) is built in coach mode.

- **Stage:** avatar + bell, the greeting, ONE summary line, three chips.
  - The line counts only the "דורש טיפול" list ("12 מתאמנות צריכות אותך היום"); 0 → "הכול בשליטה היום".
  - Chips: active trainees · waiting for a plan · unread messages (answer 4). Each opens its list.
- **"דורש טיפול":** one action list, max 5 rows + "הכול · N" (a full-list screen `/coach/today/todo`).
  - Order: 48h windows that passed → closing within 12 hours (the dashboard's rule, now shared) → other trainees
    waiting for a plan → the attention rule (no workout / missed workouts). One row per trainee.
  - Short reasons on the phone (answer 3): "חלון 48 השעות עבר", "נשארו 6 שע׳ לתוכנית", "לא התאמנה 46 ימים".
  - One button: "בניית תוכנית" → her Workouts tab, "תוכנית חדשה" opens by itself (answer 2); "שליחת הודעה" → the
    quick message sheet.
  - Nothing to do → "הכול בשליטה" card with a Cherry check. No trainees → the invite card is the main card.
- **"פעילות אחרונה":** 4 one-line rows (who · what · when) + "לכל הפעילות" → new screen `/coach/today/activity`
  with the full feed exactly as before (days, chips, blurred photos, reactions, "הודעה", "עוד פעילות"), plus the week
  line and the old scoreboard on its stage.
- **Moved, not deleted:** the invite pill (Trainees title + Profile; Today only for a new coach), the waiting
  carousel (→ the list rows + Trainees ?filter=waiting), the attention cards (→ the list), the scoreboard and the
  week line (→ "כל הפעילות").
- **Lateness in human units, both apps:** shared `formatLateness` — "באיחור של יומיים", "באיחור של 5 שע׳",
  "באיחור של 20 דק׳"; `formatTimeLeft` uses it, so every dashboard place (bell, trainees table, trainee header,
  overview waiting list) changed at once. The countdown before the deadline keeps hours + minutes.

## Files changed

- **Shared:**
  - new `coachTodo.ts` (`buildCoachTodo`, `describeCoachTodoReason`, `describeCoachTodoSummary`, THE 48h rule
    `isPlanWindowUrgent` / `URGENT_WINDOW_HOURS`);
  - `format.ts` `formatLateness`;
  - copy `coachTodo`, `time.lateDays|lateHours|lateMinutes` (the unused `time.overdue` removed); `index.ts`.
- **Tokens:** `domains/coach.css` — Today section spacing, row, avatar, action, chip, check and invite sizes, the
  stage chip label color.
- **Dashboard:** `trainees/data/traineeFacts.ts` re-exports the shared 48h rule.
- **Mobile (coach):**
  - new `TodaySection/`, `TodoRow/`, `RecentActivity/`, `TodayChips/`, `CalmCard/`, `InviteFirstCard/`;
  - new pages `ActivityPage/`, `TodoPage/`;
  - new hooks `useCoachToday`, `useOpenNewPlanOnArrival`;
  - `TodayPage` rewritten; `TraineePlan` (opens "תוכנית חדשה" on arrival); `CoachAvatar` size `today`;
  - copy (today keys added, unused ones removed);
  - deleted `WaitingCarousel/`.
- **Mobile (app):** `routes.ts` (`COACH_ACTIVITY`, `COACH_TODO`, `OPEN_NEW_PLAN_STATE`), `AppRouter.tsx`.
- **Tests:** new `scripts/coach-today.test.ts` (in `vitest.i18n.config.mts`).

## Copy (DRAFT)

| Key | עברית | English |
|---|---|---|
| coachTodo.summary | {count} מתאמנות צריכות אותך היום (אחת: מתאמנת אחת צריכה אותך היום) | {count} trainees need you today |
| coachTodo.summaryNone | הכול בשליטה היום | All under control today |
| coachTodo.title | דורש טיפול | Needs you |
| coachTodo reasons | חלון 48 השעות עבר · נשארו {time} לתוכנית · מחכה לתוכנית · לא התאמנה {n} ימים · דילגה על {n} אימונים השבוע | 48-hour window passed · {time} left for her plan · Waiting for a plan · No workout for {n} days · Skipped {n} workouts this week |
| coachTodo buttons | בניית תוכנית · שליחת הודעה | Build plan · Send message |
| time.late* | באיחור של יום / יומיים / {n} ימים · שעה / שעתיים / {n} שע׳ · דקה / 2 דק׳ / {n} דק׳ | Overdue by 1 day / {n} days … |
| today chips | פעילות · מחכות לתוכנית · הודעות | active · waiting · messages |
| today sections | הכול · {count} · פעילות אחרונה · לכל הפעילות · כל הפעילות | All · {count} · Recent activity · All activity |
| calm card | הכול בשליטה / אין מתאמנות שמחכות לך | All under control / No one is waiting on you |
| invite card | הזמיני את המתאמנת הראשונה / שלחי לה את הקישור שלך, והיא תופיע כאן / שליחת קישור הזמנה | Invite your first trainee / … / Send invite link |

## How to test

- `npm run lint`: clean (the 5 old warnings stay). `npm test`: 760 + 55 pass. Type checks clean.
- `npm run check:tokens`: lists only the 9 new coach tokens.
- **Phone, coach mode:**
  - Today: the summary number = the rows in "דורש טיפול";
  - "בניית תוכנית" → her Workouts tab with "תוכנית חדשה" open; "שליחת הודעה" → the sheet;
  - "הכול · N" → the whole list; "לכל הפעילות" → the full feed with reactions.
- **Dashboard:** bell / trainees table → "באיחור של 33 ימים" (no more "796 שע׳ 48 דק׳").

## Known issues / TODOs

- At 320px the reason can be cut with "…" next to the button (one line by design).
- A new coach's stage shows only the greeting (the invite card says the rest); the preview's "בואי נתחיל" line was left out — say if you want it.
- Trainees who joined but haven't finished the questionnaire are not in "דורש טיפול" (no plan can be built yet); they are on Trainees.
- Screenshots: busy = the real dev data; quiet and new coach = API answers mocked in the browser only. No dev trainee is inside the 12-hour window right now, so a "נשארו … לתוכנית" row isn't in the real screenshots (the shared tests cover it).

## Screenshots

`docs/phase-reports/coach-today-calm/`:

- `before-*`: the old screen;
- `after-busy-390` (+ `-full`) and `after-busy-320`;
- `after-quiet-390`, `after-new-390`;
- `after-todo` (the full list), `after-activity` (the full feed);
- `after-build-plan`: "בניית תוכנית" landed on her Workouts tab with "תוכנית חדשה" open;
- `dashboard-bell-lateness`: "באיחור של 33 ימים".

No sideways scroll and no console errors.

## Suggested commits

These also cover the earlier round (phone, dashboard header), which isn't committed yet.

```
git add -A -- apps/server/src/features/users apps/server/src/features/auth/auth.service.ts apps/server/src/features/onboarding apps/server/src/features/coach/coach.service.ts apps/server/src/i18n packages/types/src/index.ts packages/api-client/src/authApi.ts
git commit -m "feat(users): optional trainee phone (onboarding + settings), E.164, seen only by her live coach"
git add -A -- packages/shared packages/tokens scripts/coach-today.test.ts vitest.i18n.config.mts
git commit -m "feat(shared): coach to-do list, shared 48h rule, lateness in human units, age helper"
git add -A -- apps/dashboard/src/features/trainees
git commit -m "feat(dashboard): age and discipline in the trainee header; shared 48h rule"
git add -A -- apps/mobile/src/features/onboarding apps/mobile/src/features/profile apps/mobile/src/services/onboarding/onboardingService.ts apps/mobile/src/services/users/usersService.ts
git commit -m "feat(mobile): phone field in onboarding and settings"
git add -A -- apps/mobile/src/features/coach apps/mobile/src/app
git commit -m "feat(mobile): calm coach Today (to-do list, recent activity, all-activity screen) and call / WhatsApp in the details sheet"
git add -A -- docs/phase-reports/coach-today-calm.md docs/phase-reports/coach-today-calm docs/phase-reports/trainee-details-notifications.md docs/phase-reports/trainee-details-notifications
git commit -m "docs: coach Today, phone and dashboard header reports with screenshots"
```

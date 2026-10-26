# Coach app — Phase A (shell, Today, Trainees, Trainee detail, Profile, mode switch)

Date: 2026-10-26. Spec: docs/design/coach-app.html. Server tests 675/675 (new: `coach/__tests__/coachMode.test.ts`,
`users/__tests__/appMode.test.ts`, extra cases in `auth/__tests__/roles.test.ts`), copy parity 38/38, lint + i18n + contrast
audits clean, every app builds. Screenshots were taken against a throwaway in-memory database (seed:dev) on separate ports.
The dev DB was not touched.

## Summary
- **Mode switch**: `User.preferences.appMode` (coach | trainee). Only someone with BOTH the coach and the trainee role
  sees it (coach Profile + trainee Settings). The server refuses a side her roles don't allow (403
  `app_mode_not_allowed`). The default is coach, and appState follows the switch at once, on every device.
- **Coach shell**: an ink stage with faint grid lines and a pink → purple accent bar, on the page surface with white
  cards. The dock is היום / מתאמנות / פרופיל, using the same dock component and motion as the trainee app. The
  notifications inbox moved behind the bell.
- **Today**: greeting by time of day, a mono line `COACH · MON 26.10 · WK44`, a 3-number scoreboard (each opens the
  filtered list), the waiting carousel, and the activity feed grouped by day. The feed has amber attention cards on top
  of today, blurred photos, PR chips and paging. There is an empty state for a new coach.
- **Trainees**: search, filter chips with counts (preset by `?filter=`), and rows with the sub line, week pips and a
  status tag.
- **Trainee detail (read)**: ink stage (back, `TRAINEE · WKnn`, avatar, since / split / per week), 2 quick actions,
  sticky spring tabs סקירה / אימונים / תזונה / גוף.
- **Profile**: her link card (copy), payments status (עריכה → dashboard), the mode switch, settings, log-out and the
  "בדשבורד" note.

## Decisions taken (please check)
- **Attention rule** (`apps/server/src/features/coach/coachAttention.ts`, `ATTENTION_CONFIG`). It applies to an
  ACTIVE coaching (she has had a published plan) when either:
  - she has no completed workout (strength, free or cardio) for **5+ days**. The days count from the later of her last
    workout and the first day of her first published plan's week, so a brand-new plan is not flagged; or
  - she has **2+ missed** dated workouts this week.
  When both apply, "no workout" wins. Waiting / new trainees are never flagged.
- **Activity feed = built on read** from the existing collections (`coachActivity.service.ts`). No event store was
  needed.
  - Sources: completed workout logs, Daily Pump (on the log), cardio logs, meal photos (one item per day), progress
    photos (one item per day), body days (weight / measurements; the one notable change = the biggest move vs her
    previous entry), and coachings (joined).
  - Scope: her LIVE coachings only. Trainee-owned records count from the moment she joined this coach.
  - Paging: each source returns its newest `limit` rows; the merge never reads below a full source's last row.
  - Known limit: two events at the same millisecond on a page edge could hide one.
  - A body day whose last change was only a photo does not count as "measurements updated".
- **"התאמנו השבוע"** = active coachings with ≥1 completed workout this week (her zone; plan, free or cardio) /
  active coachings. **"מחכות"** = coachings in `waiting`. **"פעילות"** = coachings in `active`.
- **Weeks**: Today = calendar week (Sunday start, week 1 holds 1 January, coach's zone). Trainee = "שבוע N" from her
  first published plan's week; hidden before one. Plans have no name: the split label shows only when the plan has one.
- **Trainee colors** (avatar, pips): picked from her id among pink / purple / blue / Cherry. Orange is left out because
  white initials on it fail contrast. Week lanes keep the workout colors by plan order, as in her app.
- **Amber text**: the spec's `#8A4A00` is brown. I used THE orange ink (`--ink-orange`, the owner's "no brown" rule)
  through one token, `--color-coach-amber-ink`. The amber card's main line is ink, for contrast.
- **Old tab links**: `?tab=logs|plan|tracking|onboarding|achievements` still open the matching new tab
  (`traineeTabOf`).
- **Achievements**: the overview shows the streak + numbers; the full achievement list moved to גוף (PRD §6 keeps
  achievements on the trainee screen).

## Phase A placeholders (filled in Phase B)
- "+ הזמנה" opens her Profile link card. The invite sheet + QR come in Phase B.
- The "הודעה" action and the message buttons on feed items are hidden. The attention card has no "שליחת הודעה" yet,
  and a tap opens her screen.
- "עריכה קלה" is not shown. The Workouts tab keeps the existing light actions (publish a draft, duplicate last week +
  publish).
- No reactions yet.

## Files
**Server**
- Added:
  - `features/users/appMode.ts`, `features/users/__tests__/appMode.test.ts`
  - `features/coach/coachAttention.ts`, `coachToday.service.ts`, `coachActivity.service.ts`, `coach.validation.ts`
  - `features/coach/__tests__/coachMode.test.ts`
- Modified:
  - `features/users/{user.model,appState.service,users.service,users.validation,users.controller}.ts`
  - `features/auth/auth.service.ts`, `features/auth/__tests__/roles.test.ts`
  - `features/coach/{coach.service,coach.controller,coach.routes}.ts`
  - `i18n/locales/{he,en}.ts` (app_mode_invalid, app_mode_not_allowed, activity_before_invalid, activity_limit_invalid)

**Packages**
- `types/src/index.ts`: AppMode, AuthUser.appMode / canSwitchAppMode, UpdatePreferencesPayload.appMode;
  CoachTraineeSummary + thisWeek / coachingWeek / lastCompletedAt / attention; CoachTodayResponse; CoachActivity*
- `api-client/src/coachApi.ts`: getCoachToday, getCoachActivity
- `tokens/tokens.css`: section 17, coach mode

**Mobile**
- Modified:
  - `app/config/{routes,tabs}.ts`, `app/router/{AppRouter,landingPath}.ts(x)`
  - `components/layout/AppDock/AppDock.tsx`
  - `copy/{he,en}.ts` (tabs.today, eyebrows)
  - `services/auth/appRole.ts`, `services/coach/coachService.ts`
  - `features/profile/pages/SettingsPage/SettingsPage.tsx`
- Rewritten: `features/coach/pages/{TraineesPage,TraineeDetailPage,CoachProfilePage}`, `features/coach/data/traineeTabs.ts`
- Changed: `features/coach/pages/InboxPage` (a back link), `features/coach/components/WorkoutLogList` (paging),
  `features/coach/components/TraineeAchievements` (compact)
- Added:
  - Page: `features/coach/pages/TodayPage`
  - Data: `data/{coachMode,activityDisplay,dashboardLinks,loggedWorkouts}.ts`
  - Hooks: `hooks/{useActivityFeed,useTraineeWorkouts}.ts`
  - Components: ActivityFeed, ActivityItem, BodyScoreboard, CoachAvatar, CoachCard, CoachLinkCard, CoachScreen,
    CoachStage, DeskNote, FilterChips, InvitePill, LastWorkouts, LockLine, ModeSwitch, NameInSentence, NutritionDay,
    PaymentsCard, PortionBars, QuestionnaireCard, StageScoreboard, TraineeBody, TraineeNutritionTab, TraineeOverview,
    TraineeRow, TraineeWorkouts, WaitingCarousel, WeekLanes, WeekPips
- Deleted: `features/coach/components/{TraineeStatusBadges,TraineeTracking}` (replaced)

**Dependencies**: none added or removed.

## How to test
- `npm test`, `npm run lint`, `npm run build`.
- `npm run seed:dev` (dev DB) → log in as coach@sistem.dev:
  - Today: stage, numbers → each opens the list filtered; waiting carousel → detail; feed items → the right tab;
    bell → inbox → back.
  - Trainees: search, chips, `?filter=` from Today.
  - Detail: each tab; publish / duplicate in אימונים; the nutrition day picker + week arrows; גוף questionnaire
    פתיחה.
  - Profile: copy link (toast), payments status, עריכה (needs `VITE_COACH_DASHBOARD_URL`; for a hash-routed dashboard
    end it with `#`).
- Mode switch: give a coach the trainee role too (`roles: ['coach','trainee']`) → Profile shows the switch → trainee
  side → Settings shows it → back. On another device / a reload it stays.
- English (LTR mirror), iPhone SE + Pro Max widths, reduced motion (the tab thumb has no spring).

## Known issues / TODOs
- **The working tree holds other uncommitted work** that is not this task: mobile auth / join / workouts screens,
  LanguageSwitch, TrackBackground, AppShell.css, and the removed glass tokens in `tokens.css`. `tokens.css` now mixes
  both. Commit that work separately (or together, knowingly).
- Relative times read "לפני דק׳ (1)": that is the shared `formatTimeAgo` Intl output, not new code. Worth a look on
  its own.
- The full log in אימונים is the strength log (expandable, with Daily Pump); cardio runs are in their own card.
- Photos in the feed use 1-hour signed links; an expired thumbnail is hidden until the feed reloads (it reloads when the
  app is focused).
- The scoreboard and list need no push yet: Today refreshes on window focus.
- PLACEHOLDER / DRAFT copy is marked `// DRAFT` in `features/coach/copy/he.ts`. The greetings other than "בוקר טוב",
  the pump / progress / join-without-questionnaire / missed-workouts lines, and the empty / error lines are drafts.

## Suggested commits (never includes CLAUDE.md)
Note: `packages/tokens/tokens.css` also holds the other session's glass-token removal. Review its diff before the
third commit.

```bash
git add -A -- apps/server/src/features/users/appMode.ts apps/server/src/features/users/__tests__/appMode.test.ts apps/server/src/features/users/user.model.ts apps/server/src/features/users/appState.service.ts apps/server/src/features/users/users.service.ts apps/server/src/features/users/users.validation.ts apps/server/src/features/users/users.controller.ts apps/server/src/features/auth/auth.service.ts apps/server/src/features/auth/__tests__/roles.test.ts
git commit -m "feat(server): app mode switch for users who are both coach and trainee"

git add -A -- apps/server/src/features/coach apps/server/src/i18n/locales/he.ts apps/server/src/i18n/locales/en.ts packages/types/src/index.ts packages/api-client/src/coachApi.ts
git commit -m "feat(server): coach mode Today, activity feed and attention rule"

git add -A -- packages/tokens/tokens.css apps/mobile/src/app/config/routes.ts apps/mobile/src/app/config/tabs.ts apps/mobile/src/app/router/AppRouter.tsx apps/mobile/src/app/router/landingPath.ts apps/mobile/src/components/layout/AppDock/AppDock.tsx apps/mobile/src/copy/he.ts apps/mobile/src/copy/en.ts apps/mobile/src/services/auth/appRole.ts apps/mobile/src/services/coach/coachService.ts apps/mobile/src/features/coach apps/mobile/src/features/profile/pages/SettingsPage/SettingsPage.tsx
git commit -m "feat(mobile): coach mode redesign — Today, trainees, trainee detail, profile, mode switch"

git add -A -- docs/phase-reports/coach-app-phase-a.md docs/design/coach-app.html
git commit -m "docs: coach app phase A report and design spec"
```

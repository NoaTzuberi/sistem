# Design audit — screens still in the old style (2026-11-03, report only, no code changed)

## Method
- Grep of every `.css` in apps/mobile + apps/dashboard for the signals (cherry fills, outlines / side bars, radius < 12,
  glass, hard-coded colors, fonts, letter-spacing, `transition: all`).
- Playwright screenshots of 30 mobile screens (iPhone 14, 390×844, he) and 14 dashboard screens (1440px) with the dev
  seed accounts (read-only visits); only the flagged ones are kept in `design-audit/` (iPhone, full page — the dock
  shows mid-page in a full-page shot, that is the capture, not a bug).
- Clean everywhere (grep): no hard-coded colors, no non-token fonts, no green / gold / brown, no `transition: all`.
- **Dashboard: nothing flagged** — every screen (overview, trainees, trainee, plan builder, nutrition builder, stats,
  food lists, templates, nutrition settings, exercise library, settings, login, reset) uses the current style.
- Not captured (need a state or a side effect): onboarding (protected), waiting, first run / join, the workout
  player / session, cardio player, reset-password with a live link.

## Findings (trainee daily flows first)

| # | Screen (route) | Files | Signals | Severity | Shot |
|---|---|---|---|---|---|
| 1 | Workout detail `/workouts/plan/:planId/:workoutId` | `workouts/pages/WorkoutDetailPage` | small outlined rectangle tag ("התחלה"); plain divider list, no cards | clearly old | m-03 |
| 2 | Workout log `/workouts/logs/:logId` | `workouts/pages/WorkoutLogPage` | grey square stat tiles, outlined rectangle "הוספת סיכום", dashed rectangle, plain list | clearly old | m-04 |
| 3 | Interval timer `/timer` | `workouts/pages/IntervalTimerPage` | square grey ± steppers, "התחלה" button with side bars, letter-spaced label | clearly old | m-19 |
| 4 | Weight `/profile/weight` | `profile/pages/WeightPage`, `bodyTracking/TrendChart`, `RangePicker`, `WeightHistory` | outlined "+ תיעוד" rectangle, cherry-filled rectangular range tabs, bare chart, plain list | clearly old | m-10 |
| 5 | Log measurements `/profile/measurements/log` | `profile/pages/MeasurementsLogPage` | grey square inputs, "שמירה" with pink side bars, white page (not the soft surface) | looks broken | m-12 |
| 6 | Photo compare `/profile/photos/compare` | `bodyTracking/PhotoCompare` | cherry-filled rectangular tabs with side borders | clearly old | m-14 |
| 7 | Achievements page `/profile/achievements` | `achievements/pages/AchievementsPage`, `ProgressStats`, `AchievementList`, `StreakSummary` | grey square tiles, pink rows with a side bar, letter-spaced Hebrew labels (0.08em) | clearly old | m-17 |
| 8 | Trainee messages `/home/messages` | `messages/pages/MessagesPage` | plain white page, grey send button | minor | m-18 |
| 9 | Forgot / reset password `/forgot-password`, `/reset-password` | `auth/pages/ForgotPassword`, `ResetPassword` | grey rectangle input, side-bar button, square cherry language switch, old logo block — doesn't match login | clearly old | m-42 |
| 10 | Login / sign-up `/login`, `/register` | `components/common/LanguageSwitch` | the glass card is the designed auth look (kept); only the language switch is a cherry-filled rectangle | minor | m-40 |
| 11 | Sub-screens on the soft surface (Settings, Photos, Questionnaire, Measurements…) | `AppShell.css` (`.app-shell-bleed` scrim = white) | a white band behind the dock over the #F6F4F7 page | minor | m-13, m-15 |
| 12 | Coach: trainee → Workouts tab `/coach/trainees/:id?tab=workouts` | `coach/components/TraineePlan`, `WorkoutLogList` | grey rectangular plan rows, "פרסום התוכנית" with side bars, rectangle status chips | clearly old | m-34 |
| 13 | Coach: trainee → Nutrition tab `?tab=nutrition` | `nutrition/NutritionPlanView`, `DayTotals`, `MealCard` | outlined rectangular portion boxes, pink side bars, letter-spaced Hebrew title | clearly old | m-35 |
| 14 | Coach: trainee → Body tab `?tab=body` | `coach/TraineeBodyTracking` → `TrendChart`, `MeasurementPicker`, `MeasurementHistory` | cherry-filled rectangular tabs + picker, bare charts, plain lists | clearly old | m-36 |
| 15 | Coach: trainee → Overview | `achievements/ProgressStats` (shared with #7) | grey square stat tiles under the new cards | minor | m-33 |
| 16 | Coach Profile `/coach/profile` | `CoachProfilePage`, `LanguageSwitch`, `DashboardLinkRow`, `LogoutButton` | cherry rectangle language switch, outlined rectangular rows / logout | clearly old | m-38 |
| 17 | Coach inbox `/coach/today/inbox` | `coach/pages/InboxPage` | plain divider list on white (no cards / soft surface) | minor | m-31 |

Also found (no screen): the old trainee exercise library (`features/exercises`: `ExerciseCard`, `ExerciseDetailPage`,
`ExerciseFilters`, `FilterChip`, `GlassCard`) is unreachable — `/exercises` redirects to Home (owner decision: no trainee
library). It holds most of the glass / small-radius / letter-spacing hits; delete rather than redesign.
Dashboard raw letter-spacing to check when touched: `InviteSheet.css` 0.08em, `SettingsLivePreview.css` 0.04em,
`CardioEditor.css` 1.2px (look like Latin / mono labels).

## Suggested fix order (one prompt each)
1. **Workout flow:** workout detail (#1), workout log (#2), interval timer (#3).
2. **Body tracking:** weight screen (#4, reuse the new `meas-` hero / chart / chips), log measurements form (#5),
   photo compare tabs (#6); then retire `TrendChart` + `RangePicker`.
3. **Coach trainee tabs:** body tab (#14, same `meas-` parts), workouts tab (#12), nutrition tab (#13), overview tiles (#15).
4. **Achievements + auth:** achievements page (#7, also fixes #15's tiles), forgot / reset password (#9),
   `LanguageSwitch` (#10, also used by #16), trainee messages (#8).
5. **Polish + cleanup:** coach Profile (#16), coach inbox (#17), dock scrim colour on the soft surface (#11),
   letter-spacing on Hebrew labels, delete the dead `features/exercises` screens.

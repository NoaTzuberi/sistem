# Design — Trainee Workouts screen ("training OS", like Home B)

Reference: `docs/design/trainee-workouts.html`.

## Summary

- The Workouts tab is rebuilt as a native-style screen: sticky large title on frosted white, a segmented control
  "התוכנית / היסטוריה" with a sliding thumb (tab kept in the URL: `/workouts?tab=history`; switching scrolls to the top
  and fades the content in with an 8px rise).
- **Plan tab**: week header with one pip per workout, the ink "up next" card (start / resume = the existing start flow +
  conflict modal), a snapping ticket carousel, next week (locked, or its first workout once published), and bottom
  sheets for the workout preview. **History tab**: summary numbers, month calendar (day tap filters the log),
  filter chips, the log grouped by plan week, paged by month (infinite scroll).
- **Free workout** is NOT supported by the server. Its UI is built (header pill, entry card, sheet with the three
  options and the muscle picker) but hidden behind `VITE_FEATURE_FREE_WORKOUT` (off by default). The minimal server
  change is proposed below and **waits for your approval** — nothing was built on the server.
- AppDock and the tab depth transition are unchanged (the screen uses `AppShell bleed` like Home). No new dependency.

## Free workout — proposed server change (please approve before I build it)

Today a workout log always belongs to a plan workout (`WorkoutLog.planId` / `workoutId` required; start refuses
anything outside this week's published plan, and refuses a workout already done).

Minimal change:
1. **Model** `WorkoutLog`: `source: 'plan' | 'free'` (default `'plan'`); `planId` / `workoutId` required only when
   `source = 'plan'`; a free log stores its own exercise list `freeExercises: [{ id, exerciseId, sets, reps?,
   durationSec?, targetWeight? }]` so the session screen can build its `workout` from it (same shape as a plan workout).
2. **API** (trainee):
   - `POST /api/workout-logs/free` `{ mode: 'scratch' }` | `{ mode: 'repeat', fromLogId }` (copies that log's
     exercises and last weights) | `{ mode: 'muscle', muscles: MuscleFocusId[] }` (server picks 4–6 primary exercises
     for those muscles and her equipment, reusing `trainingSplits/traineeExerciseAccess.ts`) → the usual
     `{ session, resumed }`; same "one open workout" rule (409 `other_workout_active`).
   - `POST /api/workout-logs/:id/exercises` `{ exerciseId }` — add an exercise during a free session (scratch mode),
     plus a trainee exercise search (facts only, primaries, her equipment) for the picker.
   - `source` sent on every log (`WorkoutLog.source` in `@sistem/types`).
3. **Coach**: her log lists (dashboard + coach mode) already read every log — they get a "Free" tag from `source`.
4. **Decisions for you**: does a free workout count for streaks / "workout completed" achievements / the
   `workout.completed` notification to the coach? (My suggestion: counts for total workouts and PRs, not for the
   plan-based streak; the coach gets the same notification.)

Client side already written against this proposal: `data/freeWorkout.ts` (flag, payload type, `isFreeLog`),
`services/workoutLogs/freeWorkoutService.ts` (`POST /workout-logs/free`), `hooks/useFreeWorkout.ts`. With the flag on,
"Start" returns the normal start error until the endpoint exists. The "repeat a done workout" button ("לעשות שוב")
belongs to the same change — today the preview of a done workout opens what she logged instead.

## What is shown, and from where

| Part | Source |
|---|---|
| Week header, pips, up next, tickets, statuses | `GET /plans/week` (statuses, `nextWorkoutId`, `isToday`, `inProgress`, `activeLog`) |
| Up-next facts | exercise count, total sets (`resolvedSets`), first 3 exercises (`describeSetsShort`, new shared helper) |
| Next week | `GET /plans` (`nextWeekStartDate` + its published plan) |
| Preview sheet | the plan workout; weight = first working set's target, "משקל גוף" when the exercise's equipment is bodyweight / none |
| History summary | completed logs: count, count in her current month, sum of `stats.prCount` |
| Calendar / log | `GET /workout-logs` (completed only) — date + time in her stored time zone; color = the workout's place in its plan (via `GET /plans`); partial = a finished log with sets not done; rating = `rating`; minutes = `stats.durationSec` |

## Hidden — no data source

- "שבוע N" (no plan week number — the header reads "השבוע") and "פורסם ע״י [coach]" / the coach's name (trainee
  APIs don't send it; the lock text reads "המאמנת שלך מכינה אותו…").
- "~minutes" everywhere (plans have no duration).
- The "no plan" empty state can't link to the waiting screen: `/waiting` is only reachable in the `waiting` app state
  and redirects a trainee who already has a plan. It shows the existing "no plan this week" line.
- Everything free-workout (pill, entry card, sheet, "חופשיים" filter, free tag / outline) until the server change.
- "לעשות שוב" (repeat a done workout) — see above.
- The reference's "החליקי ←" swipe hint (decoration with a fixed arrow direction).

## Decisions I made (please confirm)

- Ticket letters A/B/C… = the workout's place in the plan (decoration, like the identity colors).
- A log of a workout that is no longer in any of her published plans gets an ink bar / ink calendar day.
- The calendar always shows every workout; the filter chips act on the log only. A day tap filters the log (tap again
  or "הצגת כל החודש" clears); "this month" = her current month even when the calendar shows another one.
- History paging is client-side (the endpoint returns all logs); scrolling to the end adds the next older month that
  has workouts. A server-side `?month=` can come later if the list grows.
- The old "past weeks" plan sections are gone — past weeks live in History (their missed workouts are not listed).
- The workout identity color classes moved from `HomeScreen.css` to `src/styles/workoutColors.css` (shared by Home and
  Workouts, + `--workout-color-soft`); the Workout name display face is one global class `.display-name`.
- BottomSheet: the grab handle is also the close button (tap / Enter); drag past 90px or a flick closes. Reduced
  motion = a fade instead of the slide.
- EN strings are my draft translations; HE strings are from the brief (DRAFT like the rest).

## Files changed

Added
- `apps/mobile/src/components/common/BottomSheet/` (`.tsx` + `.css`), `apps/mobile/src/hooks/useBottomSheet.ts`
- `apps/mobile/src/features/workouts/components/` — `WorkoutsScreen`, `LargeTitleHeader`, `SegmentedTabs`, `WeekHeader`,
  `UpNextCard`, `WorkoutTicketCarousel`, `WorkoutTicket`, `NextWeekLock`, `FreeWorkoutEntry`, `WorkoutPreviewSheet`,
  `FreeWorkoutSheet`, `MusclePicker`, `HistorySummary`, `MonthCalendar`, `HistoryFilters`, `WorkoutLogGroup`,
  `WorkoutLogRow` (each `.tsx` + `.css`)
- `apps/mobile/src/features/workouts/hooks/useWeekPlan.ts`, `useWorkoutHistory.ts`, `useFreeWorkout.ts`
- `apps/mobile/src/features/workouts/data/weekPlanDisplay.ts`, `historyDisplay.ts`, `freeWorkout.ts`
- `apps/mobile/src/services/workoutLogs/freeWorkoutService.ts`, `apps/mobile/src/styles/workoutColors.css`

Modified
- `apps/mobile/src/features/workouts/pages/WorkoutsPage/WorkoutsPage.tsx`, `copy/he.ts`, `copy/en.ts`, `data/workoutDisplay.ts`
- `apps/mobile/src/features/home/components/HomeScreen/HomeScreen.css` (color classes moved out)
- `apps/mobile/src/main.tsx`, `apps/mobile/src/styles/typography.css`, `apps/mobile/.env.example`
- `packages/tokens/tokens.css` (Workouts block: frost, sheet, ink rules, rating dots, sizes, radii, shadows)
- `packages/shared/src/planDisplay.ts` (`describeSetsShort`), `packages/shared/src/copy/he.ts` + `en.ts` (`plan.setCount`)

Deleted
- `apps/mobile/src/features/workouts/components/WorkoutRow/`, `pages/WorkoutsPage/WorkoutsPage.css`

Not mine: `docs/design/trainee-home-b.html` shows as modified in the working tree — I didn't touch it; it is left out of
the commits below.

## Dependencies

None.

## How to test

```
npm run lint                       # oxlint + i18n audit + contrast audit — pass (only the old warnings)
npm run test:i18n                  # copy parity — 31 passed
npm run build -w @sistem/mobile    # pass (dashboard build also passes)
npm run dev                        # sign in as a trainee (seed:dev)
```

Checked by me in Chrome (HE, dev data): Plan tab (all-done state, ticket, next week locked), preview sheet open +
Esc close, sticky frosted header, tab switch → `?tab=history`, summary, calendar (RTL arrows, multi-workout dot, today
ring), day filter + clear, log rows (PR / partial tags, rating dots, ink bar for a workout no longer in a plan), no
console errors. I did not start a workout (it would create a log).

Still to check by you: mid-week with an up-next workout + start / resume / conflict · no plan · next week published ·
1 vs 6 workouts · history empty · a long Latin name (clamped to 3 lines on the card) · EN (Settings) · VoiceOver
(tabs, sheet focus trap + return, calendar buttons) · keyboard (arrow keys on the tabs) · reduced motion · drag the
sheet handle on a phone · iPhone SE / Pro Max safe areas · free-workout UI with `VITE_FEATURE_FREE_WORKOUT=true`.

## Known issues / TODOs

- Free workout server change — waiting for approval (above).
- `formatWeekSpan` (shared, used for the week group titles) is the existing Intl range format; check its Hebrew look.
- Main mobile bundle still over Vite's 500 kB warning (old backlog item).

## Suggested commits

1. `feat(tokens): Workouts screen tokens and set-count helper` — `packages/tokens/tokens.css`, `packages/shared/src/planDisplay.ts`,
   `packages/shared/src/copy/he.ts`, `packages/shared/src/copy/en.ts`
2. `feat(mobile): shared bottom sheet and workout color classes` — `apps/mobile/src/components/common/BottomSheet`,
   `apps/mobile/src/hooks/useBottomSheet.ts`, `apps/mobile/src/styles/workoutColors.css`, `apps/mobile/src/styles/typography.css`,
   `apps/mobile/src/main.tsx`, `apps/mobile/src/features/home/components/HomeScreen/HomeScreen.css`
3. `feat(workouts): trainee Workouts redesign with plan and history tabs` — `apps/mobile/src/features/workouts`,
   `apps/mobile/src/services/workoutLogs/freeWorkoutService.ts`, `apps/mobile/.env.example`
4. `docs: trainee Workouts design report` — this file + the reference

```sh
git add -A -- packages/tokens/tokens.css packages/shared/src/planDisplay.ts packages/shared/src/copy/he.ts packages/shared/src/copy/en.ts
git commit -m "feat(tokens): Workouts screen tokens and set-count helper"

git add -A -- apps/mobile/src/components/common/BottomSheet apps/mobile/src/hooks/useBottomSheet.ts apps/mobile/src/styles/workoutColors.css apps/mobile/src/styles/typography.css apps/mobile/src/main.tsx apps/mobile/src/features/home/components/HomeScreen/HomeScreen.css
git commit -m "feat(mobile): shared bottom sheet and workout color classes"

git add -A -- apps/mobile/src/features/workouts apps/mobile/src/services/workoutLogs/freeWorkoutService.ts apps/mobile/.env.example
git commit -m "feat(workouts): trainee Workouts redesign with plan and history tabs"

git add -A -- docs/phase-reports/design-trainee-workouts.md docs/design/trainee-workouts.html
git commit -m "docs: trainee Workouts design report"
```

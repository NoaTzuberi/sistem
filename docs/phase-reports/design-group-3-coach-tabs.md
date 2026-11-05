# Design fix group 3 — coach mode: trainee Overview / Workouts / Nutrition / Body (direction B, 2026-11-05)

## Summary
- Built from the approved previews (`docs/design-preview/coach-{overview,workouts,nutrition,body}.html`) + the owner's decisions.
  Look only: data, routes, server and copy unchanged (existing strings only).
- **Shell:** 56px avatar with a white ring, name in Karantina, a status chip on the ink (existing labels: פעילה / ממתינה לתוכנית /
  חדשה / לא פעילה), the 3 actions as round white-20% icon buttons with small labels ("הודעה" pink). The tabs moved onto the ink:
  white-20% track, white spring thumb, ink text, sideways scroll if they don't fit.
- **Overview:** soft orange attention card (#FFEBD6 / #C75A00 via coach alias tokens) with the existing sentence; week lanes;
  streak card + white 2-column stat tiles; body tiles with trend chips (cherry tint down, soft grey up); today's portions as
  read-only fuel cells; last workouts as white rows (icon tile, name, facts, day).
- **Workouts:** plan chips (פורסמה / טיוטה / המתאמנת התחילה), compact workout cards (letter tile in the Workouts-tab tint, name,
  day · exercises, chip: בוצע = cherry check, פוספס = cherry tint, upcoming = none), the publish / duplicate actions as pink pills;
  the log as white cards (date, name, duration · volume · sets, chips: blue PR, rating, Daily Pump) that still open in place.
- **Nutrition:** "מעקב" with white day pills + one white card per day (group-tint portion chips, photo thumbnails radius 14 in the
  existing viewer, lock line); tapping a day picks it and shows its fuel cells. Plan: fuel cells (filled = the plan), free
  vegetables row, protein line when the coach set one; meals as white cards with group pills and the options as pill chips.
- **Body:** the profile screens' parts, read-only — weight hero + chart + history cards, measurement chips + hero + history cards,
  photo compare (no add button), and the progress-photo gallery as a 3-column grid (radius 14, date + pose under each).

## Notes / deviations
- Tabs are no longer sticky (they live in the stage, which scrolls away) — say if you want a sticky ink strip.
- Workouts tab: the section heading is "תוכנית" (existing label) — "השבוע" twice in a row read badly; the week lanes there were
  dropped (they stay on Overview, as previewed).
- Nutrition order stays tracking → plan (as before); the plan view loads separately, so the preview's plan-first order would
  need splitting that view. The coach-note row ("הודעה מהמאמנת שלך", `CoachIntro`) is unchanged — not in this group.
- Log cards: the "הושלם" chip shows only for logs that are not completed; a 0 kg volume is not shown.
- `ProgressStats` (white tiles) is shared with the trainee's Achievements page (audit row 7) — it changes there too.
- `MeasHistory` / `WeightHistoryCards`: the tap handler is now optional (no handler = read-only rows); her screens are unchanged.
- `PortionCells` (new, `nutrition/components`) = the FuelBar look without input; `DayTotals` now renders it (coach-only).
- Charts draw in when they scroll into view, so in the full-page screenshots the lines look faint (same on her own screens).
- Real-app check: the trainee has no progress / meal photos, so those grids were checked in the preview only.

## Removed (grep-checked: nothing else imports them)
`bodyTracking/components/{TrendChart, RangePicker, LineChart, MeasurementPicker, MeasurementHistory, WeightHistory, Sparkline}`,
`coach/components/PortionBars`. (The dashboard's own `Sparkline` is a different file and stays.)

## Files changed
- Added: `coach/components/{CoachSection,TraineeAttention}/`, `coach/hooks/{useTraineeBodyTrend,useTraineeMealWeek}.ts`,
  `nutrition/components/PortionCells/`, this report.
- Modified: `coach/pages/TraineeDetailPage/*`, `coach/components/{BodyScoreboard (css), LastWorkouts, NutritionDay, PlanCard,
  TraineeAchievements (css), TraineeBody, TraineeBodyTracking, TraineeNutrition (css), TraineeNutritionTab, TraineeOverview,
  TraineePlan, TraineeWorkouts, WorkoutLogList}`, `nutrition/components/{DayTotals, MealCard, NutritionPlanView}`,
  `bodyTracking/components/ProgressPhotoGallery/*`, `achievements/components/ProgressStats/*`,
  `profile/components/{MeasHistory, WeightHistoryCards}/*`, `packages/tokens/tokens.css` (coach section 17, group 3 block).
- Shared with the uncommitted confirm-sheet work: `packages/tokens/tokens.css` and `coach/components/TraineePlan/TraineePlan.tsx`
  hold lines from both. Run the confirm-sheet commits (docs/phase-reports/confirm-sheet.md) first — they take both files whole
  (use `git add -p` there if you want them split); the `git add` of those two below is then a no-op.
- render.yaml: no change — every secret is already `sync: false`.
- Dependencies: none.

## How to test
- `npm run lint` (oxlint + i18n + contrast), `npm run build -w @sistem/mobile`, `npm run test:i18n` — pass.
- `npm run dev`, sign in as coach@sistem.dev → מתאמנות → Dev Trainee Two → each tab; iPhone SE + Pro Max widths; Hebrew + English.
- Before / after (gitignored): `docs/design-preview/screenshots/coach-{overview,workouts,nutrition,body}-{before,after}.jpg`.

## Suggested commits
1. `feat(mobile): direction-B coach trainee page — ink tabs, status chip, tiles, workout and log cards, fuel cells, body parts`
2. `refactor(mobile): remove the old body chart, measurement picker, history lists and portion bars`
3. `docs: design group 3 report`

```
git add -A -- packages/tokens/tokens.css apps/mobile/src/features/coach/pages/TraineeDetailPage apps/mobile/src/features/coach/components/BodyScoreboard apps/mobile/src/features/coach/components/LastWorkouts apps/mobile/src/features/coach/components/NutritionDay apps/mobile/src/features/coach/components/PlanCard apps/mobile/src/features/coach/components/TraineeAchievements apps/mobile/src/features/coach/components/TraineeBody apps/mobile/src/features/coach/components/TraineeBodyTracking apps/mobile/src/features/coach/components/TraineeNutrition apps/mobile/src/features/coach/components/TraineeNutritionTab apps/mobile/src/features/coach/components/TraineeOverview apps/mobile/src/features/coach/components/TraineePlan apps/mobile/src/features/coach/components/TraineeWorkouts apps/mobile/src/features/coach/components/WorkoutLogList apps/mobile/src/features/coach/components/CoachSection apps/mobile/src/features/coach/components/TraineeAttention apps/mobile/src/features/coach/hooks/useTraineeBodyTrend.ts apps/mobile/src/features/coach/hooks/useTraineeMealWeek.ts apps/mobile/src/features/nutrition/components/PortionCells apps/mobile/src/features/nutrition/components/DayTotals apps/mobile/src/features/nutrition/components/MealCard apps/mobile/src/features/nutrition/components/NutritionPlanView apps/mobile/src/features/bodyTracking/components/ProgressPhotoGallery apps/mobile/src/features/achievements/components/ProgressStats apps/mobile/src/features/profile/components/MeasHistory apps/mobile/src/features/profile/components/WeightHistoryCards
git commit -m "feat(mobile): direction-B coach trainee page — ink tabs, status chip, tiles, workout and log cards, fuel cells, body parts"
git add -A -- apps/mobile/src/features/bodyTracking/components/TrendChart apps/mobile/src/features/bodyTracking/components/RangePicker apps/mobile/src/features/bodyTracking/components/LineChart apps/mobile/src/features/bodyTracking/components/MeasurementPicker apps/mobile/src/features/bodyTracking/components/MeasurementHistory apps/mobile/src/features/bodyTracking/components/WeightHistory apps/mobile/src/features/bodyTracking/components/Sparkline apps/mobile/src/features/coach/components/PortionBars
git commit -m "refactor(mobile): remove the old body chart, measurement picker, history lists and portion bars"
git add -A -- docs/phase-reports/design-group-3-coach-tabs.md
git commit -m "docs: design group 3 report (coach trainee tabs)"
```

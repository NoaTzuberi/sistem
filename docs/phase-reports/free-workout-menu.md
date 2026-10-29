# Free workout menu — interval timer moved off Home (2026-10-29)

## Summary
- Home: the interval timer bar is removed (component, its "last interval" read in `useHomeData`, its copy key and the
  unused `--timer-bar-height` token). Nothing else on Home changed; the sections close up with their normal spacing.
- Workouts: "+ אימון חופשי" (header pill) and the "Want to move more?" entry now open a new sheet "אימון חופשי" — a soft grouped
  list with 36 px white icon tiles (same look as the profile photo source sheet):
  - "אימון כוח חופשי" (barbell icon) → the existing free-workout sheet (opens after the menu slides away, 240 ms);
  - "טיימר אינטרוולים" (stopwatch) → `/timer`, the existing interval timer screen, unchanged;
  - "ריצה חופשית" (running) → `/workouts/own-cardio/new`, the existing "build your own run" flow (it exists, so it is shown).
- Strength-only actions (empty-state "start a workout", the all-done link on the Up next card) still open the strength sheet directly.
- The `/timer` route is unchanged; the workout session ⋯ menu still links to it. No other Home link to the timer existed.
- Motion: the shared `BottomSheet` (300 ms `--ease-drawer` = cubic-bezier(.32,.72,0,1) in, 200 ms out, reduced motion = fade);
  rows press to `--press-scale` (0.97); reduced motion turns the press transition off.

## Files changed
- Added: `apps/mobile/src/features/workouts/components/FreeMenuSheet/FreeMenuSheet.{tsx,css}`,
  `apps/mobile/src/features/workouts/hooks/useFreeMenu.ts`, `docs/phase-reports/free-workout-menu.md`,
  `docs/phase-reports/free-workout-menu/*.png`
- Modified: `apps/mobile/src/features/workouts/components/WorkoutsScreen/WorkoutsScreen.tsx`,
  `apps/mobile/src/features/workouts/copy/{he,en}.ts` (`freeMenu`), `apps/mobile/src/features/workouts/pages/IntervalTimerPage/IntervalTimerPage.tsx` (comment),
  `apps/mobile/src/features/home/components/HomeScreen/HomeScreen.tsx`, `apps/mobile/src/features/home/hooks/useHomeData.ts`,
  `apps/mobile/src/features/home/copy/{he,en}.ts`, `packages/tokens/tokens.css`
- Deleted: `apps/mobile/src/features/home/components/IntervalTimerEntry/` (tsx + css)

## Dependencies
None.

## How to test
- `npm run lint` (oxlint + i18n + contrast audits) and `npm run test:i18n` — pass; mobile `tsc` — passes.
- Manual (390 px): Home has no timer bar. Workouts → "+ אימון חופשי" → sheet with 3 rows; each opens its flow; Esc / scrim /
  handle close it. Switch to English in Settings and check the labels.
- Screenshots: `docs/phase-reports/free-workout-menu/` (home, workouts-tab, free-menu-sheet-he, free-strength-sheet). No EN
  screenshot: language is a per-user server setting and I didn't change the dev account.

## Known issues / TODOs
- English labels ("Free strength workout", "Interval timer", "Free run") are my translation — owner to confirm.
- Uncommitted server nutrition changes (`nutrition.types.ts`, `nutritionPlan.model.ts`) are NOT from this task; left out of the commits.

## Suggested commits
```
git add -A -- apps/mobile/src/features/workouts/components/FreeMenuSheet apps/mobile/src/features/workouts/hooks/useFreeMenu.ts apps/mobile/src/features/workouts/components/WorkoutsScreen/WorkoutsScreen.tsx apps/mobile/src/features/workouts/copy/he.ts apps/mobile/src/features/workouts/copy/en.ts apps/mobile/src/features/workouts/pages/IntervalTimerPage/IntervalTimerPage.tsx apps/mobile/src/features/home/components/HomeScreen/HomeScreen.tsx apps/mobile/src/features/home/hooks/useHomeData.ts apps/mobile/src/features/home/copy/he.ts apps/mobile/src/features/home/copy/en.ts apps/mobile/src/features/home/components/IntervalTimerEntry packages/tokens/tokens.css
git commit -m "feat(mobile): free workout menu on Workouts (strength / interval timer / free run); timer bar off Home"

git add -A -- docs/phase-reports/free-workout-menu.md docs/phase-reports/free-workout-menu
git commit -m "docs: free workout menu report and screenshots"
```

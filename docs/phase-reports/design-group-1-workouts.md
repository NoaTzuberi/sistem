# Design fix group 1 — workout detail, workout log, interval timer (direction B, 2026-11-03)

## Summary
- The three screens from the approved previews (`docs/design-preview/`), look only: data, logic, routes and copy unchanged.
- **Workout detail:** soft page surface, a white hero card (letter tile in the workout's Workouts-tab tint, name, soft chips
  exercises / sets / day / status, the week, the pink "התחלת אימון" pill inside), the coach's note as a pink-tint card with her
  initials, exercises as white cards (01, 02…, "3 × 12–15 · מנוחה 1′"), a superset = one card with a pink side line + chip.
- **Workout log:** white hero (date, name, reactions), 3 white stat tiles (duration / volume / sets; numbers Barlow 28, unit words
  small), rating chip, Daily Pump card, "הוספת סיכום" as a full-width pill, sets in the player's style (number circle, check /
  "לא בוצע", blue "שיא אישי" chip on the PR set).
- **Interval timer:** setup = white card rows with round 44px ± buttons, "סה״כ" with the number in mono, 56px pink start pill.
  Run = work on the pink stage (the player's gradient + grain), rest / get ready on ink, a big draining ring with the 88px clock,
  "סבב 1 מתוך 8", media controls stop / pause / skip (56px, left → right). Browser edges (theme-color) follow the phase.
- The same timer screen is used by interval mode inside a workout, so it gets the new look there too.

## Notes / deviations
- No "~45′" chip (the plan has no time estimate) — exercises / sets / day instead (as previewed).
- Rest on the detail cards uses the player's short form (1′, 45″) through a new optional `formatRest` argument of the shared
  `describeTargets`; every other screen keeps "1 דק׳".
- Log: the PR-count tile is gone (3 tiles, as approved); PRs show as a chip on the set that holds them (the PR is still decided
  only on the server; `data/logSetRecords.ts` only finds the matching set, else the chip sits by the exercise name).
- Log: "הוספת סיכום" is white with the card shadow instead of the soft grey — the soft grey nearly vanished on the soft page.
- Timer: stop moved from the top X into the controls row (confirm sheet unchanged). No long-press repeat, no value picker (none existed).
- Fix found on the way: `useDocumentSurface` cleared the page's surface when an overlay closed — after an interval run inside a
  workout the player's browser edges went blank. It now restores the previous surface.
- New shared bits: `components/common/PillButton` (pink / soft full-width pill — the common `Button` is still the ATLAS bracket),
  `BackButton variant="disc"`, `CountdownRing` + `hooks/useCountdownRing` (rAF from the stored end time, like CountdownBar;
  reduced motion = whole seconds), shared `describeLogSetAmount`.
- Placeholder copy unchanged ("הוחמץ" etc.). No new copy keys.

## Files changed
- Added: `apps/mobile/src/components/common/PillButton/`, `features/workouts/components/{WorkoutDetailHero,WorkoutExerciseCards,
  WorkoutCoachNote,WorkoutLogSets,CountdownRing}/`, `features/workouts/data/{exerciseCards,logSetRecords}.ts`,
  `features/workouts/hooks/useCountdownRing.ts`, this report.
- Modified: `features/workouts/pages/{WorkoutDetailPage,WorkoutLogPage,IntervalTimerPage}/*`, `components/{IntervalTimer,
  SummaryStats,BackButton}/*`, `apps/mobile/src/hooks/useDocumentSurface.ts`, `packages/shared/src/{planDisplay,workoutLogDisplay}.ts`,
  `packages/tokens/tokens.css` (`--*-wk-*`, `--*-it-*`, `--size-pill-button`), `.gitignore` (`docs/design-preview/`, local only).
- Dependencies: none.

## How to test
- `npm run lint` (oxlint + i18n + contrast audits), `npm run build -w @sistem/mobile`, `-w @sistem/dashboard`, `npm run test:i18n` — pass.
- Before / after at 390×844 (gitignored): `docs/design-preview/screenshots/{workout-detail,workout-log,interval-timer-setup,
  interval-timer-work,interval-timer-rest}-real.jpg`.
- Manual: Workouts → a workout → Start / Resume; a done workout → "מה תיעדת" → the log; `/timer` → start → work (pink) → skip →
  rest (ink) → stop → confirm; a planned interval exercise in a workout → the same screen, and after it the player's edges stay pink.

## Suggested commits
```bash
git add -A -- packages/tokens/tokens.css packages/shared/src/planDisplay.ts packages/shared/src/workoutLogDisplay.ts apps/mobile/src/components/common/PillButton apps/mobile/src/features/workouts/components/BackButton apps/mobile/src/hooks/useDocumentSurface.ts .gitignore
git commit -m "feat(mobile): direction-B pill button, disc back button and tokens; shared short rest format and log set amount"
git add -A -- apps/mobile/src/features/workouts/pages/WorkoutDetailPage apps/mobile/src/features/workouts/components/WorkoutDetailHero apps/mobile/src/features/workouts/components/WorkoutExerciseCards apps/mobile/src/features/workouts/components/WorkoutCoachNote apps/mobile/src/features/workouts/data/exerciseCards.ts
git commit -m "feat(mobile): direction-B workout detail with hero card, coach note and exercise cards"
git add -A -- apps/mobile/src/features/workouts/pages/WorkoutLogPage apps/mobile/src/features/workouts/components/SummaryStats apps/mobile/src/features/workouts/components/WorkoutLogSets apps/mobile/src/features/workouts/data/logSetRecords.ts
git commit -m "feat(mobile): direction-B workout log with stat tiles and player-style sets"
git add -A -- apps/mobile/src/features/workouts/pages/IntervalTimerPage apps/mobile/src/features/workouts/components/IntervalTimer apps/mobile/src/features/workouts/components/CountdownRing apps/mobile/src/features/workouts/hooks/useCountdownRing.ts docs/phase-reports/design-group-1-workouts.md
git commit -m "feat(mobile): direction-B interval timer with ring, phase backgrounds and media controls"
```

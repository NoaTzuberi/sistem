# Workout player: pink stage background

## Summary
The active workout screen now sits on the pink stage (gradient 160deg #FF2E86 → #FF006E 55% → #E0005F + fine grain),
from the existing tokens `--surface-profile-stage` / `--texture-profile-grain`. A new shared layer `StageBackground`
(fixed, inset 0, 100lvh, portaled to <body>) draws it and sets html/body to the bottom pink and theme-color to the top
pink through a new generic `useDocumentSurface` hook (the auth screens now use the same hook). Text and icons on the
stage are white; the exercise sits on a white card with unchanged ink content. Rest sheet, sheets and summary unchanged.

## Files changed
- Added: `apps/mobile/src/components/common/StageBackground/StageBackground.{tsx,css}`, `apps/mobile/src/hooks/useDocumentSurface.ts`
- Modified: `apps/mobile/src/features/auth/hooks/useAuthSurface.ts` (uses the shared hook, same behaviour),
  `packages/tokens/tokens.css` (`--color-stage-full-top|bottom`, `--surface-stage-full-frost`),
  `apps/mobile/src/features/workouts/pages/WorkoutSessionPage/WorkoutSessionPage.{tsx,css}`,
  `apps/mobile/src/features/workouts/components/{PlayerHeader,PlayerProgress,PlayerExercise,PlayerQueue,PlayerTip}/*.css`
- Screenshots: `docs/phase-reports/workout-player-stage/` (iPhone 15 Pro, WebKit)

## Dependencies
None.

## How to test
- `npm run lint` (oxlint + i18n + contrast audit — all clean), `npx tsc -p apps/mobile --noEmit`
- Start a workout on an iPhone (Safari): no white bars at top/bottom or on overscroll; the status bar area is pink.
- Header buttons, clock, counts, progress bars and the "up next" list read white on pink; set rows stay ink on white.
- Tick a set with rest: the rest sheet looks as before. Finish → summary unchanged. Leave → other screens back to normal.

## Known issues / TODOs
- The sticky header uses a pink frost (top pink, 80%), so it reads as a slightly lighter band over the scrolling card.
- The error line on the stage is bold white (the error red has no contrast on pink).
- The loading state (before the session arrives) keeps the plain background.

## Suggested commits
1. `feat(mobile): workout player on the pink stage` — all files above except the screenshots/report
2. `docs: workout player pink stage report and screenshots` — `docs/phase-reports/workout-player-stage.md`, `docs/phase-reports/workout-player-stage/`

```
git add -A -- apps/mobile/src/components/common/StageBackground apps/mobile/src/hooks/useDocumentSurface.ts apps/mobile/src/features/auth/hooks/useAuthSurface.ts packages/tokens/tokens.css apps/mobile/src/features/workouts/pages/WorkoutSessionPage apps/mobile/src/features/workouts/components/PlayerHeader apps/mobile/src/features/workouts/components/PlayerProgress apps/mobile/src/features/workouts/components/PlayerExercise apps/mobile/src/features/workouts/components/PlayerQueue apps/mobile/src/features/workouts/components/PlayerTip
git commit -m "feat(mobile): workout player on the pink stage"

git add -A -- docs/phase-reports/workout-player-stage.md docs/phase-reports/workout-player-stage
git commit -m "docs: workout player pink stage report and screenshots"
```

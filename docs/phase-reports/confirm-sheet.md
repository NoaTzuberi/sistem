# Confirm sheet — one component for every "are you sure?" (direction B, 2026-11-03)

## Summary
- The stop-intervals confirm used the generic `components/common/Modal` (`variant="flat"`) with ATLAS `Button`s (outlined
  `--color-error` red, grey ghost text). That Modal also hosts non-confirm content (weight log, swap sheet, celebration), so
  the fix is a dedicated **`components/common/ConfirmSheet`** (it replaces coach mode's own ConfirmSheet, which also wrapped Modal).
- Built on `BottomSheet` (its 300 ms `--ease-drawer` open / 200 ms close, drag handle, focus trap, Esc, scrim, reduced motion =
  fade). Look: top radius 28, padding 22 + bottom safe area, 36×5 #E4E0E6 handle, ink 40 % scrim, a 36px soft round close button,
  an optional 48px icon tile, the title in Karantina 30, the body in Rubik 15, stacked full-width 54px pills.
- `tone: 'destructive' | 'default'`: destructive = cherry tile + solid cherry `#A50047` confirm; default = soft tile + the pink pill.
  Cancel = the soft pill and gets the focus on open. Optional `secondary` action (e.g. resume the open workout), `hideCancel`,
  `isWorking` (spinner; can't be dismissed), `children` (the coach's message + tip).
- No other reds left in these flows: the workout player menu's "discard" item went from `--color-error` to cherry too.

## Screens that use it now
| Confirm | Screen | Tone / icon |
|---|---|---|
| Stop intervals ("לעצור את האינטרוולים?") | interval timer — free `/timer` and interval mode in a workout | destructive · stop |
| "ברוכה השבה" (log the work periods that ended?) | interval timer | default · clock-check |
| Discard workout | workout player `/workouts/session/:id` | destructive · trash |
| Finish workout (sets left / all done) | workout player | default · flag |
| Another workout is open | workout detail / Home / Workouts (StartConflictModal) | default · barbell; resume = pink, discard = soft cherry (secondary), no cancel |
| Remove Daily Pump photo | workout summary | destructive · trash |
| Remove progress photo | Profile → progress photos day | destructive · trash |
| Log out | Settings (LogoutSheet) | destructive · logout |
| Publish / duplicate a plan | coach mode → trainee → Workouts | default · send / copy (+ message & tip fields) |

Not changed (not confirms): the player's "nothing done yet" notice (one OK), the weight log sheet, the swap sheet, the
achievement celebration (all still `Modal` / their own sheets). Kept as is: the delete-account sheet (password field, already
direction B) and the coach's EndCoachingSheet (`CoachSheet`, coach design).

## Files changed
- Added: `apps/mobile/src/components/common/ConfirmSheet/{ConfirmSheet.tsx,ConfirmSheet.css}`, this report.
- Modified: `features/workouts/components/IntervalTimer/*`, `StartConflictModal/StartConflictModal.tsx`, `PumpPhotoField/*`,
  `pages/WorkoutSessionPage/*`, `features/bodyTracking/components/ProgressPhotoSlot/*`, `features/profile/components/LogoutSheet/LogoutSheet.tsx`,
  `features/coach/components/TraineePlan/TraineePlan.tsx`, `packages/tokens/tokens.css` (`--*-confirm-*`).
- Deleted: `features/coach/components/ConfirmSheet/`, `StartConflictModal/StartConflictModal.css`, `LogoutSheet/LogoutSheet.css`.
- Dependencies: none. No copy changed.

## How to test
- `npm run lint` (oxlint + i18n + contrast audits), `npm run build -w @sistem/mobile` — pass.
- Checked in the browser at 390×844: stop intervals (focus starts on "להמשיך", Esc cancels and the run continues, "עצירה" stops),
  log out, coach publish (opened and cancelled — nothing published). Screenshots (gitignored):
  `docs/design-preview/screenshots/confirm-{stop-intervals,logout,coach-publish}.jpg`.

## Suggested commits
```bash
git add -A -- packages/tokens/tokens.css apps/mobile/src/components/common/ConfirmSheet apps/mobile/src/features/coach/components/ConfirmSheet apps/mobile/src/features/coach/components/TraineePlan/TraineePlan.tsx
git commit -m "feat(mobile): one direction-B ConfirmSheet with destructive and default tones, replacing coach mode's"
git add -A -- apps/mobile/src/features/workouts/components/IntervalTimer apps/mobile/src/features/workouts/components/StartConflictModal apps/mobile/src/features/workouts/components/PumpPhotoField apps/mobile/src/features/workouts/pages/WorkoutSessionPage apps/mobile/src/features/bodyTracking/components/ProgressPhotoSlot apps/mobile/src/features/profile/components/LogoutSheet docs/phase-reports/confirm-sheet.md
git commit -m "feat(mobile): every confirm uses the new ConfirmSheet; no off-palette reds in the workout flows"
```

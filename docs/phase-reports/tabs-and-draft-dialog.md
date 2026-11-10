# Workout tabs color + the "existing draft" dialog

## Summary

- **Workout tabs (dashboard builder):**
  - Selected tab: the week's soft tint, its dark tone as text, and the letter filled with the week color. The letter is
    white on pink / purple and ink on orange / blue.
  - Unselected tabs: white with a hairline border and ink text; the letter circle is in the tint.
  - "+ אימון" is unchanged (dashed).
  - A weekly plan uses the pink the same way (one class, `workout-color-week`, that falls back to week 1's pink).
- **Workout card:** the dark ink cloud is gone. The header is a very light tint of the same color under a 4px top
  accent.
- **Mobile coach mode** has no tabs: each workout is a card that opens. The open card gets the "selected" look (4px top
  accent, tinted header, filled letter), and closed cards are white with a hairline border. It uses the week's color in
  a multi-week plan and pink in a weekly plan.
- **ConfirmDialog**
  - Every dialog: radius 28, padding 28, max 480px wide, the same blurred scrim. It opens with scale 0.96 → 1 and a
    fade (300ms ease-out) and closes in 200ms. Reduced motion turns this off.
  - The title is now Karantina 34 and the body Rubik 15 in `--color-text`. An optional 48px icon tile sits above the
    title.
  - **3+ options (`choices`)** get stacked choice cards (icon, bold label, one line), with the first card focused, and a
    small centered muted "ביטול". A `danger` card has a cherry label and icon and a cherry-tint border on hover / focus.
  - **2 options** get stacked full-width pills (confirm, then a soft Cancel), with the focus on Cancel.
- "כבר יש טיוטה לשבוע הזה" now uses choices: "לפתוח את הטיוטה הקיימת" first (focused), then "להחליף את הטיוטה" (danger).
  Esc and the scrim cancel.

## New copy (DRAFT)

| Key | he | en |
| --- | --- | --- |
| `duplicate.draftOpenHint` | להמשיך מאיפה שהפסקת | Continue where you left off |
| `duplicate.draftReplaceHint` | הטיוטה תוחלף בעותק של התוכנית שבחרת | The draft is replaced with a copy of the plan you picked |

## Files changed

- Added
  - `apps/dashboard/src/hooks/useDialogFocus.ts` (Esc, focus trap, initial focus, focus return)
- Modified
  - Dashboard:
    - `ConfirmDialog` (.tsx + .css)
    - `NewPlanPopover.tsx`
    - trainees copy he/en
    - `WorkoutTabs` (.tsx + .css)
    - `WorkoutHero.css`
    - `PlanEditor.tsx`
    - `styles/globals.css` (`workout-color-neutral` → `workout-color-week`)
  - Mobile: `coach/components/PlanCard` (.tsx + .css)
  - Tokens: `components/sheets.css`, 10 confirm-dialog tokens
- Screenshots: `docs/phase-reports/tabs-and-draft-dialog/` (`before-*` / `after-*`)

## Dependencies

None.

## How to test

- `npm run lint` is clean (including the i18n and contrast audits), and `tsc` is clean for the dashboard and mobile.
- `npm run test:i18n` passes (50 tests).
- Browser checks used the sandbox (in-memory MongoDB, server 5003, dashboard 5184, mobile 5183). There was no
  sideways scroll at 1440px or 390px. The only console line was the expected 409 `plan_week_has_draft` that opens the
  dialog.

## Known issues / decisions

1. In a weekly plan, the tabs and card are now all pink, so the builder no longer shows each workout's own color
   (A pink, B purple…). Other screens still use the workout colors.
2. Cardio tabs take the week color too; the pulse icon still marks them. The cardio card keeps its purple.
3. The other 2-option confirms (trainee page, coaches, invites, nutrition settings) now stack their pills, with Cancel
   second.

## Suggested commits

```
git add -A -- packages/tokens/components/sheets.css apps/dashboard/src/hooks/useDialogFocus.ts apps/dashboard/src/components/common/ConfirmDialog apps/dashboard/src/features/trainees/components/NewPlanPopover/NewPlanPopover.tsx apps/dashboard/src/features/trainees/copy/he.ts apps/dashboard/src/features/trainees/copy/en.ts
git commit -m "feat(dashboard): confirm dialog redesign with choice cards for the existing-draft question"
git add -A -- apps/dashboard/src/styles/globals.css apps/dashboard/src/features/planBuilder/components/WorkoutTabs apps/dashboard/src/features/planBuilder/components/WorkoutHero/WorkoutHero.css apps/dashboard/src/features/planBuilder/components/PlanEditor/PlanEditor.tsx apps/mobile/src/features/coach/components/PlanCard
git commit -m "feat(builder): workout tabs and card in the week's tint (pink in weekly plans), same in coach mode"
git add -A -- docs/phase-reports/tabs-and-draft-dialog.md docs/phase-reports/tabs-and-draft-dialog
git commit -m "docs: tabs and draft dialog report with before/after screenshots"
```

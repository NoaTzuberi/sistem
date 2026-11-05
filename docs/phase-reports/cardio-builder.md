# Her own run builder ("אימון ריצה חדש") — redesign (2026-11-03)

## Summary
- Where: the trainee's own run planner in the app (`/workouts/own-cardio/new` + `/:id/edit`, `OwnCardioBuilderPage`). The coach builds
  cardio on the dashboard (`features/cardio/CardioEditor`); coach mode in the app has no cardio builder. Built from the approved preview
  (`docs/design-preview/cardio-builder.html`), structure from `docs/design/coach-cardio-builder.html` (the dashboard prototype).
- **Sticky summary card:** total (Barlow 40, "22′"), "14 קטעים", "עצימות עד 8", "Z4" (zone colors), the profile chart (bar width =
  time, height + color = effort / zone; widths animate), a label per step (חימום · × 6 · שחרור). Tapping a bar opens that block and
  scrolls to it; its bars get an ink ring (a block inside a repeat set has one bar per round — all of them ring).
- **Timeline:** a collapsed row per block (zone stripe, kind, "5:00", "8/10 · Z4", drag handle, ⋯). Tap = opens inline (240 ms,
  grid-rows 0fr → 1fr) into the existing editor (kind chips + the duration / effort steppers). One block open at a time.
- **Repeat set:** one card, thin purple side line, "חזרה × 6" with its own ± stepper, its own ⋯ (duplicate / delete the set), its
  blocks (sortable inside the set), "+ הוספת קטע לסט".
- **Add:** "+ קטע" → a sheet of presets (חימום 5′ · Z1, עבודה 3′ · Z4, התאוששות 2′ · Z1, שחרור 5′ · Z1, קטע ריק); "+ סט חוזר".
  New blocks go in right after the open one (inside its set when there's room), else at the end, and open.
- **⋯ sheet:** duplicate / delete (the last block can't be deleted).
- **Templates (new, app-only):** "התחלה מתבנית" on a new, untouched workout: ריצה קלה 30′, אינטרוולים 6×(1′/1′), טמפו 3×8′ (with their
  mini profile). No templates existed before; these are fixed presets in `data/ownCardioDraft.ts`.
- **Sticky actions:** "שמירה" (pink) — a new workout opens its page as before, an edit goes back; "תצוגה מקדימה" (soft) = save, then
  open its page (her view of the session). Deleting a saved workout now uses the app's ConfirmSheet.
- Decisions applied (owner): no block note (would need a schema change); @dnd-kit added; preview = save then open.

## Notes
- Drag and drop: @dnd-kit (pointer: the handle only, 6px before a drag starts; keyboard sensor for accessibility). Moves stay inside one
  list (the top level, or one repeat set) — a custom collision filter only offers rows of the same list.
- The old repeat-set markup / delete-inline confirm / total line were removed from the page; `OwnCardioBlockEditor` (the editor) and
  `SgStepper` are reused; `CardioGraph` stays (the run detail page uses it).
- The mobile build prints Vite's "chunk larger than 500 kB" warning (one bundle for the whole app; dnd-kit adds a little).
- Not run live: saving (it would create a workout in the dev database). Template, bar → block, add preset after the open block,
  duplicate and drag reorder were checked in the browser.

## Files changed
- Added: `apps/mobile/src/features/cardio/components/{BuilderSummary,BuilderBlockRow,BuilderRepeat,BuilderAddSheet,BuilderBlockMenu,
  BuilderTemplates}/`, `features/cardio/data/builderSummary.ts`, this report.
- Modified: `features/cardio/pages/OwnCardioBuilderPage/*`, `features/cardio/hooks/useOwnCardioBuilder.ts`, `features/cardio/data/ownCardioDraft.ts`,
  `features/cardio/copy/{he,en}.ts` (DRAFT copy for the new labels), `packages/tokens/tokens.css` (`--*-cb-*`).
- Dependencies: added `@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0, `@dnd-kit/utilities` 3.2.2 (apps/mobile; `package.json` + `package-lock.json`).

## How to test
- `npm run lint` (oxlint + i18n + contrast audits), `npm run build -w @sistem/mobile`, `npm run test:i18n` — pass.
- Manual: Workouts → + → אימון ריצה חדש → pick "אינטרוולים" → tap a pink bar (its block opens) → "+ קטע" → התאוששות (lands after the open
  block) → ⋯ → שכפול → drag a row by its handle → שמירה / תצוגה מקדימה.
- Before / after (gitignored): `docs/design-preview/screenshots/cardio-builder-{new,intervals}-real.jpg`.

## Suggested commits
```bash
git add -A -- apps/mobile/package.json package-lock.json
git commit -m "chore(mobile): add @dnd-kit for reordering the run builder's blocks"
git add -A -- packages/tokens/tokens.css apps/mobile/src/features/cardio/data apps/mobile/src/features/cardio/hooks/useOwnCardioBuilder.ts apps/mobile/src/features/cardio/copy
git commit -m "feat(mobile): run builder logic for inserting after the open block, presets, templates, duplicate and reorder"
git add -A -- apps/mobile/src/features/cardio/components/BuilderSummary apps/mobile/src/features/cardio/components/BuilderBlockRow apps/mobile/src/features/cardio/components/BuilderRepeat apps/mobile/src/features/cardio/components/BuilderAddSheet apps/mobile/src/features/cardio/components/BuilderBlockMenu apps/mobile/src/features/cardio/components/BuilderTemplates apps/mobile/src/features/cardio/pages/OwnCardioBuilderPage docs/phase-reports/cardio-builder.md
git commit -m "feat(mobile): redesigned run builder with a sticky profile summary, block timeline, repeat sets and templates"
```

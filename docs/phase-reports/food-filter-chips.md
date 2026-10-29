# Empty food list + food-group filter chips (2026-10-28)

## Summary
- **Root cause of the empty list: data, not code.** Food items belong to one coach (`FoodItem.coachId`). In the
  remote database `Sistem` (the one `apps/server/.env` points to), all 219 items belong to `coach@sistem.dev`;
  the real coach account (created by the admin) has **0**. `seed:nutrition` was only ever run for the dev coach,
  and it can't run on Render: its source file `apps/server/data/nutrition/food-lists.json` is gitignored (never
  deployed) and the script refuses `NODE_ENV=production`.
- API and client are fine: `GET /api/coach/nutrition/foods` → `listCoachFoods(req.userId)` filters by `coachId`
  only (no coaching / community / language / paging filter; the accounts work did not change it);
  `coachApi.listFoods` reads `data.items`, which matches.
- The seed is already idempotent (upsert by `coachId + seedKey`, `$setOnInsert` — a re-run only adds missing items,
  never duplicates, never overwrites the coach's edits). No change needed.
- Food list: a truly empty list now says "לא נמצאו מזונות"; a failed load shows the error with "נסי שוב".
  The food picker says "לא נמצאו מזונות" when the coach has no active items at all.
- Food-group filters are now pills (36 px, radius 18, 8 px gap, sideways scroll, no scrollbar) with the group icon:
  tint + group ink when off, solid group color + white when on; "All" = soft / ink. Press 0.97, transitions on
  background-color / color / transform only, none under reduced motion.

## Where the filter appears (all updated)
1. Dashboard food list `/nutrition/foods` — `GroupChips` (groups, with counts) + `CategoryChips` (categories of the group)
2. Dashboard plan builder food picker — `GroupTabs` (groups) + `CategoryChips`
3. Trainee app Nutrition → "what can I eat" sheet — `FoodSheet` group tabs

## Production fix (run by the owner — not run by Claude)
The data file exists only on your machine, so run it from your machine with `DATABASE_URL` in `apps/server/.env`
set to the production database (it already points to the remote `Sistem` DB, where the real coach exists):

```
npm run seed:nutrition -- <real-coach-email> --allow-remote
```

Expected: `food-lists.json — food items: 219 created, 0 already there`. Safe to re-run.
A Render Shell run is not possible as is (no data file on the server + the production guard).

## Files changed
- Added: `apps/dashboard/src/features/nutrition/components/GroupFilterChip/GroupFilterChip.{tsx,css}`,
  `apps/dashboard/src/features/nutrition/components/groupIcons.tsx` (mirror of the mobile icons)
- Modified (dashboard): `features/nutrition/components/GroupTabs/GroupTabs.{tsx,css}`,
  `features/nutrition/components/CategoryChips/CategoryChips.{tsx,css}`, `features/nutrition/components/FoodPicker/FoodPicker.tsx`,
  `features/nutrition/copy/{he,en}.ts`, `features/nutritionLibrary/components/GroupChips/GroupChips.{tsx,css}`,
  `features/nutritionLibrary/hooks/useFoods.ts` (`isEmpty`), `features/nutritionLibrary/pages/FoodLibraryPage/FoodLibraryPage.tsx`,
  `features/nutritionLibrary/copy/{he,en}.ts`, `components/common/StateLine/StateLine.tsx` (optional `retryLabel`)
- Modified (mobile): `features/nutrition/components/FoodSheet/FoodSheet.css`
- Modified (tokens): `packages/tokens/tokens.css` (`--size-filter-chip`, `--radius-filter-chip`, `--space-filter-chip-gap`,
  `--size-filter-chip-icon`, `--color-filter-chip-all`)
- Screenshots: `docs/phase-reports/food-filter-chips/`

## Dependencies
None.

## How to test
- `npm run lint` · `npm run test:i18n` (both pass) · dashboard + mobile `tsc` clean.
- Dashboard as the dev coach: `/nutrition/foods` → pick groups and categories; plan builder (full menu) → "+ Food item".
- Mobile as trainee2: Nutrition → "what can I eat" on a group row → switch groups; check RTL and EN.
- Empty state: sign in as a coach with no foods → "לא נמצאו מזונות". Error: stop the server → error line + "נסי שוב".

## Known issues / TODOs
- **Decision for the owner:** every new coach starts with an empty food list. Options: seed from the admin's
  "create coach" flow (needs the list in the database or in the repo — today it is deliberately gitignored),
  or keep seeding by hand per coach.
- The selected fat / snack chips use white on the exact group color (owner's 2026-10-21 rule, as in the trainee app).
- The vegetable chip (dashboard food list) has no icon — there is no vegetable glyph in the portion bars.

## Suggested commits
Note: `packages/tokens/tokens.css` also holds the uncommitted messages work (`--size-coach-quick-text`). If that should
go in its own commit, stage only the filter-chip block with `git add -p packages/tokens/tokens.css` instead.

```
git add -A -- packages/tokens/tokens.css apps/dashboard/src/features/nutrition/components/GroupFilterChip apps/dashboard/src/features/nutrition/components/groupIcons.tsx apps/dashboard/src/features/nutrition/components/GroupTabs apps/dashboard/src/features/nutrition/components/CategoryChips apps/dashboard/src/features/nutritionLibrary/components/GroupChips apps/mobile/src/features/nutrition/components/FoodSheet/FoodSheet.css
git commit -m "feat(nutrition): food-group filter pills with group icons in the food list, food picker and trainee food sheet"
```

```
git add -A -- apps/dashboard/src/components/common/StateLine/StateLine.tsx apps/dashboard/src/features/nutritionLibrary/hooks/useFoods.ts apps/dashboard/src/features/nutritionLibrary/pages/FoodLibraryPage/FoodLibraryPage.tsx apps/dashboard/src/features/nutritionLibrary/copy apps/dashboard/src/features/nutrition/components/FoodPicker/FoodPicker.tsx apps/dashboard/src/features/nutrition/copy
git commit -m "fix(dashboard): separate empty and error states for the food list and food picker"
```

```
git add -A -- docs/phase-reports/food-filter-chips.md docs/phase-reports/food-filter-chips
git commit -m "docs: empty food list diagnosis and filter chips report"
```

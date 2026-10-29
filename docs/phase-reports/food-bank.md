# One app-wide food bank (2026-10-28)

## Summary
- Foods are now one **system bank** for everyone + optional **coach items**. `FoodItem.scope` = `system` (no coachId,
  unique `itemKey`) | `coach` (coachId). A coach's edit of a system item makes her own copy (`basedOn`) that replaces it
  in her lists and plans; the system item never changes. "Restore to original" removes the copy. She can hide system
  items (`CoachProfile.hiddenSystemFoods`).
- The merge rule lives in one pure function (`nutrition/foodBank.ts`): system − archived − replaced − hidden + her own.
  The builder, picker, AI draft, settings caps check and trainee swaps all use it. Plan lines resolve by id against her
  items + any system item, so old plans, versions, templates and meal logs keep working.
- Trainees see their coach's merged lists. With no published plan (own daily target), `GET /nutrition-plan` now sends
  `swaps`: her coach's lists, or the system bank when she has no coach. The trainee app opens the food sheet from those.
- Admin only: `/api/admin/foods` (list / create / edit / delete-or-archive / restore). The dashboard admin page has a
  "מאגר מזונות" section that reuses the library's list, cards and edit sheet (`FoodBankPanel`).
- Dashboard library: "שלי" tag, "שחזור למקור" on copies, "הסתרה" on system items, source chips "הכל / שלי / מוסתרים",
  and a note in the edit sheet when saving will create her own version.

## Migration — run in this order (Claude did not run these)
Run from your machine; `apps/server/.env` decides the database (it points to the remote `Sistem` DB today).
Add `--allow-remote` for any non-local database, production included.

```
# 1. Dry run — counts only, writes nothing
npm run migrate:food-bank -- --allow-remote

# 2. Apply — the 219 items of coach@sistem.dev become system items (same _id)
npm run migrate:food-bank -- --apply --allow-remote
```
Expected: `Source coach items: 219` · `Converted to system items: 219` · `System items now: 219`. Re-running is safe (0).
Other coaches' unchanged copies of a system item are listed, not deleted (the real coach has 0 items today).

The server must be deployed with this code **before or right after** step 2: old code reading by `coachId` would show
the dev coach an empty list after the migration.

Fresh database (no migration needed): `npm run seed:nutrition -- --allow-remote` (no coach email any more; upserts by
itemKey, never duplicates).

## Why food-lists.json stays gitignored
`.gitignore`: "The coach's own reference content … the repo will become public", and `apps/server/.gitignore`: "The
coach's nutrition guide data … her own content, never committed". It is the coach's own work and the repo is
meant to become public, so I left it ignored. Production gets the data through the migration, not the file.

## Files changed
- Server added: `features/nutrition/foodBank.ts`, `foodBankMigration.ts`, `scripts/migrateFoodBank.ts`,
  `__tests__/foodBank.test.ts`
- Server modified: `nutrition/foodItem.model.ts`, `foodItem.service.ts`, `nutritionMapping.ts`, `nutrition.types.ts`,
  `nutrition.constants.ts`, `nutritionPlan.service.ts`, `nutrition.controller.ts`, `nutritionSeed.ts`,
  `scripts/seedNutrition.ts`, `__tests__/nutritionSeed.test.ts`; `coachProfiles/coachProfile.model.ts`;
  `coach/coach.routes.ts`; `admin/admin.routes.ts`; `users/scripts/devDatabaseGuard.ts` (`assertSetupDatabase`),
  `users/scripts/seedDev.ts`; `aiRecommendations/__tests__/nutritionPlanInput.test.ts`; `apps/server/package.json`
- Shared: `packages/types/src/index.ts` (FoodItem `source` / `basedOn` / `hidden`, `AdminFoodBankResponse`,
  `TraineeNutritionPlanResponse.swaps`, 'reverted'); `packages/api-client/src/coachApi.ts` (`setFoodHidden`),
  `foodBankApi.ts` (new), `index.ts`; root `package.json` (`migrate:food-bank`)
- Dashboard added: `nutritionLibrary/components/FoodBankPanel/*`, `SourceChips/*`, `nutritionLibrary/data/foodSources.ts`,
  `admin/components/AdminFoodBank/*`
- Dashboard modified: `nutritionLibrary/hooks/useFoods.ts`, `data/foodLibrary.ts`, `components/FoodCard/*`,
  `FoodGroupSection.tsx`, `FoodSheet/*`, `pages/FoodLibraryPage/*`, `copy/{he,en}.ts`; `admin/pages/CoachesPage/CoachesPage.tsx`,
  `admin/copy/{he,en}.ts`; `services/admin/adminService.ts`, `services/coach/coachService.ts`;
  `components/common/Icon/iconPaths.ts` (eye, eyeOff, undo); `hooks/useUndoToast.ts` (exports `UndoOffer`)
- Mobile modified: `features/nutrition/components/NutritionScreen/NutritionScreen.tsx`
- Docs: `docs/PRD.md` (§5.6 "Decisions — food bank"), this report, screenshots in `docs/phase-reports/food-bank/`

## Dependencies
None.

## How to test
- `npm test` (server 696 + copy parity) · `npm run lint` · `npm run build` — all pass.
- New tests (`foodBank.test.ts`): the pure merge; a new coach sees the bank; copy-on-write (system unchanged, other
  coaches unaffected, her plan repointed, one copy per item, her caps apply); restore to original (plan points back;
  a copy a published version shows is archived); hide / unhide (builder and trainee swaps skip it; coaches can't
  delete or hide what isn't a system item); admin-only routes (403 for coach and trainee); trainee lists without a
  plan (coach / no coach, no kcal); the migration (dry run writes nothing, same ids, plans resolve, duplicates
  reported, idempotent).
- Manual after the migration: as a coach, `/nutrition/foods` → edit a bank item → "שלי" tag → "שחזור למקור"; hide
  one → "מוסתרים" → unhide. As the admin, `/admin/coaches` → "מאגר מזונות" → add / edit / remove.

## Known issues / TODOs
- A published plan keeps showing the item it was published with; her copy shows up after her next publish. The
  builder shows "unpublished changes", because making the copy repoints her working copy.
- The AI nutrition draft now starts at onboarding for every coach, since every coach has bank items.
- New sentences (toasts, the sheet note, the admin intro, "No hidden items") are PLACEHOLDER wording for the owner.
- The admin's caps are the default group values; a coach whose own caps are lower can save a copy of an item that is
  over her cap to fix it.

## Suggested commits
Note: the food-filter-chips work (previous report) is still uncommitted and shares files with this one
(`useFoods.ts`, `FoodLibraryPage.tsx`, the library copy, `StateLine.tsx`, `GroupChips`). Run its commits first. They
will pick up this work's edits in those shared files, and that's fine (both are local). `packages/api-client/src/index.ts`
and `packages/tokens/tokens.css` also hold your in-progress messages work; use `git add -p` for those files if you want
them kept apart.

```
git add -A -- packages/types/src/index.ts apps/server/src/features/nutrition apps/server/src/features/coachProfiles/coachProfile.model.ts apps/server/src/features/coach/coach.routes.ts apps/server/src/features/admin/admin.routes.ts apps/server/src/features/users/scripts/devDatabaseGuard.ts apps/server/src/features/users/scripts/seedDev.ts apps/server/src/features/aiRecommendations/__tests__/nutritionPlanInput.test.ts apps/server/package.json package.json
git commit -m "feat(server): app-wide food bank — system items, coach copy-on-write, hide, admin-only edits, migrate:food-bank"
```

```
git add -A -- packages/api-client/src/coachApi.ts packages/api-client/src/foodBankApi.ts packages/api-client/src/index.ts apps/dashboard/src/features/nutritionLibrary apps/dashboard/src/features/admin apps/dashboard/src/services/admin/adminService.ts apps/dashboard/src/services/coach/coachService.ts apps/dashboard/src/components/common/Icon/iconPaths.ts apps/dashboard/src/hooks/useUndoToast.ts
git commit -m "feat(dashboard): food bank in the library (mine tag, restore to original, hide, source chips) and the admin food bank"
```

```
git add -A -- apps/mobile/src/features/nutrition/components/NutritionScreen/NutritionScreen.tsx
git commit -m "feat(mobile): food lists with her own daily target (coach's lists, or the food bank without a coach)"
```

```
git add -A -- docs/PRD.md docs/phase-reports/food-bank.md docs/phase-reports/food-bank
git commit -m "docs: food bank decision, report and screenshots"
```

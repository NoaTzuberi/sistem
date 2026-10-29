# Plan builder freedom + workout names + daily protein goal (2026-10-28)

## Summary
- **Slots are suggestions.** No more "חובה / רשות" badges, ring, count/max, "required slot is empty" hint, or "slot is full" refusal. An empty template slot is a dashed line "הצעה: <muscle>" + "בחירת תרגיל" + ×. × hides it for that workout (`hiddenSlotIds`, coach-only), and "החזרת הצעה שהוסרה" brings it back. A slot takes any number of exercises. The AI draft prompt (v4) treats slots as suggestions, and the AI check no longer requires any slot.
- **Workout names.** The existing `title` field is the name, so no new field was added. Inline in the builder: max 40 (client + server), saved on blur/Enter, Esc cancels, empty → default "אימון N", placeholder "למשל: רגליים וישבן". A new workout's name field is focused and selected. The tab and the hero show the letter A/B/C. The trainee app already showed `title` / `workoutTitle` everywhere (home, workouts cards, player header, history, summary). Nothing there hard-codes "אימון 1/2/3".
- **Daily protein goal.** An optional `proteinGramsTarget` (whole g, 1–400; null clears; omitted keeps) on the nutrition plan + each version, editable in portions mode under the portion tiles. The trainee sees "~X גרם חלבון ביום" under the protein row (Barlow, `<bdi dir="ltr">`, new token `--color-portion-protein-deep: #c80058`) and an (i) sheet. No goal → nothing shown.

## Where `required` was used (now unused; the type keeps it as optional for old data)
- `trainingSplit.config.ts` (every default slot): removed from the defaults.
- `trainingSplit.validation.ts`: was mandatory, now accepted and dropped.
- `trainingPlanPrompt.ts`: "*" marks + "fill every required slot". Rewritten, version `training-plan-v4`.
- `trainingPlanValidation.ts`: the "required slot … is empty" check. Removed.
- `trainingPlanSplits.ts neededPatterns`: the required-first order. Now slot order.
- `@sistem/shared trainingSlots.ts`: the `rematchSlots` order + `emptyRequiredSlots`. Removed; a full slot no longer pushes an exercise to "Other".
- Dashboard `SlotSection` / `WorkoutCard` / `PlanEditor`: badges, hint, slot-full toast. Removed.
- The publish rules never checked slots; a workout still needs ≥ 1 exercise.
- Coach mode in the mobile app has no slot builder, so nothing changed there.

## Protein data: what exists
- **Missing:** no protein-per-portion value anywhere in the app. FoodItem has no protein field. `food-lists.json` has none. The plan and the config have none. So there is no computed hint ("לפי המנות"), no "one portion ≈ X g" and no food examples in the sheet.
- **Exists but not imported:** the coach's source lists `docs/reference/150-dairy.md` (26 items, `protein_grams_he/en`) and `protien.md` (46 items, `protein_grams`) have protein grams per item, as text ranges like "כ-16–17 גרם". Importing them needs a FoodItem field + the seed (a schema change). **Owner decision needed.**
- The coach's free notes (tips) are not repeated in the sheet. They're general and are already shown on her screen.

## Files
Added: `apps/dashboard/src/features/planBuilder/data/workoutLetters.ts`, `…/planBuilder/hooks/useWorkoutTitle.ts`,
`apps/dashboard/src/features/nutrition/components/ProteinTarget/{ProteinTarget.tsx,.css}`, `…/nutrition/hooks/useProteinTargetInput.ts`,
`apps/mobile/src/features/nutrition/components/ProteinGoal/{ProteinGoal.tsx,.css}`, this report.

Modified: server `plans/{plan.constants,plan.types,plan.validation,planWorkout.schema,planBuilder.service}.ts`,
`trainingSplits/{trainingSplit.config,trainingSplit.validation}.ts`, `aiRecommendations/trainingPlan/{trainingPlanPrompt,trainingPlanValidation,trainingPlanSplits}.ts`,
`nutrition/{nutrition.constants,nutrition.types,nutrition.validation,nutritionPlan.model,nutritionPlan.service}.ts`, `i18n/locales/{he,en}.ts`,
tests `aiRecommendations/__tests__/{aiRecommendations,trainingPlanInput}.test.ts`, `exerciseFamilies/__tests__/exerciseFamilies.api.test.ts`,
`plans/__tests__/planBuilder.test.ts`, `nutrition/__tests__/nutritionApi.test.ts`; `packages/types/src/index.ts`, `packages/shared/src/trainingSlots.ts`,
`packages/tokens/tokens.css`; dashboard planBuilder `{planDraft.ts, types.ts, copy/he.ts, copy/en.ts, hooks/usePlanWorkouts.ts}`, components
`SlotSection, WorkoutCard, WorkoutHero, WorkoutTabs, CardioWorkoutCard, PlanEditor` (tsx/css); dashboard nutrition `nutritionDraft.ts, copy/{he,en}.ts,
components/{DailyPortions,MealsSection,NutritionEditor}`; mobile nutrition `copy/{he,en}.ts`, `components/{PortionGroupRow,NutritionScreen}`; `docs/PRD.md`.

Dependencies: none.

## How to test
- `npm run lint` (oxlint + i18n + contrast audits: clean) · `npm test` (687 server + 39 copy tests pass).
- Dashboard → a trainee → a plan → a Full Body workout: suggestions show with × / בחירת תרגיל; × then "החזרת…" restores; add 3+ exercises to one slot.
- Rename a workout: Enter saves, Esc cancels, empty falls back to "אימון N"; "+ אימון" focuses the new name.
- Nutrition builder → "מנות בלבד": type 120 in "יעד חלבון יומי (גרם)", publish. In the trainee app's Nutrition tab, the protein row shows "~120 גרם חלבון ביום" with (i).

## Known issues / TODOs
- Hebrew/English copy is DRAFT (suggestion line, protein line and sheet text).
- Protein per portion: see "Protein data" above.
- Another session was editing nutrition / food-bank files at the same time. Some files below carry both sessions' changes (see the commits).

## Suggested commits
Files shared with the parallel food-bank work: `packages/types/src/index.ts`, `packages/tokens/tokens.css`, server nutrition `nutrition.constants/types/validation/nutritionPlan.model/service`, server locales, `nutritionApi.test.ts`, dashboard nutrition copy. Check `git diff` on these before committing.

```
git add -A -- apps/server/src/features/plans apps/server/src/features/trainingSplits apps/server/src/features/aiRecommendations apps/server/src/features/exerciseFamilies/__tests__/exerciseFamilies.api.test.ts packages/shared/src/trainingSlots.ts
git commit -m "feat(server): template slots are suggestions, 40-char workout names, coach-only hidden slots"

git add -A -- apps/dashboard/src/features/planBuilder
git commit -m "feat(dashboard): suggestion slots, inline workout name editing and A/B/C markers"

git add -A -- apps/server/src/features/nutrition apps/server/src/i18n/locales packages/types/src/index.ts packages/tokens/tokens.css apps/dashboard/src/features/nutrition/nutritionDraft.ts apps/dashboard/src/features/nutrition/copy apps/dashboard/src/features/nutrition/components/ProteinTarget apps/dashboard/src/features/nutrition/components/DailyPortions apps/dashboard/src/features/nutrition/components/MealsSection apps/dashboard/src/features/nutrition/components/NutritionEditor apps/dashboard/src/features/nutrition/hooks/useProteinTargetInput.ts apps/mobile/src/features/nutrition/copy apps/mobile/src/features/nutrition/components/ProteinGoal apps/mobile/src/features/nutrition/components/PortionGroupRow apps/mobile/src/features/nutrition/components/NutritionScreen
git commit -m "feat(nutrition): optional daily protein goal in grams for portions plans"

git add -A -- docs/PRD.md docs/phase-reports/plan-builder-freedom.md
git commit -m "docs: plan builder freedom, workout names and protein goal report"
```

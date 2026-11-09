# Multi-week (monthly) plans — built as preview v2

## Summary

- A coach can now build a plan of **2–8 weeks** (default 4) next to the usual weekly plan. Weekly plans are unchanged.
- **Model (approved):** one `Plan` per week, grouped by a new `PlanBlock`. Plans got two optional fields (`blockId`,
  `blockWeek`). Existing plans have none, so they stay weekly. No migration.
- **The length is the first choice** of "תוכנית חדשה", in the dashboard popover and in mobile coach mode.
- **Builder:**
  - a block ribbon with one colored card per week, its volume and a volume bar;
  - "העתקה לשבועות הבאים", which fills the later cards one by one (60ms apart), then shows a toast;
  - a progression rule per exercise (+2.5 ק״ג / +1 חזרה) and "שבוע קל בשבוע האחרון" (−30% of the sets);
  - "+2.5 ק״ג ↑" / "+1 חזרה ↑" / "−30% נפח ↓" chips on each exercise, compared with the week before;
  - one publish for all weeks.
- **Trainee:**
  - a pink stage "שבוע 02 מתוך 4" with segments and "השבוע: משקלים עולים ב־3 תרגילים";
  - later weeks are locked cards ("נפתח ביום א׳"), and the server hides their content until their Sunday.
- **Ending notification:** "התוכנית של <name> מסתיימת השבוע" is created lazily, when the coach opens Today or her
  notifications during the last week. There is no scheduled job.
- Previous decisions done here: the "בחירת תבנית" button is gone, and "תבנית" was removed from the empty-state text
  ("אפשר לבנות תוכנית חדשה מאפס.").

## Exact click paths

**Dashboard**

1. Top bar **"+ תוכנית חדשה"** → pick the trainee (Enter or click). Her **Plans** tab opens with the popover
   (`00`, `01`). The same popover opens from the Plans tab's own **"תוכנית חדשה"** button.
2. In the popover, the first control is **"אורך התוכנית": "שבועית" | "חודשית"**. "חודשית" shows the **− 4 שבועות +**
   stepper (2–8) (`02`).
3. Pick the start week and how to start (מאפס / שכפול / AI) → **"יצירת 4 שבועות מ־<week>"**. The builder opens on
   week 1, with weeks 2–4 still empty (`03`).
4. Build week 1. In each exercise's editor, **"התקדמות"**: ללא / +2.5 ק״ג לשבוע / +1 חזרה לשבוע (`08`).
   **"שבוע קל בשבוע האחרון"** is on by default.
5. **"העתקה לשבועות הבאים"** → weeks 2–4 fill one by one, then the toast "הועתק לשבועות 2–4" (`04`, `05`).
6. Click a week card to open that week (`06`; the light week is `07`). Each week is still edited on its own.
7. **"פרסום כל 4 השבועות"** → the usual publish sheet → all weeks go live. The trainee gets one notification.
8. Her Plans tab shows "שבוע 2/4" tags in the week rail (`09`).

**Mobile coach mode**

1. Trainees → the trainee → **"אימונים"** tab. Under the first free week (this week or next week), press
   **"תוכנית חדשה"**.
2. The sheet "תוכנית חדשה": the first control is **"שבועית" | "חודשית"** (+ the weeks stepper) (`11`, `12`).
3. **"שכפול ופרסום 4 שבועות"**: her latest published week is copied into week 1, copied forward (with its exercises'
   progression) and published. The plan card then shows "שבוע 1 מתוך 4" (`13`).
   Mobile has no "שבוע קל" switch: it is a light action, and the dashboard builder has the switch.

**Trainee app**

- Workouts tab: the pink stage, this week's workouts, then **"השבועות הבאים"** as locked cards (`14`, `15`).

## Files changed

Added
- Server:
  - `plans/planBlock.model.ts`
  - `plans/planBlock.service.ts` (create, copy forward, length / light week, publish / unpublish / delete together)
  - `plans/planBlockCopy.ts` (pure: progression, light week, volume, heavier count)
  - `plans/planBlockEnding.service.ts` (the lazy notification)
  - `plans/planBuilder.errors.ts`
  - `plans/__tests__/planBlock.test.ts`
- Dashboard:
  - `components/common/Stepper`
  - `trainees/components/PlanLengthPicker`
  - `planBuilder/components/BlockRibbon`, `planBuilder/components/BlockControls`
  - `planBuilder/hooks/usePlanBlock.ts`, `planBuilder/data/blockWeeks.ts`
- Mobile:
  - `coach/components/PlanLengthChoice`
  - `workouts/components/BlockWeekStage`, `workouts/components/LockedBlockWeeks`
- `scripts/plan-blocks.test.ts`, this report + `docs/phase-reports/multi-week-plans/` (16 screenshots)

Modified
- Server:
  - `plans/plan.model.ts` (blockId, blockWeek), `plan.types.ts`, `planWorkout.schema.ts` (exercise `progression`),
    `plan.constants.ts`, `plan.validation.ts` (lengthWeeks, deloadLastWeek, progression, block update payload)
  - `planBuilder.service.ts` (block branches; `progression` + `block` + `blockWeeks` in coach plans)
  - `traineePlan.service.ts` (`block`, `lockedWeeks`, later weeks hidden)
  - `coach/coach.controller.ts` + `coach.routes.ts` (POST …/plans/:planId/copy-forward, PATCH …/plans/:planId/block;
    Today runs the ending check)
  - notifications (type `plan_block_ending`, dedupe `block_ending:<blockId>`; list / unread count run the ending check)
  - `i18n/locales/{he,en}.ts`
- `packages/types` (PlanProgression, PlanBlockInfo, PlanBlockWeek, TraineePlanBlock, TraineeLockedWeek, payloads,
  notification), `packages/api-client` (copyPlanForward, updatePlanBlock)
- `packages/shared`: notification text + section 'plans', "שבוע N:" on issues, copy
- `packages/tokens/domains/workouts.css`: `--color-week-1…4` (+ -soft / -text / -on), ribbon sizes and motion
- Dashboard:
  - the popover + hook, `newPlanStart.ts`, `planCreateErrors.ts`
  - PlanEditor, BuilderHeader, ExerciseRow, WorkoutCard, WorkoutTabs (neutral), `planDraft.ts`, `types.ts`,
    `usePlanEditor.ts`
  - WeekRailItem, notification items, `globals.css` (week + neutral color classes), copy
- Mobile: TraineePlan, PlanCard, InboxPage, `traineeTabs.ts`, WorkoutsScreen, `useWeekPlan.ts`,
  `weekPlanDisplay.ts`, copy, coachService
- `vitest.i18n.config.mts`

## Schema changes (approved: PlanBlock model)

- New collection `planblocks`: coachingId, traineeId, coachId, startWeek, lengthWeeks 2–8, status,
  deloadLastWeek, endingNotifiedAt.
- `Plan` gets `blockId` and `blockWeek`, both optional. Plan exercises get an optional coach-only `progression`
  (`weight` | `reps`), which trainee APIs never return.
- The unique `(coachingId, weekStartDate)` index is unchanged, so a block can never overlap another plan.

## Dependencies

None added or removed.

## How to test

- `npm test`: 736 server tests and 50 client tests pass. The 13 new block tests cover:
  - create: every week must be free;
  - copy forward: 40 → 42.5 → 45 → 45 kg, reps +1, the light week 4 → 3 sets, fresh ids;
  - publish: one announcement, issues tagged with their week;
  - the trainee: later weeks hidden and 404, `weightIncreases`;
  - length change: drafts only;
  - unpublish / delete: the whole block, never once she started a week;
  - the lazy notification, made once;
  - the pure rules.
- `npm run lint` is clean (oxlint, i18n audit, contrast audit). `tsc` is clean for the server, dashboard and mobile.
- Browser checks used a **sandbox**: server 5003 on an in-memory MongoDB with `seed:dev`, dashboard 5184,
  mobile 5183. Four exercises were added to the sandbox database only. Nothing touched the dev database, and your dev
  servers on 5002 / 5174 were left running.
  - No console errors on any screen, and no sideways scroll at 1440px or 390px.

## Known issues / decisions for you

1. **The builder has no "שבועית / חודשית" switch.** An existing weekly plan can't be turned into a block; the length
   is chosen when the plan is created. A block's length can change while it is a draft, using the stepper in the
   builder.
2. **"העתקה לשבועות הבאים" overwrites the later weeks.** It asks first when they already have workouts, and it refuses
   if she has started one of them.
3. **The trainee's past block weeks** show in her History tab, as before. The preview's separate "שבועות קודמים בתוכנית"
   list was not added. Should it be?
4. **The ending check runs on every Today / notifications load.** It is one indexed query; blocks already announced are
   skipped.
5. **The +2.5 kg / +1 rep steps and the 70% light week are fixed** (`BLOCK_PROGRESSION` in `plan.constants.ts`).
   A per-coach setting would be a later change.
6. **All block copy is DRAFT**, as in the preview (feminine sentences, neutral buttons).

## Suggested commits

1. `feat(server): multi-week plans — PlanBlock, copy forward with progression, one publish, lazy ending notification`
2. `feat(dashboard): length first in "new plan", block ribbon, copy forward, progression chips`
3. `feat(mobile): length first in coach "new plan", trainee block stage and locked weeks`
4. `docs: multi-week plans report and screenshots`

```
git add -A -- apps/server/src/features/plans apps/server/src/features/coach/coach.controller.ts apps/server/src/features/coach/coach.routes.ts apps/server/src/features/notifications apps/server/src/i18n/locales/he.ts apps/server/src/i18n/locales/en.ts packages/types/src/index.ts packages/api-client/src/coachApi.ts
git commit -m "feat(server): multi-week plans — PlanBlock, copy forward with progression, one publish, lazy ending notification"
git add -A -- packages/shared/src packages/tokens/domains/workouts.css apps/dashboard/src scripts/plan-blocks.test.ts vitest.i18n.config.mts
git commit -m "feat(dashboard): length first in new plan, block ribbon, copy forward, progression chips"
git add -A -- apps/mobile/src
git commit -m "feat(mobile): length first in coach new plan, trainee block stage and locked weeks"
git add -A -- docs/phase-reports/multi-week-plans.md docs/phase-reports/multi-week-plans
git commit -m "docs: multi-week plans report and screenshots"
```

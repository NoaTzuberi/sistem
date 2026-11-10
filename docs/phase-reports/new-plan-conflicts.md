# New-plan popover: open or replace a draft, multi-week conflicts, empty drafts

## Summary

- **Weekly, free week** (an empty draft counts as free): one pink "יצירת התוכנית" + "ביטול".
- **Weekly, a draft with content**:
  - pink "פתיחת הטיוטה הקיימת" (full width);
  - under it, a soft pill that follows the start option ("בניית תוכנית חדשה" / "שכפול השבוע שעבר במקום הטיוטה" / "טיוטת AI במקום הטיוטה"). It opens the existing-draft dialog with wording for that option, and "replace" starts over with that option;
  - a small text "ביטול".
  - The start options stay enabled, with the hint "הבחירה תשמש אם תבחרי להתחיל מחדש".
- **Weekly, a published plan**: "פתיחת התוכנית שפורסמה", no replace option, and the note about duplicating it to another week.
- **Monthly**: every week in the range is checked, and those week cards get a light pink outline.
  - No conflicts: "יצירת תוכנית ל־4 שבועות".
  - Drafts in the range: the notice lists their weeks. The primary is "בחירת שבוע התחלה אחר", which scrolls to the week cards, focuses them and lights them up once. The secondary "יצירה והחלפת הטיוטות" opens a plural version of the dialog.
  - A published week in the range: the start week is blocked with a message and create is disabled.
- **The notice** is now an icon + line in #FFEBD6 with #C75A00 text (new tokens).
- **Empty drafts**: a draft with no workouts, or only strength workouts without exercises, is no conflict. Creating over it replaces it with no question, on the server too.
- **Week cards** show "טיוטה · 3 אימונים" / "טיוטה ריקה". A standalone draft gets a ⋯ with "מחיקת הטיוטה", which uses the shared confirm sheet. The builder's ⋯ on a standalone draft uses the same sheet.
- **Server** checks the same rules on create:
  - weekly: an empty draft is replaced; a draft with content → 409 `plan_week_has_draft` unless `replaceDraft` (for scratch / AI too, not only duplicate);
  - monthly: drafts with content → 409 `plan_block_has_drafts` + `weeks`; a published / other-block / locked week → `plan_block_week_taken`; empty drafts are removed;
  - `DELETE …?draftOnly=true` refuses a published plan (409 `plan_not_draft`).
- **Cleanup script** `npm run cleanup:empty-drafts`: a dry run by default, prints counts only, `--apply` deletes. It never touches weeks of multi-week plans or drafts that have a logged workout.

## Copy (DRAFT — feminine Hebrew)

| Key (`traineesCopy`) | he | en |
| --- | --- | --- |
| newPlanFooter.create | יצירת התוכנית | Create the plan |
| newPlanFooter.createBlock | יצירת תוכנית ל־{count} שבועות (שבועיים / שבוע אחד) | Create a {count}-week plan |
| newPlanFooter.openDraft | פתיחת הטיוטה הקיימת | Open the existing draft |
| newPlanFooter.openPublished | פתיחת התוכנית שפורסמה | Open the published plan |
| newPlanFooter.replaceWith.scratch | בניית תוכנית חדשה | Start from scratch instead |
| newPlanFooter.replaceWith.duplicate | שכפול השבוע שעבר במקום הטיוטה | Duplicate last week instead |
| newPlanFooter.replaceWith.ai | טיוטת AI במקום הטיוטה | Use the AI draft instead |
| newPlanFooter.choiceHint | הבחירה תשמש אם תבחרי להתחיל מחדש | Used if you choose to start over |
| newPlanFooter.draftNote | לשבוע הזה כבר יש טיוטה. אפשר להמשיך ממנה או להתחיל מחדש. | This week already has a draft. You can continue it or start over. |
| newPlanFooter.fixedDraftNote | לשבוע הזה כבר יש טיוטה שאי אפשר להחליף מכאן. אפשר לפתוח אותה ולערוך. | … can’t be replaced from here. You can open and edit it. |
| newPlanFooter.publishedNote | לשבוע הזה כבר יש תוכנית שפורסמה. כדי לבנות מחדש, אפשר לשכפל אותה לשבוע אחר. | … To rebuild, duplicate it to another week. |
| newPlanFooter.blockDraftsNote | בשבועות {weeks} יש טיוטות (בשבוע … יש טיוטה) | The weeks of {weeks} have drafts |
| newPlanFooter.replaceDrafts | יצירה והחלפת הטיוטות (הטיוטה) | Create and replace the drafts |
| newPlanFooter.pickOtherStart | בחירת שבוע התחלה אחר | Pick another start week |
| newPlanFooter.blockPublishedNote | בשבוע {week} כבר יש תוכנית שפורסמה — בחרי שבוע התחלה אחר או קצרי את התוכנית | … already has a published plan — pick another start week or shorten the plan |
| newPlanFooter.blockTakenNote | שבוע {week} כבר שייך לתוכנית אחרת — בחרי שבוע התחלה אחר או קצרי את התוכנית | … belongs to another plan — … |
| newPlanFooter.draftText.scratch / .ai | אפשר להתחיל מאפס במקומה / להחליף אותה בטיוטת ה־AI, או לפתוח אותה ולהמשיך ממנה. | You can start from scratch instead / replace it with the AI draft, or open it… |
| newPlanFooter.replaceHint.scratch / .ai | הטיוטה תוחלף בתוכנית ריקה / בטיוטת ה־AI | The draft is replaced with an empty plan / the AI draft |
| newPlanFooter.draftsTitle | בחלק מהשבועות כבר יש טיוטות | Some weeks already have drafts |
| newPlanFooter.draftsText | התוכנית החדשה תחליף את הטיוטות בשבועות {weeks}. | The new plan replaces the drafts in {weeks}. |
| newPlanFooter.draftsKeep / Hint | לבחור שבוע התחלה אחר / הטיוטות יישארו כמו שהן | Pick another start week / The drafts stay as they are |
| newPlanFooter.draftsReplace / Hint | להחליף את הטיוטות / הטיוטות יימחקו, והתוכנית תיווצר במקומן | Replace the drafts / … deleted and the plan is created in their place |
| weekCard.draftWorkouts | טיוטה · {count} אימונים (אימון אחד / 2 אימונים) | Draft · {count} workouts |
| weekCard.draftEmpty | טיוטה ריקה | Empty draft |
| deleteDraft.action | מחיקת הטיוטה | Delete the draft |
| deleteDraft.title | למחוק את הטיוטה של {range}? | Delete the draft of {range}? |
| deleteDraft.text | התוכנית שלא פורסמה תימחק. אי אפשר לבטל. | The unpublished plan will be deleted. This can’t be undone. |
| deleteDraft.error / notDraft | לא הצלחנו למחוק את הטיוטה. נסי שוב. / אפשר למחוק כאן רק טיוטה. תוכנית שפורסמה נשארת. | Couldn’t delete… / Only a draft can be deleted here… |
| server `plan_block_has_drafts` / `plan_not_draft` | בחלק משבועות התוכנית כבר יש טיוטות. / (as notDraft) | Some weeks of the plan already have drafts. |

Removed: `weekTakenNote`, `openExisting`, `createFor`, `length.createBlockFor`, `length.blockTakenNote`,
`duplicate.confirm`, `duplicate.draftText`, `duplicate.draftReplaceHint`.

## Files changed

- Added
  - Server:
    - `apps/server/src/features/plans/planDraftContent.ts` (THE empty-draft rule)
    - `apps/server/src/features/plans/scripts/cleanupEmptyDrafts.ts`
  - Dashboard:
    - `features/trainees/data/newPlanConflicts.ts` (pure conflict rules)
    - `features/trainees/hooks/useNewPlanFooter.ts`
    - `features/trainees/components/NewPlanWeekCard/` (.tsx + .css)
    - `features/trainees/components/NewPlanFooter/` (.tsx + .css)
  - Screenshots: `docs/phase-reports/new-plan-conflicts/` (`before-*` / `after-*`)
- Modified
  - Server:
    - `planBuilder.service.ts`, `planBlock.service.ts`, `planBuilder.errors.ts`, `planWeekOptions.service.ts`, `coach/coach.controller.ts`
    - i18n `locales/he.ts` / `en.ts`
    - 3 plan tests
    - `apps/server/package.json`
  - Shared:
    - `packages/types` (`PlanWeekPlanSummary`: workoutCount / isEmpty / inBlock / locked)
    - `packages/api-client` (`PlanRequestError.weeks`, `deletePlan(…, { draftOnly })`)
    - `packages/tokens/domains/dashboard.css` (4 `--color-new-plan-*` tokens)
  - Dashboard:
    - `NewPlanPopover` (.tsx + .css)
    - `useNewPlanPopover.ts`, `newPlanStart.ts`
    - trainees copy he / en
    - `planBuilder/components/PlanEditor/PlanEditor.tsx`
  - Root: `package.json`, `scripts/duplicate-plan.test.ts`, `scripts/plan-blocks.test.ts`

## Dependencies

None.

## How to test

- `npm test`: the plan tests (116) pass, including 6 new ones (empty draft replaced silently, scratch asks then
  empties, week-picker fields, `draftOnly`, block over drafts / published). `npm run test:i18n` passes (50).
- `npm run lint` is clean (oxlint, i18n audit, contrast audit). `tsc` is clean for the server, dashboard and mobile.
  `npm run check:tokens` lists the 4 new tokens.
- Browser checks used a sandbox: in-memory MongoDB, server 5003, dashboard 5184, and the HEAD copy for the "before"
  shots on 5185. There were no console errors and no sideways scroll at 1440px or 390px. Your dev servers on 5002 / 5174 were not touched.
- Manual checks:
  - Trainee → Plans → "תוכנית חדשה":
    - pick a draft week, switch the start options, then use "… במקום הטיוטה" → replace;
    - pick a published week;
    - switch to "חודשית" over drafts / a published week;
  - use ⋯ → "מחיקת הטיוטה" on a draft week.

### Cleanup commands (I did not run them)

```
npm run cleanup:empty-drafts
npm run cleanup:empty-drafts -- --apply
npm run cleanup:empty-drafts -- --env-file .env.prod --allow-remote
npm run cleanup:empty-drafts -- --env-file .env.prod --allow-remote --apply
```

## Known issues / decisions

1. **A draft that is a week of a multi-week plan, or a locked one, only opens.** There is no replace or delete for
   it from the popover, because deleting one week would break its block. It gets `fixedDraftNote`, which is new
   wording.
2. **A replaced weekly draft keeps its id.** Its content is replaced in place, as before. Before a multi-week plan
   is created over drafts, those drafts are deleted.
3. **Weekly create always says "יצירת התוכנית"**, as specified. The old "שכפול ל־{range}" / "יצירת תוכנית ל־{range}"
   labels are gone.
4. **Published plans keep the old delete.** In the builder, a published plan and a multi-week plan still use the
   old `window.confirm` delete; only standalone drafts use the new sheet.
5. **Production check in the cleanup script:** it treats a run as production when `NODE_ENV=production` or the env
   file / database name contains "prod". Then it needs both `--env-file` and `--allow-remote`. Any non-local
   database needs `--allow-remote`.

## Suggested commits

```
git add -A -- apps/server/src/features/plans/planDraftContent.ts apps/server/src/features/plans/planBuilder.service.ts apps/server/src/features/plans/planBlock.service.ts apps/server/src/features/plans/planBuilder.errors.ts apps/server/src/features/plans/planWeekOptions.service.ts apps/server/src/features/coach/coach.controller.ts apps/server/src/i18n/locales/he.ts apps/server/src/i18n/locales/en.ts apps/server/src/features/plans/__tests__ packages/types/src/index.ts packages/api-client/src/coachApi.ts
git commit -m "feat(plans): empty drafts are no conflict, replace drafts for any start, multi-week draft conflicts, draft-only delete"
git add -A -- apps/server/src/features/plans/scripts/cleanupEmptyDrafts.ts apps/server/package.json package.json
git commit -m "chore(plans): cleanup:empty-drafts script (dry run by default)"
git add -A -- packages/tokens/domains/dashboard.css apps/dashboard/src/features/trainees apps/dashboard/src/features/planBuilder/components/PlanEditor/PlanEditor.tsx scripts/duplicate-plan.test.ts scripts/plan-blocks.test.ts
git commit -m "feat(dashboard): new-plan popover offers open or start over, monthly conflicts, draft labels and delete"
git add -A -- docs/phase-reports/new-plan-conflicts.md docs/phase-reports/new-plan-conflicts
git commit -m "docs: new-plan conflicts report with before/after screenshots"
```

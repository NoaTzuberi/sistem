# "תוכנית חדשה" as two steps — BUILT (dashboard + coach mode)

## Summary

The approved preview (`docs/design-preview/new-plan-flow.html`) is built in the dashboard popover and in the mobile
coach-mode Plans tab. Both apps use the same rules from `@sistem/shared`.

- **Step 1, "לאיזה שבוע?":**
  - the length, then the weeks as rows: purple chip = draft, Cherry chip = published ✓, no chip = free (empty drafts too);
  - a draft opens a purple card under its row: "להמשיך בטיוטה", "להתחיל מחדש", "מחיקת הטיוטה", and "נערכה לאחרונה ב־{date}" (new `updatedAt`);
  - a published week opens a Cherry card with "פתיחת התוכנית";
  - monthly: every week in the range takes the selected look ("שבוע 1 · …", "שבוע 2"…), and the rows run to the end of the range;
  - **the blocking week gets a Cherry outline** (your answer 3); its card explains why, and "המשך" stays disabled (grey, never white on pink).
- **Step 2, "איך להתחיל?":**
  - back + a chip with the week or range;
  - מאפס (kept, answer 2) / שכפול תוכנית שפורסמה (+ "בחירת תוכנית אחרת") / טיוטת AI;
  - "חלוקת אימונים" row (dashboard);
  - one pink pill: "יצירת התוכנית", "יצירת תוכנית ל־N שבועות", or "יצירה והחלפת הטיוטה/ות"; replacing always asks first.
- **"בניית תוכנית חדשה" is gone** (answer 2).
- **Motion:** a 240ms ease-out slide from the reading side (RTL-aware); with reduced motion it is a fade. Presses scale to 0.97.
- **Coach mode (mobile):** the same two steps in a bottom sheet.
  - Duplicate goes on to the existing publish sheet (message + tip) and publishes there. That sheet now names the copied plan and says what gets replaced.
  - "מאפס", "טיוטת AI", "להמשיך בטיוטה" and "פתיחת התוכנית" open the dashboard, because the builder lives there. Without a dashboard address they are off.
  - Delete asks inside the sheet.
  - The single "תוכנית חדשה" pill now always shows under the two weeks.

## Files changed

- **Server:** `plans/planWeekOptions.service.ts` (summary `updatedAt`, from the existing Mongoose timestamps), `__tests__/planWeekOptions.test.ts`, `__tests__/planBuilder.test.ts`.
- **Types:** `PlanWeekPlanSummary.updatedAt`.
- **Shared:**
  - new `newPlanFlow.ts`: rules moved from the dashboard + `replacesDrafts`, `visibleWeekRows`, `weekRowLabel`, `formatEditedDay`;
  - new `hooks/useNewPlanFlow.ts`: steps, lists, choices, delete; each app passes its API calls;
  - `copy` group `newPlanFlow` (he/en);
  - `index.ts`.
- **Tokens:**
  - `semantic/states.css`: `--color-new-plan-draft-soft|ink`, `-live-soft|ink`, `-select-tint`;
  - `base/motion.css`: `--transition-new-plan-step`;
  - `domains/dashboard.css`: the orange notice, range and mark tokens are removed.
- **Dashboard:**
  - new `NewPlanWeekRow/`, `NewPlanWeekNotice/`, `NewPlanStartOptions/`;
  - `NewPlanPopover` rewritten;
  - `useNewPlanPopover` now sits on `useNewPlanFlow`;
  - deleted `NewPlanFooter/`, `NewPlanWeekCard/`, `hooks/useNewPlanFooter.ts`, `data/newPlanConflicts.ts`;
  - `data/newPlanStart.ts` re-exports from shared;
  - `data/planWeeks.ts` trimmed;
  - unused copy removed;
  - `PlanEditor` reads the delete-draft copy from shared.
- **Mobile:**
  - new `NewPlanSheet/`, `NewPlanWeekRow/`, `NewPlanWeekNotice/`, `NewPlanStartOptions/`;
  - `TraineePlan` and `PlanLengthChoice` changed;
  - coach copy (he/en): the duplicate messages name the source, plus `newPlanSources`;
  - `dashboardLinks.plan`;
  - `coachService` exports `listPlanWeeks` and `listPlanSources`.
- **Tests:** `scripts/duplicate-plan.test.ts` (new two-step rules), `scripts/plan-blocks.test.ts` (import path).

## Dependencies

None added or removed.

## Copy (DRAFT)

Everything is in `packages/shared/src/copy` → `newPlanFlow`, with the wording from the approved preview table. Two additions are new wording:

- the coach-mode publish sheet: "התוכנית של {source} תועתק ל־{week} ותפורסם. {name} תקבל התראה." (and the multi-week version);
- the screen-reader label of the blocking row: "חוסם את התוכנית".

## How to test

- `npm run lint` (oxlint + i18n + contrast audits): clean. The 5 warnings were already there.
- `npm test`: 741 + 51 pass. Type checks for server, dashboard and mobile are clean.
- **Dashboard:** trainee → Plans → "תוכנית חדשה". Check:
  - draft week → purple card;
  - published week → Cherry card;
  - "חודשית" starting from a published week → its row has a Cherry outline and "המשך" is grey;
  - free week → "המשך" → step 2 → back;
  - draft → "להתחיל מחדש" → step 2 → "יצירה והחלפת הטיוטה" → the question.
- **Coach mode (phone):** trainee → Workouts → "תוכנית חדשה" → the same steps; duplicate → the publish sheet.

## Known issues / TODOs

- Coach mode can't build from scratch or load the AI draft on the phone. Those options open the trainee's Plans tab in the dashboard, and the coach picks again there.
- `npm run check:tokens` lists the token changes above. They are intended.

## Screenshots

`docs/phase-reports/new-plan-flow/`:

- `before-*`: the old popover;
- `after-*`: the static preview;
- `app-1…10`: the real dashboard. `app-4b` shows the blocking row, `app-5a` is mid-slide, `app-9` is 390px wide, `app-10` is English;
- `mobile-1…5`: coach mode. `mobile-5` shows the blocking row.

No sideways scroll and no console errors in any of them.

## Suggested commits

```
git add -A -- apps/server/src/features/plans/planWeekOptions.service.ts apps/server/src/features/plans/__tests__/planWeekOptions.test.ts apps/server/src/features/plans/__tests__/planBuilder.test.ts packages/types/src/index.ts
git commit -m "feat(plans): plan-weeks summary carries updatedAt (draft last edited)"
git add -A -- packages/shared packages/tokens scripts/duplicate-plan.test.ts scripts/plan-blocks.test.ts
git commit -m "feat(shared): two-step new-plan flow rules, useNewPlanFlow, copy and tokens"
git add -A -- apps/dashboard/src/features/trainees apps/dashboard/src/features/planBuilder/components/PlanEditor/PlanEditor.tsx
git commit -m "feat(dashboard): new-plan popover in two steps (which week, how to start)"
git add -A -- apps/mobile/src/features/coach apps/mobile/src/services/coach/coachService.ts
git commit -m "feat(mobile): coach-mode new-plan sheet with the same two steps"
git add -A -- docs/phase-reports/new-plan-flow.md docs/phase-reports/new-plan-flow
git commit -m "docs: two-step new-plan flow report with screenshots"
```

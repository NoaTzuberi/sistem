# Plan builder — delete a single workout

## Summary

Every workout in the coach's weekly plan builder (strength and cardio) now has a small round "×" in
its header, next to the "⋯" menu, and the menu has a matching "מחיקת האימון" / "Delete workout"
item. Either one deletes only that workout, with no `confirm()`. The card folds away (height + opacity,
200 ms, `--ease-out`; instant with reduced motion), the next workout opens and its tab gets the focus.
A toast "<name> נמחק" with "ביטול" stays for 6 s. Undo puts the workout back in the same place with
everything in it. Workouts that still have their default name ("אימון N" / "Workout N") are renumbered;
names the coach wrote are never changed. The change goes through the plan's normal save: autosave for a
draft, "שמירת השינויים" for a published plan.

Server: the existing plan save (`PUT /api/coach/trainees/:id/plans/:planId`) already scopes the plan
to the coach's trainee (`loadCoachTrainee` + `findOne({ _id, traineeId })`), and it never deletes logs.
One fix: a workout removed in one save and put back ("Undo") after the 2.5 s autosave now keeps its old
id (and its exercises' ids) when this plan's workout logs or cardio logs still point at it. Before this,
it got a new id and the week lost the link to her log ("done"). Only ids that belong to this plan, now or
in its logs, are ever kept.

## Files changed

Modified
- `apps/dashboard/src/features/planBuilder/hooks/usePlanWorkouts.ts`: the delete flow (fold
  animation, removal, renumbering, select + focus next, undo restore). `onRemoved(workout, restore)`.
- `apps/dashboard/src/features/planBuilder/planDraft.ts`: `renumberDefaultTitles` (pure).
- `apps/dashboard/src/features/planBuilder/data/planDefaults.ts`: `WORKOUT_COLLAPSE_MS`, `WORKOUT_UNDO_MS`.
- `apps/dashboard/src/features/planBuilder/components/WorkoutHero/WorkoutHero.tsx` + `.css`: the "×" button.
- `apps/dashboard/src/features/planBuilder/components/WorkoutCard/WorkoutCard.tsx`: menu item, "×"; old confirm removed.
- `apps/dashboard/src/features/planBuilder/components/CardioWorkoutCard/CardioWorkoutCard.tsx`: the same for cardio.
- `apps/dashboard/src/features/planBuilder/components/PlanEditor/PlanEditor.tsx` + `.css`: undo toast,
  the panel's "leaving" class, the empty-week focus target.
- `apps/dashboard/src/features/planBuilder/components/StartCards/StartCards.tsx`: `addFocusRef` on "מאפס".
- `apps/dashboard/src/features/planBuilder/copy/he.ts`, `en.ts`: `deleteWorkout`, `deleteWorkoutNamed`,
  `toastWorkoutDeleted` (the unused `removeWorkoutConfirm` is gone).
- `apps/dashboard/src/hooks/useUndoToast.ts`: optional `durationMs` per offer (default stays 5 s).
- `apps/server/src/features/plans/planBuilder.service.ts`: logged workout / exercise ids are kept on save.
- `apps/server/src/features/plans/__tests__/planBuilder.test.ts`: new test (delete a logged workout, the log
  stays, undo keeps the ids, an unknown id is not kept).

Added
- `docs/phase-reports/plan-delete-workout.md` (this report)

No schema change, no new endpoint.

## Dependencies

None added or removed.

## Logs and history

Deleting a workout never deletes a log. `WorkoutLog.workoutTitle` and `CardioLog.workoutTitle` + `date`
are already copied when she starts / saves, so her history and the coach's log lists still show the
workout's name and date after it leaves the plan. A session already in progress copes with its workout
leaving the plan (`loadPlannedWorkout` returns null). If the coach puts the workout back, it gets its old
id again, so the log is linked to it again.

## Test checklist

Run `npm run dev:all`, sign in as `coach@sistem.dev` (after `npm run seed:dev`) and open a trainee's plan.

- [ ] **Delete + undo**: in a plan with 3 workouts, press "×" on the 2nd. It folds away, the 3rd opens and its
      tab has the focus, the toast says "<name> נמחק · ביטול". Press "ביטול" within 6 s: the workout is back
      in 2nd place with its exercises, day, note and type. Default names: "אימון 3" became "אימון 2" and goes
      back to "אימון 3" on undo. A renamed workout keeps its name.
- [ ] **Undo after autosave**: delete, wait about 3 s until "נשמר", then undo. The workout comes back and is
      saved again.
- [ ] **Delete the last workout**: the week shows the start cards and the focus is on "מאפס". Undo brings the
      workout back.
- [ ] **Strength and cardio**: both kinds have the "×" and the menu item, and both behave the same.
- [ ] **Published plan with logs**: as `trainee2@sistem.dev`, finish a workout. As the coach, delete that
      workout. Nothing reaches the trainee until "שמירת השינויים". After saving, her history and the coach's
      Logs tab still show the log with its name and date.
      Deleting the last workout of a published plan is refused on save by the existing rule (a published
      plan needs a workout).
- [ ] **Keyboard via the "⋯" menu**: Tab to "⋯", Enter, arrows to "מחיקת האימון", Enter. The focus lands on the
      next workout's tab. Tab also reaches the "×", which has `aria-label` and `title` "מחיקת <name>".
- [ ] **Reduced motion** (macOS: Accessibility › Display › Reduce motion): the card goes at once, with no fold.
- [ ] **Hover** (mouse only): the "×" turns pink-soft with a Cherry icon. On press it scales to 0.97.
- [ ] English (language toggle): "Delete <name>", "<name> deleted", "Undo".
- [ ] `npm test` and `npm run lint` pass (checked: 622 server tests, i18n parity, i18n + contrast audits).

## Known issues / TODOs

- The spec says the trainee sees the change "after 'פרסום'". In this builder a published plan has no
  separate draft: its changes reach her when the coach presses "שמירת השינויים" (the existing flow). The
  delete follows that flow; no draft-of-a-published-plan was added.
- The empty week has no "+ אימון" button (it shows the start cards), so the focus goes to "מאפס", the card
  that adds a workout.
- The fold animates `height`, a layout property, for 200 ms. Only one panel is on screen, so it is cheap.
- Only one undo at a time: deleting a second workout before the first toast ends makes the first one final
  (the same as the nutrition screens).
- Wording ("<name> נמחק", "מחיקת האימון") is from the request; the owner may want to review it.
- "Clear week" still uses `confirm()`. It was not in scope.

## Suggested commits

1. `fix(server): keep logged workout ids when a deleted workout is restored`
   - `apps/server/src/features/plans/planBuilder.service.ts`
   - `apps/server/src/features/plans/__tests__/planBuilder.test.ts`
2. `feat(dashboard): delete a single workout from the plan builder with undo`
   - `apps/dashboard/src/features/planBuilder/hooks/usePlanWorkouts.ts`
   - `apps/dashboard/src/features/planBuilder/planDraft.ts`
   - `apps/dashboard/src/features/planBuilder/data/planDefaults.ts`
   - `apps/dashboard/src/features/planBuilder/components/WorkoutHero/`
   - `apps/dashboard/src/features/planBuilder/components/WorkoutCard/WorkoutCard.tsx`
   - `apps/dashboard/src/features/planBuilder/components/CardioWorkoutCard/CardioWorkoutCard.tsx`
   - `apps/dashboard/src/features/planBuilder/components/PlanEditor/`
   - `apps/dashboard/src/features/planBuilder/components/StartCards/StartCards.tsx`
   - `apps/dashboard/src/features/planBuilder/copy/he.ts`, `copy/en.ts`
   - `apps/dashboard/src/hooks/useUndoToast.ts`
3. `docs: plan builder delete-workout report`
   - `docs/phase-reports/plan-delete-workout.md`

```sh
git add -A -- apps/server/src/features/plans/planBuilder.service.ts apps/server/src/features/plans/__tests__/planBuilder.test.ts
git commit -m "fix(server): keep logged workout ids when a deleted workout is restored"
```

```sh
git add -A -- apps/dashboard/src/features/planBuilder/hooks/usePlanWorkouts.ts apps/dashboard/src/features/planBuilder/planDraft.ts apps/dashboard/src/features/planBuilder/data/planDefaults.ts apps/dashboard/src/features/planBuilder/components/WorkoutHero apps/dashboard/src/features/planBuilder/components/WorkoutCard/WorkoutCard.tsx apps/dashboard/src/features/planBuilder/components/CardioWorkoutCard/CardioWorkoutCard.tsx apps/dashboard/src/features/planBuilder/components/PlanEditor apps/dashboard/src/features/planBuilder/components/StartCards/StartCards.tsx apps/dashboard/src/features/planBuilder/copy/he.ts apps/dashboard/src/features/planBuilder/copy/en.ts apps/dashboard/src/hooks/useUndoToast.ts
git commit -m "feat(dashboard): delete a single workout from the plan builder with undo"
```

```sh
git add -A -- docs/phase-reports/plan-delete-workout.md
git commit -m "docs: plan builder delete-workout report"
```

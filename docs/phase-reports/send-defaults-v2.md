# Default messages v2: nutrition + workouts, one send rule, Settings redesign (2026-10-29)

## Summary
- Defaults are now `CoachProfile.defaults = { nutrition: { message, tip }, workouts: { message, tip } }` (GET / PATCH
  `/api/coach/profile/defaults`, coach only, her own). A kind never saved reads as nulls.
- **Migration: none needed.** The previous task already stored the nutrition default in `defaults.nutrition`, and no
  other shape was ever written, so there is nothing to move. Re-running anything is a no-op.
- Workout plans now carry what was sent: `Plan.introMessage` / `introTip` are set only by **publish**
  (`POST …/plans/:id/publish` with an optional body `{ introMessage?, introTip? }`). They are stored raw, `{name}` is
  filled with her first name when read (her plans and the coach's view), and they are never copied by "duplicate".
  Saving the plan and later default changes never touch them.
- **One send rule for every sheet**: `@sistem/shared` `sendNote.ts` + `useSendNote(kind, api)`, plus the sheet wording in
  `sharedCopy.sendNote`. Used by the dashboard nutrition send, the dashboard workout publish and coach mode's publish /
  "duplicate + publish".
  - With a default: the segmented control "הודעת ברירת המחדל | הודעה חדשה".
  - "שמירה כברירת מחדל" appears once the default text is edited.
  - In "new message" mode: the box + "לשמור כהודעת ברירת המחדל לתוכניות תזונה/אימונים".
  - Tip switch "לצרף את הטיפ הקבוע" (on by default, only when a tip exists).
  - With no default: the box + the tick + "הגדרת הודעה קבועה" → Settings.
  - "המתאמנת תקבל: הודעה + טיפ" above the send button.
- Settings redesign (dashboard): "הודעות שנשלחות עם התוכנית" header + two cards (side by side ≥ 960px, stacked below).
  - Each card: icon tile (bowl on purple tint, dumbbell on pink tint) and auto-growing fields with Barlow counters.
  - Live preview: a bubble with {name} → "מאיה", and the tip card "טיפ מ<first name>".
  - Save pill (disabled until changed → "נשמר ✓" for 2 s), "מחיקת ההודעה", and the empty-state line.
  - Leaving with unsaved changes asks first.
- Trainee: Workouts tab shows the plan's message (same card as the nutrition note, open until read) + the tip card
  under it. Home's coach note uses the plan's message when there is one (else the plan notes, as before).

## Decisions to check
- **No-default tip**: the sheet only offers the fixed tip (switch). With no saved tip there is no tip field. The old
  "write a tip for this send" field is gone, as the brief describes only the switch.
- **Nutrition note written in the builder (step 3)**: if the draft already holds a different text, the sheet opens on
  "הודעה חדשה" with that text; otherwise on the default.
- **Workout message "read" state** is per device (localStorage); the nutrition one is on the server. A server flag
  would need a schema field: say if you want it.
- **Coach mode has no settings page** for this, so the "הגדרת הודעה קבועה" link opens the dashboard's Settings
  (hidden when no dashboard address is set).
- Coach mode's "duplicate last week + publish" also carries the message + tip (it publishes too).
- "מחיקת ההודעה" clears both the message and the tip of that card, after a confirm.
- New tokens (tokens.css "Default messages" block): the card radius 24, field fill #f5f3f6, icon tiles from the existing
  purple / pink tints, the dumbbell ink = the existing #c80058.

## Not done / open
- Unsaved-changes guard: catches reload / close and in-app link clicks. The browser Back button is not caught (the
  dashboard router has no navigation blocker).
- The sheets keep their existing open/close timing (dashboard 360 ms modal, mobile Modal), as in the last report.
- Copy is PLACEHOLDER where the brief gave none (section helper line, empty state, preview empty line, confirms, English).
- **Fixed on the way (pre-existing bug)**: coach mode's trainee page crashed on first render (`usePlanQuickEdit` called
  `addDaysToDate('', 7)` before the trainee loaded → blank screen). One-line guard.
- Dev data: the dev coach (coach@sistem.dev) now has sample defaults saved for both kinds (from the screenshots).
  Nothing was published. The trainee view's message was injected in the browser only.

## Files
Added
- packages/shared/src/sendNote.ts, packages/shared/src/hooks/useSendNote.ts
- apps/dashboard/src/components/common/SegmentedControl/{SegmentedControl.tsx,SegmentedControl.css}
- apps/dashboard/src/features/sendDefaults/{hooks/usePlanSendNote.ts, components/SendNoteSection/{SendNoteSection.tsx,SendNoteSection.css}}
- apps/dashboard/src/features/coachSettings/components/{SendDefaultsSection,DefaultsPreview}/(.tsx + .css)
- apps/dashboard/src/hooks/useUnsavedChangesGuard.ts
- apps/mobile/src/features/coach/{components/SendNoteFields/(.tsx + .css), hooks/useWorkoutSendNote.ts}
- apps/mobile/src/features/workouts/{components/PlanCoachMessage/(.tsx + .css), data/planIntroSeen.ts}
- docs/phase-reports/send-defaults-v2.md + send-defaults-v2/ (screenshots)

Modified
- server: coachProfiles/{coachProfile.model,coachProfile.service,coachDefaults.validation}.ts, coach/coach.controller.ts,
  plans/{plan.model,plan.types,plan.constants,plan.validation,plan.service,planBuilder.service,traineePlan.service}.ts,
  tests: nutrition/__tests__/nutritionApi.test.ts, plans/__tests__/{planBuilder,planStatus}.test.ts
- packages: types/src/{index,accounts}.ts, api-client/src/coachApi.ts, shared/src/{index.ts,copy/he.ts,copy/en.ts},
  tokens/tokens.css
- dashboard: Icon/iconPaths.ts (bulb, bowl), coachSettings/{SendDefaultsCard (.tsx/.css), hooks/useSendDefaults.ts,
  copy/he.ts, copy/en.ts, pages/CoachSettingsPage.tsx}, nutrition/{NutritionEditor.tsx, copy/he.ts, copy/en.ts},
  planBuilder/{PlanEditor.tsx, hooks/usePlanEditor.ts}, services/coachProfile/coachDefaultsService.ts
- mobile: coach/{ConfirmSheet.tsx, TraineePlan.tsx, hooks/usePlanQuickEdit.ts}, services/coach/coachService.ts,
  workouts/{WorkoutsScreen.tsx, hooks/useWeekPlan.ts}, home/hooks/useHomeData.ts

Deleted (replaced by the shared rule + SendNoteSection)
- apps/dashboard/src/features/nutrition/{components/SendNote, components/SendNoteField, data/sendNote.ts, hooks/useSendNote.ts}

## Dependencies
None added or removed.

## How to test
- `npm test`: server 698 passed. New: the publish message + tip are stored raw, `{name}` filled for her and the coach,
  limits / unknown keys refused, saving the plan keeps them, duplicate doesn't copy them, defaults don't rewrite them,
  and the workouts default is separate from nutrition. i18n parity 39 passed.
- `npm run lint`: oxlint (old warnings only) + i18n audit + contrast audit clean.
- Manual:
  1. Dashboard `/settings`: type in both cards, check the preview, Save → "נשמר ✓", then delete.
  2. Type and click a sidebar link → confirm.
  3. Plan builder → Publish: default / new / tip off. The line above the button follows.
  4. Nutrition builder → Publish: the same.
  5. Mobile coach mode → trainee → אימונים → "שכפול השבוע שעבר ופרסום" / "פרסום": the same sheet.
  6. After a publish with a message, her Workouts tab shows the card + the tip.

Screenshots (`docs/phase-reports/send-defaults-v2/`):
1. Settings, desktop, empty
2. Settings, desktop, filled with preview
3. Settings, phone width
4. Dashboard workout publish, default mode
5. Dashboard workout publish, new message, tip off
6. Dashboard nutrition send, default edited ("שמירה כברירת מחדל")
7. Coach mode publish sheet, default mode
8. Coach mode publish sheet, new message, tip off
9. Trainee Workouts tab: message + tip

## Suggested commits
```
git add -A -- apps/server/src/features/coachProfiles apps/server/src/features/coach/coach.controller.ts apps/server/src/features/plans apps/server/src/features/nutrition/__tests__/nutritionApi.test.ts packages/types/src/index.ts packages/types/src/accounts.ts packages/api-client/src/coachApi.ts
git commit -m "feat(server): workouts send defaults and a message + tip sent with a workout plan publish"

git add -A -- packages/shared/src/sendNote.ts packages/shared/src/hooks/useSendNote.ts packages/shared/src/index.ts packages/shared/src/copy/he.ts packages/shared/src/copy/en.ts packages/tokens/tokens.css
git commit -m "feat(shared): one send-note rule (default | new message, fixed tip) for both coach apps"

git add -A -- apps/dashboard/src/components/common/SegmentedControl apps/dashboard/src/components/common/Icon/iconPaths.ts apps/dashboard/src/features/sendDefaults apps/dashboard/src/features/nutrition apps/dashboard/src/features/planBuilder/components/PlanEditor/PlanEditor.tsx apps/dashboard/src/features/planBuilder/hooks/usePlanEditor.ts apps/dashboard/src/features/coachSettings apps/dashboard/src/hooks/useUnsavedChangesGuard.ts apps/dashboard/src/services/coachProfile/coachDefaultsService.ts
git commit -m "feat(dashboard): message + tip in both send flows and a redesigned default messages section in Settings"

git add -A -- apps/mobile/src/features/coach/components/SendNoteFields apps/mobile/src/features/coach/hooks/useWorkoutSendNote.ts apps/mobile/src/features/coach/components/ConfirmSheet/ConfirmSheet.tsx apps/mobile/src/features/coach/components/TraineePlan/TraineePlan.tsx apps/mobile/src/services/coach/coachService.ts apps/mobile/src/features/workouts/components/PlanCoachMessage apps/mobile/src/features/workouts/data/planIntroSeen.ts apps/mobile/src/features/workouts/components/WorkoutsScreen/WorkoutsScreen.tsx apps/mobile/src/features/workouts/hooks/useWeekPlan.ts apps/mobile/src/features/home/hooks/useHomeData.ts
git commit -m "feat(mobile): message + tip on coach mode publish, and the workout plan message on her Workouts tab"

git add -A -- apps/mobile/src/features/coach/hooks/usePlanQuickEdit.ts
git commit -m "fix(mobile): coach trainee page no longer crashes before the trainee loads"

git add -A -- docs/phase-reports/send-defaults-v2.md docs/phase-reports/send-defaults-v2
git commit -m "docs: default messages v2 report and screenshots"
```

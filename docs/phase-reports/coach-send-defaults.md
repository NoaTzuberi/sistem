# Coach default message + tip when sending a nutrition plan (2026-10-29)

## Summary
- Audit: the message to the trainee already existed as the plan's `introMessage` (builder step 3, autosaved on the working
  copy, frozen into each `NutritionPlanVersion` on publish, shown by the trainee's `CoachCard`). It is reused, not duplicated.
  Added ONE field next to it: `introTip` (≤ 300) on the working copy + version → trainee API `plan.introTip`.
- Saved defaults: `CoachProfile.defaults.nutrition { message ≤ 600, tip ≤ 300 }` — keyed by plan kind so workout plans can
  add `defaults.workouts` later (no workout UI). `GET / PATCH /api/coach/profile/defaults` (coach only, always her own —
  the id comes from her token), trimmed, '' / null = not set, unknown keys refused.
- The version stores the text **as sent** (raw). `{name}` is filled with her first name when read (trainee API + the
  coach's view of the published version), so a later default never changes what she received.
- Dashboard send sheet = the existing publish modal (`PublishModal` got a `children` slot): "הודעה למתאמנת" and "הטיפ שלי",
  each with the default switch (hidden when no default), editable for this send, "עדכון ברירת המחדל" link (on + edited) or
  "לשמור כ… ברירת המחדל" tick (off), `{name}` hint, counter, and the line "המתאמנת תקבל: הודעה + טיפ". Sending with
  nothing is allowed. On send the chosen texts go into the draft, then the existing save + publish runs.
- Settings (`/settings`): new "הודעות ברירת מחדל" card above Payments — two textareas with counters, save, empty state.
- Trainee (mobile Nutrition tab): a tip shows under the coach's note as a soft pink card with a bulb, "טיפ מ<first name>";
  coach mode's read-only view shows it too ("טיפ מהמאמנת"). A tip alone counts as unseen / read like the note.

## Decisions to check
- **Opening the sheet**: what the draft already holds wins. Draft empty or equal to the default → switch ON with the default;
  draft has her own text (typed in step 3 or sent last time) → OFF with that text. Turning OFF restores her own text (empty
  if she had none), not always an empty box.
- Step 3 still edits the message (same field as the sheet). The tip is chosen only in the sheet.
- The sheet's message keeps the plan limit (1,500); saving it as a default needs ≤ 600 (the option is disabled above that,
  with a note).
- A tick "save as default" is saved just before the publish; if that save fails the send still goes.
- `{name}` works with the current rendering (filled on the server when read). Report: no problem.

## Not done / open
- **Coach mode (mobile) has no nutrition send** — nutrition is published only from the dashboard, so the sheet exists only
  there. The defaults section is only in the dashboard Settings (coach mode never sends nutrition).
- **Notification**: notifications store type + data only and the trainee app has no inbox (PRD 13a+) — nothing to add there.
- The shared publish modal keeps its existing timing (360 ms in, `--transition-modal-in`) rather than 300/200 — changing it
  would also change the workout plan's publish modal. Say if you want it changed for both.
- Copy is PLACEHOLDER (the task's wording where given; the rest drafted — Settings empty state, hints, previews, English).

## Files
Added
- apps/server/src/features/coachProfiles/coachDefaults.validation.ts
- apps/server/src/features/nutrition/introText.ts
- apps/dashboard/src/services/coachProfile/coachDefaultsService.ts
- apps/dashboard/src/features/nutrition/data/sendNote.ts
- apps/dashboard/src/features/nutrition/hooks/useSendNote.ts
- apps/dashboard/src/features/nutrition/components/SendNote/{SendNote.tsx,SendNote.css}
- apps/dashboard/src/features/nutrition/components/SendNoteField/{SendNoteField.tsx,SendNoteField.css}
- apps/dashboard/src/features/coachSettings/hooks/useSendDefaults.ts
- apps/dashboard/src/features/coachSettings/components/SendDefaultsCard/{SendDefaultsCard.tsx,SendDefaultsCard.css}
- apps/mobile/src/features/nutrition/components/CoachTip/{CoachTip.tsx,CoachTip.css}
- docs/phase-reports/coach-send-defaults.md + coach-send-defaults/ (screenshots)

Modified
- server: coachProfiles/{coachProfile.model,coachProfile.service,coachProfile.controller}.ts, coach/coach.routes.ts,
  nutrition/{nutritionPlan.model,nutritionPlan.service,nutrition.validation,nutrition.constants,nutrition.types}.ts,
  nutrition/__tests__/nutritionApi.test.ts, i18n/locales/{he,en}.ts
- packages: types/src/{index,accounts}.ts, api-client/src/{accountsApi,index}.ts
- dashboard: components/common/PublishModal/PublishModal.{tsx,css}, features/nutrition/{nutritionDraft.ts,
  components/NutritionEditor/NutritionEditor.tsx, copy/he.ts, copy/en.ts}, features/coachSettings/{copy/he.ts, copy/en.ts,
  pages/CoachSettingsPage/CoachSettingsPage.tsx}
- mobile: features/nutrition/{components/NutritionScreen/NutritionScreen.tsx, components/NutritionPlanView/NutritionPlanView.tsx,
  copy/he.ts, copy/en.ts}

## Dependencies
None added or removed.

## How to test
- `npm test` — server 697 passed (new test: defaults API rules, tip saved / published, `{name}` filled, changing the
  default never changes a sent version, tip-only = unseen) + i18n parity.
- `npm run lint` — oxlint + i18n audit + contrast audit clean (one old warning in mobile AuthContext).
- Manual: dashboard `/settings` → save a message with `{name}` and a tip. Open a trainee's nutrition builder → Publish:
  both switches ON with the defaults; edit → "עדכון ברירת המחדל"; switch OFF → own text + tick. Publish → trainee app
  Nutrition tab shows the note with her first name and the tip card under it.

Screenshots (`docs/phase-reports/coach-send-defaults/`): 1 Settings empty state · 2 send sheet ON · 3 message edited
(update-default link) + tip OFF · 4 trainee view. The ON / trainee shots used defaults / a tip mocked in the browser page —
nothing was saved or published to the dev database.

## Suggested commits
```
git add -A -- apps/server/src/features/coachProfiles apps/server/src/features/coach/coach.routes.ts apps/server/src/features/nutrition/introText.ts apps/server/src/features/nutrition/nutritionPlan.model.ts apps/server/src/features/nutrition/nutritionPlan.service.ts apps/server/src/features/nutrition/nutrition.validation.ts apps/server/src/features/nutrition/nutrition.constants.ts apps/server/src/features/nutrition/nutrition.types.ts apps/server/src/features/nutrition/__tests__/nutritionApi.test.ts apps/server/src/i18n/locales/he.ts apps/server/src/i18n/locales/en.ts packages/types/src/index.ts packages/types/src/accounts.ts packages/api-client/src/accountsApi.ts packages/api-client/src/index.ts
git commit -m "feat(server): coach send defaults (message + tip) and a tip on nutrition plan versions, {name} filled on read"

git add -A -- apps/dashboard/src/components/common/PublishModal apps/dashboard/src/services/coachProfile/coachDefaultsService.ts apps/dashboard/src/features/nutrition/nutritionDraft.ts apps/dashboard/src/features/nutrition/data/sendNote.ts apps/dashboard/src/features/nutrition/hooks/useSendNote.ts apps/dashboard/src/features/nutrition/components/SendNote apps/dashboard/src/features/nutrition/components/SendNoteField apps/dashboard/src/features/nutrition/components/NutritionEditor/NutritionEditor.tsx apps/dashboard/src/features/nutrition/copy/he.ts apps/dashboard/src/features/nutrition/copy/en.ts apps/dashboard/src/features/coachSettings
git commit -m "feat(dashboard): nutrition send sheet with default message + tip, and default messages in Settings"

git add -A -- apps/mobile/src/features/nutrition/components/CoachTip apps/mobile/src/features/nutrition/components/NutritionScreen/NutritionScreen.tsx apps/mobile/src/features/nutrition/components/NutritionPlanView/NutritionPlanView.tsx apps/mobile/src/features/nutrition/copy/he.ts apps/mobile/src/features/nutrition/copy/en.ts
git commit -m "feat(mobile): coach tip card under the nutrition note"

git add -A -- docs/phase-reports/coach-send-defaults.md docs/phase-reports/coach-send-defaults
git commit -m "docs: coach send defaults report"
```

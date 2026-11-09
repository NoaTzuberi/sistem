# Duplicate-plan loop fix + multi-week plans (step 1: preview)

## Summary

- **Bug fixed.** With only drafts, "שכפול השבוע שעבר" copied the most recent earlier plan of ANY status — an empty draft.
  The new draft opened in the builder, whose empty week again offered "duplicate last week" → back to the popover →
  another empty copy. Nothing ever failed, so there was never a message. A second issue: when a create DID fail,
  `confirm()` called `open()` again, which cleared the error it had just set (a silent reopen).
- Now: only PUBLISHED plans are ever copied (server-enforced); the popover shows a "duplicate from" list (all of her
  published plans, any trainee, past weeks too, newest first); nothing published → an empty state; a week with a
  draft → a replace / open / cancel question; every server error → a specific line + "נסי שוב". No automatic retries.
- **Multi-week plans: preview only** (below). Waiting for "approved".

## Cause, exactly

1. `createCoachPlan` (`duplicatePrevious`) and `listPlanWeekOptions` (`copiesFromWeek`) used
   `Plan.findOne({ coachingId, weekStartDate: { $lt } })` with no status filter → drafts (often empty) were the source.
2. `PlanEditor.goDuplicateWeek` → Plans tab with the popover in duplicate mode → first free week → copy of the empty
   draft → builder of an empty draft → its StartCards "duplicate last week" → step 2 again. A loop, no error.
3. `useNewPlanPopover.confirm` catch → `void open(...)` → `setError(undefined)`: any real error vanished at once.
   No effect / re-render loop was found otherwise (`TraineePlans` effects are guarded by `openedFromLink` and
   `onNewPlanHandled`).

## Files changed

Added
- `apps/dashboard/src/features/trainees/components/DuplicateSources/DuplicateSources.tsx` + `.css` — list + empty state
- `apps/dashboard/src/features/trainees/data/newPlanStart.ts` — pure rules (open / duplicate / create; default source)
- `apps/dashboard/src/features/trainees/data/planCreateErrors.ts` — server code → message
- `scripts/duplicate-plan.test.ts` — client rule tests
- `docs/phase-reports/duplicate-fix-and-blocks.md` + screenshots folder

Modified
- Server: `plans/planBuilder.service.ts` (published-only source, `sourcePlanId`, `replaceDraft`, `PlanWeekHasDraftError`,
  `listDuplicateSources`), `plans/plan.validation.ts`, `plans/planWeekOptions.service.ts`, `coach/coach.controller.ts`,
  `coach/coach.routes.ts` (GET `/api/coach/trainees/:id/plan-sources`), `i18n/locales/{he,en}.ts`, tests
  `plans/__tests__/planBuilder.test.ts`, `plans/__tests__/planWeekOptions.test.ts`
- `packages/types/src/index.ts` (`CreatePlanPayload.sourcePlanId / replaceDraft`, `PlanDuplicateSource`, `PlanWeekHasDraftBody`)
- `packages/api-client/src/coachApi.ts` (`PlanRequestError.code / status / planId`, `listPlanSources`)
- Dashboard: `hooks/useNewPlanPopover.ts`, `NewPlanPopover.tsx/.css`, `TraineePlans.tsx`, `copy/{he,en}.ts`,
  `services/coach/coachService.ts`, `components/common/ConfirmDialog/ConfirmDialog.tsx/.css` (optional middle button)
- `vitest.i18n.config.mts` (runs the new client test)

Not committed (gitignored): `docs/design-preview/plan-block-builder.html`, `docs/design-preview/plan-block-trainee.html`.

## Dependencies

None added or removed.

## How to test

- `npm test` → server plans + coach: 152 passed; copy + client: 45 passed.
- `npm run lint` (oxlint + i18n + contrast audits) clean; `tsc -b` for dashboard + mobile, `tsc --noEmit` for server clean.
- Browser, against a **sandbox** (server 5003 on an in-memory MongoDB seeded by `seed:dev`; dashboard 5184, mobile 5183).
  Nothing was written to the dev database.
  - [x] Only drafts: builder → "duplicate last week" → popover shows the empty state (after-1).
  - [x] A published plan of another trainee: listed with "של Dev Trainee Two" and the workout count (after-2).
  - [x] Draft week + duplicate → the question; "להחליף את הטיוטה" replaces in place (same plan id) (after-3, after-5).
  - [x] Forced 409 `plan_source_not_found`: one request per press, message + "נסי שוב", no reopen (after-4).
  - [x] 390px: no sideways scroll (after-6).
- Mobile coach mode's "duplicate last week (+ publish)" now also copies only the last PUBLISHED week — its existing
  error lines show `plan_nothing_to_duplicate` when there is none.

## Known issues / decisions for you

1. **"בחירת תבנית" is not shown.** There is no training-template screen or API yet (only nutrition templates; the
   `Template` model has workouts but no routes). I left the button out rather than add a dead one. Build training
   templates (PRD §6 mentions "from a template"), or drop the button?
2. The empty-state text still says "…או להתחיל מתבנית" (your wording). Keep or trim until templates exist?
3. The "duplicate from" list shows the 40 newest published plans. Enough?
4. Ended coachings' plans are included (with the trainee's name). OK?
5. The draft question has three buttons; at 380px the cherry "replace" wraps to its own line (after-3). Fine, or stack all three?

## Hebrew copy (DRAFT, feminine)

| Key | Hebrew | English |
| --- | --- | --- |
| sourcesLabel | לשכפל מתוכנית | Duplicate from |
| sourceOf | של {name} | {name}'s |
| confirm | שכפול ל־{range} | Duplicate to {range} |
| emptyTitle | עדיין אין תוכניות שפורסמו לשכפול | No published plans to duplicate yet |
| emptyText | אפשר לבנות תוכנית חדשה או להתחיל מתבנית | You can build a new plan or start from a template |
| emptyBuild | בניית תוכנית חדשה | Build a new plan |
| draftTitle | כבר יש טיוטה לשבוע הזה | This week already has a draft |
| draftText | אפשר להחליף אותה בעותק של התוכנית שבחרת, או לפתוח אותה ולהמשיך ממנה. | You can replace it … or open it … |
| draftReplace | להחליף את הטיוטה | Replace the draft |
| draftOpen | לפתוח את הטיוטה הקיימת | Open the existing draft |
| retry | נסי שוב | Try again |
| plan_week_taken | לשבוע הזה כבר יש תוכנית שפורסמה. בחרי שבוע אחר, או פתחי אותה. | … |
| plan_week_too_early | השבוע הזה כבר עבר. בחרי את השבוע הנוכחי או שבוע מאוחר יותר. | … |
| plan_source_not_found | התוכנית שבחרת כבר לא זמינה (אולי הפרסום שלה בוטל). בחרי תוכנית אחרת. | … |
| plan_nothing_to_duplicate | אין תוכנית שפורסמה לשכפול. אפשר לבנות תוכנית חדשה. | … |
| plan_locked | המתאמנת כבר התחילה אימון מהתוכנית בשבוע הזה, אז אי אפשר להחליף אותה. פתחי אותה לעריכה. | … |
| network | אין חיבור לשרת. בדקי את החיבור ונסי שוב. | … |
| unknown | משהו השתבש ביצירת התוכנית. נסי שוב בעוד רגע. | … |

---

# Multi-week (monthly) plans — step 1: audit + preview (NOT built)

## Audit: how it works today

- **Plan = one week.** `Plan` has `weekStartDate` (a Sunday in her zone) and unique `(coachingId, weekStartDate)`.
- **Her current week**: `traineePlan.service` finds `{ weekStartDate: thisSunday, status: 'published' }`; Workouts lists
  past / current / upcoming plans by `weekStartDate`; "Next week" shows a published next-week plan.
- **Status** (done / missed / upcoming) = `planStatus.ts` from `weekStartDate + dayOfWeek`; a session starts only from
  this week's published plan.
- **Logs / PRs / achievements / streak** point at `planId + workoutId` and count weeks by plan.
- **Coach**: status `needsNextWeekPlan`, the attention rule (first plan week), the week picker (8 weeks), tab dots, the
  `plan_published` notification (one per plan), the AI draft (one week), mobile quick actions.

## What would break with "one Plan holding N weeks"

Every reader of `plan.workouts` (builder, trainee views, session, logs, statuses, AI, mobile coach mode), every
`weekStartDate: thisWeek` lookup (a block that started earlier would not be found), and the unique index (it would no
longer stop overlapping plans). That is most of the app.

## Proposed model (adjusted to the code)

Keep one Plan per week; group the weeks with a small block record. Everything week-based keeps working untouched.

```
PlanBlock (new): _id, coachingId, traineeId, coachId,
  startWeek 'YYYY-MM-DD' (Sunday), lengthWeeks 2–8 (default 4),
  status draft | published (all its weeks publish / unpublish together),
  deloadLastWeek: boolean, endingNotifiedAt: Date | null
Plan (+2 optional fields): blockId (null = weekly, as today), blockWeek 1..N
Unique (coachingId, weekStartDate) stays → a block can never overlap another plan.
Existing plans = weekly (blockId null): no migration.
Trainee APIs hide block weeks after this week ("נפתח ביום א׳"); past weeks stay in history.
Progression / deload are applied when copying (targets written into each week), not live rules.
```

## Builder, publishing, coach views

- Length selector when creating: "שבועית" / "חודשית — 4 שבועות" + a 2–8 stepper.
- Week tabs (שבוע 1 · 2 · 3 · 4) as the segmented control; each tab edits that week's normal Plan.
- "העתקה לשבועות הבאים": copies the current week into the later weeks of the block.
- **Progression: easy** — one optional choice per exercise (+2.5 ק״ג / +1 חזרה per week), applied by a pure function
  in `planDraft.ts` at copy time.
- **שבוע קל: easy** — sets × 0.7, rounded, at least 1, on the last week at copy time.
- One publish for the whole block (one notification); the server checks every week (same `findPublishIssues`).
- Coach Workouts tab: the block as one row of weeks, the current week highlighted, done / missed per week.
- "התוכנית של <name> מסתיימת השבוע": **there is no scheduler in the server.** Proposal: create it the first time the
  coach's Today / notifications load during the block's last week (dedupe key `block_ending:<blockId>`). Adding a cron
  job would be a new architecture piece — your call.

## Owner decisions so far (2026-11-09)

- "בחירת תבנית" is dropped and "תבנית" leaves the empty-state text (training templates = a later feature). Not changed in
  code yet; it lands with the build.
- Approved: the PlanBlock model above, and the lazy "מסתיימת השבוע" notification (no scheduled job).
- Required: the length choice ("שבועית" / "חודשית") is the FIRST control of "תוכנית חדשה", in the dashboard and in mobile
  coach mode, with the click path in the build report.

## Preview v2: "alive" builder + trainee stage (still preview only)

Builder (`docs/design-preview/plan-block-builder.html`, interactive: weeks, workouts, stepper 2–8, שבוע קל, copy):
- Length first: segmented "שבועית / חודשית" + stepper (2–8). Weekly hides everything block-related.
- **Block ribbon**: one card per week: "שבוע N" (Karantina), dates, volume number + a vertical volume bar. The bars' bottoms
  line up, so the rise (4,190 → 4,425 → 4,660 ק״ג) and the deload dip (3,320) read across the row.
  Volume = Σ sets × reps × kg; a week with no weights = total sets.
- **One color per week**: 1 pink, 2 purple, 3 orange, 4 blue (the existing `--color-workout-1…4` values, exactly the
  colors you named), cycling for 5–8. Selected = its fill, scale 1.02 + a shadow in its color; others = its soft tint;
  not copied yet = white with a faint outline in its color + "עדיין ריק"; deload = its soft tint + "שבוע קל" chip (also
  when selected: outlined + lifted instead of filled).
- **Progression chips** vs the previous week, in the week's tint with its dark text tone: "+2.5 ק״ג ↑", "+1 חזרה ↑",
  deload "−30% נפח ↓" (numbers in `<bdi dir="ltr">`). Week 1 shows each exercise's rule as a small menu button instead.
- **"העתקה לשבועות הבאים"**: a pink pill. The later cards start white and fill with their tint one after another
  (60 ms apart, 260 ms each, transform only), each bar grows after its card, then the toast "הועתק לשבועות 2–4".
  Reduced motion: instant. Disabled on the last week.

Trainee Workouts (`docs/design-preview/plan-block-trainee.html`):
- Pink stage: "שבוע" (Karantina) + "02" (Barlow Condensed 64px) + "מתוך 4", dates, 4 segments (done = white, current =
  half white, future = white 25%).
- "השבוע: משקלים עולים ב־3 תרגילים" as a white chip with pink ink text (white text on a light tint is not allowed).
  Shown only when this week raises a weight vs last week.
- Future weeks: locked cards (lock icon, muted, no tap): "נפתח ביום א׳" for next week, the date for later ones.

Decisions in v2 worth a look:
1. **Text on a week's fill**: white on pink and purple; **ink** on orange and blue (white on #ff7a00 / #0094ff fails
   contrast for the small dates). Proposed tokens `--color-week-N`, `-soft`, `-text`, `-on` (aliases of the workout colors).
2. **Fill direction**: the cards fill in week order. You wrote "left→right". In Hebrew, week 1 is on the right, so
   they fill right→left; in English, left→right. Tell me if you want physical left→right in both.
3. Week colors reuse the workout identity colors, so a week card and a workout tab can show the same pink. The builder
   keeps workouts as neutral ink / soft pills under the ribbon, so they never compete.

## Screenshots (`docs/phase-reports/duplicate-fix-and-blocks/`)

| Before | After |
| --- | --- |
| `before-1-builder.jpg`: the weekly builder today | |
| `v1-preview-1-builder-1440.jpg`, `v1-preview-2-builder-390.jpg`: preview v1 (flat tabs) | `v2-1-builder-before-copy-1440.jpg`: ribbon, weeks 2–4 empty · `v2-2-builder-copy-animating-1440.jpg`: mid-copy (week 4 filling) · `v2-3-builder-copied-toast-1440.jpg`: week 2 selected, chips, toast · `v2-4-builder-deload-week-1440.jpg`: deload week · `v2-5-builder-6-weeks-colors-cycle-1440.jpg`: 6 weeks, colors cycling · `v2-6-builder-390.jpg`: phone width · `v2-7-builder-weekly-1440.jpg`: "שבועית" |
| `before-2-trainee-workouts.jpg`: her Workouts tab today · `v1-preview-3-trainee-workouts.jpg`: preview v1 | `v2-8-trainee-workouts-390.jpg`: pink stage "שבוע 02 מתוך 4", segments, progression line, locked weeks |
| | `after-1 … after-6`: the duplicate fix (see How to test) |

Preview copy is DRAFT and not in the code yet. No sideways scroll at 390 / 1440 in any shot.

**Waiting for "approved" (and answers to the questions above) before building the multi-week feature.**

## Suggested commits

1. `fix(server): duplicate only published plans, pick a source, ask before replacing a draft`
2. `fix(dashboard): duplicate-from list, empty state, draft question and clear errors in the new-plan popover`
3. `docs: report for the duplicate loop fix and the multi-week plan preview`

```
git add -A -- apps/server/src/features/plans apps/server/src/features/coach/coach.controller.ts apps/server/src/features/coach/coach.routes.ts apps/server/src/i18n/locales/he.ts apps/server/src/i18n/locales/en.ts packages/types/src/index.ts packages/api-client/src/coachApi.ts
git commit -m "fix(server): duplicate only published plans, pick a source, ask before replacing a draft"
git add -A -- apps/dashboard/src/features/trainees apps/dashboard/src/components/common/ConfirmDialog apps/dashboard/src/services/coach/coachService.ts scripts/duplicate-plan.test.ts vitest.i18n.config.mts
git commit -m "fix(dashboard): duplicate-from list, empty state, draft question and clear errors in the new-plan popover"
git add -A -- docs/phase-reports/duplicate-fix-and-blocks.md docs/phase-reports/duplicate-fix-and-blocks
git commit -m "docs: report for the duplicate loop fix and the multi-week plan preview"
```

# Plan builder — the "+ אימון" menu, and cardio as a workout inside the weekly plan

Date: 2026-10-21. Follows `cardio-and-slide.md`. References: `docs/design/coach-cardio-builder.html` (the cardio editor) and
the "+ תוכנית חדשה" popover (the menu's look).

## Summary

1. **The "+ אימון" menu**
   - It is a portal on `<body>`, placed next to its trigger and flipped / shifted when there is no room, so the week rail
     and cards can no longer clip it.
   - Two rows: "אימון כוח" (pink tile, dumbbell) and "אימון קרדיו" (purple tile, pulse), each with its subtitle.
   - Keyboard: Esc, ↑ ↓ Home End and Enter; outside press closes it; the focus returns to the trigger.
2. **Cardio is now a workout of the weekly plan:** `PlanWorkout.kind = 'cardio'` plus
   `cardio { sport, metric, steps }`.
   - It uses the workout's own day, note, order, duplicate / delete / move, autosave and publish.
   - The separate cardio page, its session API and its side cards are gone.
3. **One-off migration at server start:** sessions saved on the old route became plan workouts. It has already run on the
   dev DB: 1 session → a Thursday cardio workout in that trainee's published plan for 25 Oct.
4. **Trainee app:** cardio comes from the plan's workouts. The day detail on Home, the Workouts cardio section, the detail
   page, the player and the finish log all work on the plan workout.

## What changed

### Server
- **Plan schema** (`planWorkout.schema.ts`, `plan.types.ts`, `plan.constants.ts`): optional `kind` (`'strength' |
  'cardio'`; missing = strength, so every existing plan reads as before) and `cardio { sport, metric, steps }`.
- **Save** (`plan.validation.ts`):
  - a cardio workout is parsed by `parsePlanCardio`: the same block / repeat-set rules as before (15 s – 90 min, 1–30
    rounds, intensity 1–10, at least one block);
  - it must have no exercises (`plan_cardio_no_exercises`) and drops `workoutType`.
- **Publish:** a cardio workout needs no exercises. An empty strength workout still blocks publishing.
- **Public / coach plans** (`plan.service.ts`): `kind` + `cardio` are sent for cardio workouts.
- **Statuses:**
  - `traineePlan.service.ts` and the coach plan list's progress (`planBuilder.service.ts`) count a `CardioLog` as the
    workout's completed log (done / `logId`).
  - `pickNextWorkoutId` skips cardio: "start next workout" stays a strength session.
- **`workoutSession.service.ts`:** a cardio workout never starts a strength session (404).
- **Cardio feature:**
  - `CardioLog` is now keyed by `planId + workoutId` (one log per cardio workout), with `workoutTitle` and `date` (the
    workout's day, else the day she ran it).
  - The `CardioSession` model and the coach session routes are removed.
  - **Trainee:** `GET /api/cardio/plans/:planId/workouts/:workoutId` (workout, date, status, log, coach name,
    `canStart`) and `POST /api/cardio/logs { planId, workoutId, … }`.
  - **Coach:** `GET /api/coach/trainees/:id/cardio-logs`.
- **Messages:** server messages updated (he + en).
- **Tests:** 8 cardio tests rewritten:
  - save, reject and publish rules;
  - trainee statuses and next-workout;
  - the page, the log and the 409 on a second log;
  - the coach's progress and logs;
  - the migration and its idempotence.

### Types / api-client / shared
- **`@sistem/types`:** `WorkoutKind` and `PlanCardio` on `PlanWorkout` / `PlanWorkoutInput`; `CardioLog` keyed by plan
  workout; `TraineeCardioWorkoutResponse`; `CoachCardioLogList`. The session types are removed.
- **`@sistem/api-client` `cardioApi.ts`:** `getCardioWorkout`, `saveCardioLog`, `listTraineeCardioLogs`.

### Dashboard
- **`AddWorkoutMenu` + `useAddWorkoutMenu`:**
  - portal, fixed and placed through CSS variables (`--awm-top / --awm-left / --awm-origin`);
  - it opens under the trigger's reading-start edge, or above it / shifted inward when there is no room, and re-places
    on scroll / resize;
  - white, radius 20, soft shadow, 8 px padding;
  - motion: 160 ms scale + opacity from the trigger corner, press 0.97, hover only for fine pointers, no animation with
    reduced motion.
- **`usePlanWorkouts`:**
  - the selected workout is kept in the URL (`?workout=<id>`; a new workout uses its client key until its first save,
    then its id);
  - adds a strength or a cardio workout ("אימון N", without a day), selects it and scrolls it into view;
  - duplicate (cardio blocks get fresh ids) and remove.
- **`WorkoutTabs`:** a cardio pill is purple (`.workout-kind-cardio` in `globals.css`), with a small pulse icon and its
  minutes ("26′") instead of exercises / sets.
- **`CardioWorkoutCard`**
  - **Header:** the same `WorkoutHero` as strength (dot, name, day select, "+ הערה לאימון", ⋯ with move / duplicate /
    delete); the hero got optional `stats` and an optional type select.
  - **Stats:** זמן כולל / בעצימות גבוהה / סבבים.
  - **Body:** `CardioEditor` (type and metric segmented controls, graph + legend, blocks with repeat sets, add buttons);
    logic in `useCardioEditor`, with the value owned by the plan draft.
- **`StartCards`:** an empty week now offers a fourth start, "אימון קרדיו", so cardio can be the first workout.
- **Plans tab calendar (`CalendarWorkout`):** a cardio workout shows "קרדיו · 26′".
- **Removed:**
  - the cardio page and route (`/trainees/:id/plans/:planId/cardio/:sessionId?`; nothing links to it any more);
  - `CardioBuilder`, `CardioBuilderHeader`, `CardioDayPicker` (replaced by the day select), `CardioPreview`,
    `CardioSummary`;
  - `useCardioBuilder`, `services/cardio`, the plan builder's old `CardioTab` and `WorkoutAddMenu`;
  - the "שמירה כטיוטה" / "הוספה לתוכנית" buttons and the "חוזר כל שבוע" switch (a workout repeats with the plan,
    e.g. "duplicate last week").
- **Copy:** `features/cardio/copy` trimmed to the editor and menu wording, plus the menu's subtitles (owner's wording).

### Mobile
- **Routes:** `/workouts/cardio/:planId/:workoutId` (detail) and `…/run` (full screen).
- **Home:** the day detail lists that day's cardio workouts (`CardioWeekList`). The week lanes and "השבוע 1/3" count
  them like any workout.
- **Workouts:**
  - the tickets are strength-only;
  - the cardio section lists the plan's cardio workouts;
  - the next-week preview picks the first strength workout.
- **Detail / run:** read `getCardioWorkout`. Title = the workout's name; the coach note = the workout's note. The run is
  stored per plan workout; the log saves `planId + workoutId`. The player itself is unchanged.
- **Coach mode `PlanCard`:** a cardio workout shows "קרדיו · 26′".

## The data migration

`cardio/cardioSessionMigration.ts` runs at every server start after the database connects, and is idempotent:
- **What it reads:** every session in the old `cardiosessions` collection that is not removed and has no `migratedAt`.
- **What it writes:** one cardio plan workout per chosen day (or one without a day), with title = name, note = note, and
  `kind 'cardio'` + `cardio { sport, metric, steps }`.
- **Which plans:**
  - the session's start week and, if it repeated weekly, every later plan she already has;
  - a start week without a plan gets a draft;
  - a draft session only goes into draft plans (nothing the coach had not added appears in her app); a draft whose week
    is already published is skipped and counted.
- **Old logs:** `cardiologs` documents with a `sessionId` are re-pointed to the new workout (by week + day).
- **Marking done:** the session gets `migratedAt`. The old collection is otherwise kept, so it can be inspected or
  dropped later.
- **Indexes:** `CardioLog.syncIndexes()` then drops the old `traineeId + sessionId + date` unique index and builds
  `traineeId + planId + workoutId`.

**Already ran on the dev DB** (your nodemon restarted the server on these changes):
- the 1 saved session (active, Thursday, week of 25 Oct) is now a Thursday cardio workout in that trainee's published
  plan;
- the indexes are updated;
- there were 0 cardio logs to move.

## Test checklist

Checked in headless Chrome against a **sandbox**: a second server on port 5003 with an in-memory database seeded by
`seed:dev`, and one legacy session inserted to exercise the startup migration. Nothing in the dev DB was written by
these checks. Both apps ran in he and en.

- [x] **The menu at every viewport:**
  - 1440 × 1000, 1024 × 768 and 390 × 844: a direct child of `<body>`, fully inside the viewport (at 390px: 78–378, in
    English 12–312 / 78–378), above the cards and the rail;
  - Esc closes it and the focus is back on "+ אימון";
  - keyboard: Enter opens it, the first row is focused, ↓ moves to "אימון קרדיו", Enter adds it.
- [x] **Strength and cardio in the same week:** the empty week's "מאפס" adds "אימון 1"; the menu → "אימון 2" cardio
      ("26′", intervals preset). The URL stays on the plan builder with `?workout=…`; the new card scrolls into view.
- [x] **Switching:** tab 1 → the strength card; tab 2 → the cardio card. A reload reopens the selected cardio workout from
      `?workout=<id>`.
- [x] **Day select and note on cardio:** day = Tuesday and note "Easy pace" are autosaved in the plan payload (`kind:
      'cardio'`, 3 steps, no exercises). A block edit (1:00 → 0:45) updates the tab to "24′".
- [x] **⋯ menu:** shows move up / move down / duplicate / remove; duplicate → a third tab; remove → back to two.
- [x] **Autosave:** the draft's PUTs carry the cardio workout (2 saves seen).
- [x] **Migrated cardio:** the published week shows "ריצה רציפה 35 דקות · יום חמישי · 35′" as a purple tab; its card
      shows the day select = Thursday, 35′ / 0:00 / —, 3 bars, 3 blocks.
- [ ] **Publish through "פרסום ל-<name>":** not run in the browser. Covered by the server test (a cardio-only plan
      publishes; an empty strength workout still blocks it).
- [x] **The trainee sees both on the right days:**
  - Home → Thursday's lane shows the cardio row "ריצה רציפה 35 דקות · 35′";
  - Workouts shows the strength tickets plus the cardio section ("יום חמישי · 35′");
  - the detail page shows "RUN · THU 22.10", 35′ / — / 0:00;
  - keyboard start → "WARM UP"; end early → save → "נשמר ונשלח ל…" and "בוצע"; the list shows "בוצע".
- [x] **Phone width (390px):** no sideways scroll on the plan builder with a cardio card.
- [x] **No console errors.**
- [x] **Automated:**
  - `npm run build` passes;
  - `npm run lint` passes (i18n + contrast audits clean);
  - `npm test` passes: server 43 files / 615 tests, copy + client 3 files / 33 tests.

Still to try by hand: a real touch device; Safari / Firefox; the menu with the page scrolled so that "+ אימון" sits at the
very bottom (it should open upward).

## Screenshots (`docs/phase-reports/plan-builder-cardio/`)

| Before | After |
| --- | --- |
| `before-1-add-menu.jpg`: the old in-row menu | `after-1-add-menu-1440.jpg`, `after-2-add-menu-390.jpg`: the portal menu with icon tiles |
| `before-2-separate-cardio-page.jpg`: the separate cardio page | `after-3-cardio-in-week.jpg`: cardio as "אימון 2" in the week, same header, editor in the card |
| | `after-4-migrated-cardio.jpg`: the migrated session as a Thursday workout |
| | `after-5-cardio-card-390.jpg`: the cardio card at phone width |
| | `after-6-trainee-home.jpg`, `after-7-trainee-workouts.jpg`: the trainee's Home (Thursday) and Workouts |

## Known issues / decisions

1. **"Start next workout" (Home's slide) stays strength-only.** A day whose only workout is cardio shows the next strength
   workout on the stage; the cardio one is in the day detail and opens its own player. A cardio slide on the stage
   would be a follow-up.
2. **Choosing a type (ריצה / אינטרוולים …) replaces the blocks with that preset but keeps the workout's name.** The old
   page renamed preset names; here the name belongs to the workout.
3. **Remove has no confirm for a cardio workout.** A strength workout asks only when it has exercises.
4. **The old `cardiosessions` collection stays in the DB** (marked `migratedAt`). Dropping it is a manual clean-up for
   later.
5. **The dev servers are down.** My sandbox clean-up (`pkill -f "tsx src/server.ts"`) most likely also stopped your dev
   server, and with it `dev:all` (5002 / 5173 / 5174 were not listening afterwards). Restart it with `npm run dev:all`.
   The migration has already run, so the restart does nothing to the data.

## Suggested commits

Shared file: `packages/types/src/index.ts` also holds another session's nutrition-mode changes (`NutritionPlanMode`,
`dailyPortions`, `category`, `coach`). Use `git add -p` and take only:
- the `import type { PlanCardio, WorkoutKind } from './cardio';` line;
- the two `kind` / `cardio` pairs;
- the `export * from './cardio'` lines at the end, if they show as new.

Not part of this task: `packages/tokens/tokens.css`, the dashboard nutrition files, `docs/design/*.html`.

1. `feat(server): cardio workouts live in the weekly plan (migration from cardio sessions)`
2. `feat(dashboard): add-workout menu and cardio workouts inside the plan builder`
3. `feat(mobile): cardio workouts read from the plan`
4. `docs: plan builder cardio report`

```bash
git add -p packages/types/src/index.ts   # the cardio import, the kind/cardio fields and the cardio re-export only
git add -A -- packages/types/src/cardio.ts packages/api-client/src/cardioApi.ts apps/server/src/features/cardio apps/server/src/features/plans/plan.constants.ts apps/server/src/features/plans/plan.service.ts apps/server/src/features/plans/plan.types.ts apps/server/src/features/plans/plan.validation.ts apps/server/src/features/plans/planBuilder.service.ts apps/server/src/features/plans/planStatus.ts apps/server/src/features/plans/planWorkout.schema.ts apps/server/src/features/plans/traineePlan.service.ts apps/server/src/features/workoutLogs/workoutSession.service.ts apps/server/src/features/coach/coach.routes.ts apps/server/src/i18n/locales/he.ts apps/server/src/i18n/locales/en.ts apps/server/src/server.ts
git commit -m "feat(server): cardio workouts live in the weekly plan (migration from cardio sessions)"

git add -A -- apps/dashboard/src/features/cardio apps/dashboard/src/services/cardio apps/dashboard/src/app/config/routes.ts apps/dashboard/src/app/router/AppRouter.tsx apps/dashboard/src/components/common/Icon/iconPaths.ts apps/dashboard/src/styles/globals.css apps/dashboard/src/features/planBuilder apps/dashboard/src/features/trainees/components/CalendarWorkout/CalendarWorkout.tsx
git commit -m "feat(dashboard): add-workout menu and cardio workouts inside the plan builder"

git add -A -- apps/mobile/src/app/config/routes.ts apps/mobile/src/features/cardio apps/mobile/src/services/cardio apps/mobile/src/features/home/components/HomeScreen/HomeScreen.tsx apps/mobile/src/features/home/components/WeekDayDetail/WeekDayDetail.tsx apps/mobile/src/features/workouts/components/WorkoutsScreen/WorkoutsScreen.tsx apps/mobile/src/features/coach/components/PlanCard/PlanCard.tsx
git commit -m "feat(mobile): cardio workouts read from the plan"

git add -A -- docs/phase-reports/plan-builder-cardio.md docs/phase-reports/plan-builder-cardio
git commit -m "docs: plan builder cardio report"
```

Keep the order: commits 2 and 3 import the types / api-client of commit 1.

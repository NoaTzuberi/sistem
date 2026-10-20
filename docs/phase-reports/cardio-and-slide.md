# Shared slide-to-start + cardio sessions (run / intervals / walk / bike)

Date: 2026-10-20. References (the spec): `docs/design/trainee-home-b.html` (the slide),
`docs/design/trainee-cardio.html` (detail → live player → finish), `docs/design/coach-cardio-builder.html`
(the coach builder). The review-only row ("לבדיקה") and "מהירות ×20" were not built.

## Summary

1. **One `SlideToStart`** (mobile `components/common/SlideToStart`, logic in `hooks/useSlideToStart.ts`)
   - white track, pink → purple trail, the label repeated in white inside the trail;
   - used on Home (today's workout) and on the cardio detail (floating);
   - the old translucent home slide is deleted.
2. **Cardio is a second workout kind** next to the strength Plan, which is unchanged:
   - `CardioSession` (days, repeats weekly) and `CardioLog`, with server-made statuses;
   - coach API under her trainee; trainee API at `/api/cardio`.
3. **Dashboard:** a cardio builder page, opened from the plan builder's new "+ אימון" menu. The week's
   sessions show next to the workout tabs.
4. **Mobile:** cardio days appear in Home's day detail and in Workouts. Each opens a detail screen, then
   3-2-1 → a live player (timestamps, wake lock, voice / buzz when switched on) → a finish log the coach
   can read.

## B1 — Audit (what existed, what was missing)

| Area | Found | Used / missing |
| --- | --- | --- |
| Plan / workouts | `Plan` = one per trainee per Sunday week, embedded `workouts[]` (title, one optional `dayOfWeek`, exercises). Status computed only on the server (`plans/planStatus.ts`). | Strength-only and one day per workout; nothing for duration / intensity blocks. Cardio got its own collection (below) instead of changing `Plan`. The status rule (`resolveWorkoutStatus`) is reused as is. |
| Trainee lists | Home: `GET /plans/week` → `HomeStage` (today's workout + slide), `WeekTrack`, `WeekDayDetail`. Workouts: `useWeekPlan` → up-next card, ticket carousel, next week. | No other workout kind. Cardio is added as rows in the day detail and as a Workouts section. |
| Workout log | `WorkoutLog` = sets per exercise, stats, rating / notes, Daily Pump. | Set-based, so it does not fit cardio. A separate `CardioLog` was added. |
| Interval bar on Home | `IntervalTimerEntry` → the free timer `/timer` (logs nothing); Phase 8 `PlanExercise.interval` (work / rest inside a strength workout). | Left as is: not cardio sessions. |
| Audio / vibration / awake | `intervalSounds.ts` (Web Audio beeps + the one mute setting), `services/haptics` (Capacitor, else `navigator.vibrate`), `hooks/useWakeLock.ts`. | Wake lock reused. Speech did not exist: `cardioCues.ts` guards `speechSynthesis` and `navigator.vibrate`. |
| Zone colors / type tokens | Karantina / Barlow / JetBrains Mono tokens existed. No zone tokens. | Zone tokens added (below). |

## Changes

### A. Shared slide

- **`SlideToStart`** — props `label`, `knobLabel?`, `completeLabel?`, `variant` (`inline` | `floating`),
  `onComplete`, `busy?`, `resetAfterMs?`. Classes use the `sts-` prefix.
- **`useSlideToStart`**
  - writes `--x` (px), `--p` (0–1) and `--tw` (track width, refreshed by a `ResizeObserver`) on the
    root: no re-render while dragging;
  - pointer capture and one finger only; past 80% it snaps to the end, buzzes and calls `onComplete`;
    otherwise it springs back in 420 ms on `transform`, `width` and `clip-path` only;
  - the knob is a button, so Enter / Space complete it;
  - it drags toward the inline end in both directions, and resets when a start fails (`busy` ends).
- **Visual**
  - white 62px track with a hairline; the trail = the knob offset + 62px, a brand gradient sized to
    the whole track and anchored at the start;
  - the white label is clipped to the trail; a mono "GO" (aria-hidden);
  - the knob's play icon is `color-mix`ed pink → purple by `--p`; on complete the play crossfades to a
    check and the knob pops (1.12, spring);
  - the floating variant is portaled to `<body>`, 28px above the bottom with 20px sides and its shadow.
- **Reduced motion:** the snap is instant and there is no pop.
- **Home:** "החליקי להתחלת אימון", then "האימון התחיל" for 1.8 s.
- **Cardio:** "החליקי להתחלת הריצה"; after 0.5 s it opens the run (3-2-1).
- **Removed:** `features/home/components/SlideToStart/` (`.tsx` + `.css`, the translucent track and the
  nudging chevron), `features/home/hooks/useSlideToStart.ts`, the tokens `--shadow-knob` and
  `--loop-nudge`, and the copy key `stage.startWorkout`. No other chevron / gradient-track slide existed.

### B2. Types + server

- **`@sistem/types` `cardio.ts`:** `CardioSport`, `CardioMetric` (`rpe` | `pace` | `speed` | `hrZone`),
  `CardioBlock` / `CardioRepeatSet` (`type: 'block' | 'repeat'`), `CardioSession` (`status` draft |
  active), `CardioLog`, payloads, `CardioOccurrence` (one day + status), and the responses.
- **Server `features/cardio`**
  - **Models:** `CardioSession` (traineeId, coachId, steps as checked Mixed, days, repeatsWeekly,
    weekStartDate, status, archivedAt) and `CardioLog` (unique trainee + session + date).
  - **`cardio.validation.ts`:** a block lasts 15 s – 90 min; intensity 1–10; a repeat set runs 1–30
    times and has at least one block; a session needs at least one block; an active session needs a day.
  - **`cardioSteps.ts`:** the timeline and totals math.
  - **`cardio.service.ts`**
    - **Which weeks:** a session shows in its own week and, if it repeats, every later week;
    - **Status:** the strength rule (done / missed / upcoming in her zone);
    - **`canStart`:** this week's day, not logged yet;
    - **Logs:** one per day, bounded by the session's own rounds and time; `roundsTotal` is set by the
      server; this week only;
    - **Removing a session:** archives it, so her logs stay.
- **Routes**
  - trainee: `GET /api/cardio/week?weekStart=`, `GET /api/cardio/sessions/:id?date=`, `POST /api/cardio/logs`;
  - coach (`loadCoachTrainee`): `GET|POST /api/coach/trainees/:id/cardio`, `GET|PUT|DELETE …/cardio/:sessionId`.
- **Other:** server messages `cardio_*` (he + en); 8 new tests (`cardio/__tests__/cardio.test.ts`).
- **`@sistem/api-client` `cardioApi.ts`:** `createCardioApi` (trainee) and `createCoachCardioApi`.
- **`@sistem/shared` `cardioDisplay.ts`**
  - THE zone rule `intensityZone` (1–3 Z1 · 4–5 Z2 · 6 Z3 · 7–8 Z4 · 9–10 Z5);
  - the timeline (`cardioTimeline`, `frameAt`), `cardioTotals` (high intensity = intensity ≥ 7), and
    `cardioProgress` (time / high intensity / whole rounds, minus skipped stretches);
  - `describeCardioTarget` (hrZone → "Z4 · קשה", otherwise "8/10 · מאמץ"), and labels and tips from
    shared copy `cardio.*`.

### B3. Dashboard builder (`features/cardio`, class prefix `cb-`)

- **Route:** `/trainees/:id/plans/:planId/cardio/:sessionId?` — one route, so a new session stays mounted
  when it gets its id.
- **Entry:** the plan builder's "+ אימון" opens a menu: "אימון כוח" (as before) and "אימון קרדיו". The
  week's sessions (drafts too) show as `CardioTab` pills after the workout tabs and open the builder.
- **Header:** back to the plan, avatar, "אימון קרדיו חדש · name", "יתווסף לתוכנית האימונים שלה, שבוע N"
  (N = the program week, counted as on the Plans tab), "שמירה כטיוטה" (draft) and "הוספה לתוכנית"
  (active). Once saved, a ⋯ menu offers delete.
- **Main card**
  - the name; "סוג" with the four presets, from `data/cardioPresets.ts`;
  - "איך מודדים עצימות";
  - totals and the "INTENSITY · N STEPS" eyebrow;
  - **the graph:** zone colors, a faint grid, height transitions, a hover / focus tip ("עבודה 2/8 ·
    1:00 · 8/10"); a click opens the block, dims the others and scrolls to it; a mono axis and the zone
    legend;
  - **block rows:** zone bar, kind disclosure with chips, duration ±15 s under 2:00 else ±1:00, a
    zone-tinted target stepper, delete;
  - **repeat sets:** ×N, "M:SS לסבב · M:SS סה״כ", nested rows;
  - **dashed add buttons:** a warm-up goes first, a cool-down last, others before a closing cool-down.
- **Side**
  - 7 day tiles, Sunday first: "כוח" in purple on days with a strength workout that week, pink when
    selected;
  - the hint and the weekly switch (Cherry Rose when on);
  - "הערה אליה";
  - the dark "כך היא תראה את זה" preview.
- **Logic:** `hooks/useCardioBuilder.ts` (pure edits in `data/cardioDraft.ts`). Server errors show in a toast.

### B4. Mobile (`features/cardio`, class prefix `cp-`)

- **Lists:** cardio rows (a "קרדיו" tag, name, day · minutes, status) in Home's selected-day detail and
  in a Workouts "CARDIO · קרדיו" section (`CardioWeekList`, `useCardioWeek`).
- **Detail (`/workouts/cardio/:sessionId/:date`, full screen, no dock)**
  - back button, the mono eyebrow "RUN · INTERVALS · TUE 20.10";
  - a 64px Karantina title whose Latin / number runs are Barlow italic;
  - the three-column scoreboard, and a graph that grows in, staggered, with an axis;
  - the coach's note with her real name; the steps (zone bar, Karantina name, "מאמץ 8/10 · tip", time;
    repeat sets in a soft box "× N סבבים");
  - "הנחיות קוליות" / "רטט במעבר קטע" switches, each shown only if the phone has the API;
  - the floating slide (only when `canStart`). Done days show "בוצע".
- **Run (`/workouts/cardio/:sessionId/:date/run`, full screen)**
  - **Timer:** `data/cardioRun.ts` keeps the run as timestamps and stores it on the phone, so it is right
    after a lock or the background and survives a reload; `hooks/useCardioRun.ts` ticks only while the
    page is visible;
  - **3-2-1:** a full-screen overlay;
  - **The screen:** the ground is the zone's `-stage` color (450 ms) with a faint vertical grid; ✕ ends
    early; the eyebrow reads ROUND n/N, WARM UP or COOL DOWN;
  - **Text:** an 84px name (64px for names over 5 letters, no wrap); "מאמץ 8/10 · tip"; a 150px Barlow
    clock (LTR, 120px under 440px wide) that beats on the last 3 s; the block progress bar;
  - **What's next:** the next card, or "זה הקטע האחרון · כמעט שם"; the whole-session strip with
    elapsed / remaining;
  - **Controls:** previous · pause · next, always in that left-to-right order; previous restarts the
    block when more than 3 s in;
  - **Background services:** wake lock; voice ("עוד 10 שניות" + the block name, "עבודה!") and a buzz on
    block change, only when switched on and supported;
  - **Accessibility:** `role="timer"`; a polite line per block, not per second.
- **Finish**
  - the title is computed: "סגרת 8 סבבים" / "עשית X מתוך 8 סבבים" (the session name when it has no
    repeat set);
  - the scoreboard comes from what she actually did (skipped stretches don't count);
  - optional distance in steps of 100 m; RPE 1–10 chips in zone colors (the chosen one solid and lifted;
    the design starts at 8) with "קליל" / "מקסימום"; an optional note;
  - "שמירה ושליחה ל[coach]" → `POST /cardio/logs` → back to the detail with "נשמר ונשלח ל[coach]" and
    marked done.
- **Copy:** `features/cardio/copy` (he + en), with the design's wording.

### Tokens (`packages/tokens/tokens.css`, new section 12)

- slide trail colors, hairline, shadows, snap ease / durations, sizes;
- zone 1–5 fill / soft / text / stage;
- on-zone overlays, the "כוח" purple, the cardio type sizes and the motion timings.

`--color-zone-1-text` is `#0068bb`, not the design's `#0070C9`. The design's color is 4.38:1 on its tint
and fails the contrast audit.

## Decisions I made — please check

1. **A separate `CardioSession` collection, not a new kind inside `Plan.workouts`.**
   - The spec's session has several `days` and "repeats weekly", while a plan workout has one day in
     one week; and `CardioLog` is keyed by session + date.
   - Strength code is untouched.
   - A session starts in the plan week it was added from. "Until the end of the plan" = until the
     coach deletes it (there is no plan end date — see missing data).
2. **Cardio is independent of the strength plan's draft / published state.** "הוספה לתוכנית" makes the
   session active, and she sees it at once. "שמירה כטיוטה" keeps it coach-only. There is no
   notification yet.
3. **Live ground colors.**
   - Zone 1 and zone 3 use their deeper ink (`#0070C9`, `#C75A00`) under the white text; zones 2, 4 and
     5 use the bright color.
   - The bright blue / orange are under 3:1 with white ("white text only on saturated zone colors").
4. **The cardio detail is full screen (no dock)**, so the floating slide sits where the design puts it.
5. **Builder "סוג":** a preset replaces the blocks. The name follows only while it is still a preset name
   (or empty), so a typed name is not lost.
6. **One log per session day; only this week's days can be run or logged** (like strength). A second run
   of the same day is refused (409).
7. **Effort starts at 8 on the finish screen**, as in the design. Distance starts empty ("—"): nothing is
   sent unless she sets it.

## Missing data (not invented)

- **Pace / speed:** there is no per-trainee pace or speed baseline. With metric "קצב" / "מהירות" the
  targets show the effort (RPE) instead, in the builder and the app. Needs a baseline field or test.
- **Plan end:** "חוזר כל שבוע עד סוף התוכנית" — plans are weekly with no program end, so a repeating
  session runs until the coach deletes it.
- **Tips:** the design gives tips for warm-up / work / recovery / cool-down only. A "קטע" (steady) block
  shows no tip. The tips mention running ("ריצה קלה") even for walk / bike. There is no per-block coach
  tip field.
- **Detail "⋯" (options):** the design shows the button, but no action exists, so it was left out.
- **Copy:** not in the design, marked DRAFT in the copy files:
  - edit-mode title "אימון קרדיו";
  - delete + confirm;
  - "שומר…", "עוד פעולות", "סוג הקטע";
  - "מחיקת הסט החוזר";
  - "אימון כוח" in the menu;
  - load / save errors;
  - "בוצע" on the detail;
  - "אפשר להתחיל רק אימון של השבוע הזה.";
  - the no-coach variants.

## Known issues / TODOs

1. **Not wired yet**
   - Home's stage / slide and `WeekTrack` lanes count strength workouts only; cardio appears in the day
     detail.
   - The Workouts tab shows this week's cardio only (no history, no next week).
   - The coach reads her cardio logs through the API (`GET …/cardio` → `logs`), but no dashboard / coach
     mode screen shows them yet.
   - No `cardio.completed` notification; achievements / streaks ignore cardio.
2. **Plan builder**
   - On a week with no workouts the builder shows its start cards and no tabs, so the "+ אימון" menu
     (and the cardio entry) is not there until a first workout exists.
   - Leaving a published plan with unsaved changes through the cardio menu drops those changes (the
     builder has no leave guard).
3. **Live run**
   - While the page is hidden, voice cues are not spoken (the timer stays right). On iOS, speech needs
     the page in the foreground.
   - A finished run that was never saved stays stored on the phone. Opening that day's run again shows
     the finish screen.

## How to test

```bash
npm run build     # passes
npm run lint      # passes (i18n + contrast audits clean)
npm test          # passes: server 43 files / 611 tests (8 new), copy + client 3 files / 33 tests
npm run dev:all
```

**Checked in headless Chrome.** Mobile used `trainee1@sistem.dev` at 390 × 844; the dashboard used
`coach@sistem.dev` at 1440 and 390. Both ran in he and en.
- **Mocked:** the cardio GETs and the cardio session / log writes were answered by the test.
- **Blocked:** every other write; two were attempted (the home start POST and `tab-updates/seen`), so
  nothing reached the dev DB.
- **Slide:**
  - drag 40% and release → springs back to 0;
  - full drag → done, then resets when the start fails;
  - keyboard Enter on the knob → done → run;
  - `--tw` follows the width.
- **Detail:** no dock; 18 bars; score 26′ / 8 / 8:00; two switches; no sideways scroll.
- **Run:**
  - 3-2-1 → WARM UP zone 1 → next → ROUND 1/8, work, zone 4 → recovery (long size, no overflow);
  - pause holds the clock and the label becomes "המשך"; previous goes back;
  - a reload mid-run continues;
  - ✕ → "עשית 0 מתוך 8 סבבים" → distance 0.2, RPE 6 → save → detail done, "נשמר ונשלח לשקד", stored
    run cleared.
- **Builder:**
  - the menu → builder; week 5; "כוח" on Wed / Fri;
  - tip "עבודה 2/8 · 1:00 · 8/10"; a bar click opens its block and dims 10 others;
  - 1:00 − → 0:45; × 9 → totals update; hrZone → Z1 / Z4 / Z2;
  - add order; run preset → 35′, 3 blocks, the name follows;
  - add to plan → toast, the URL gets the id, ⋯ appears; back → `CardioTab` in the plan builder;
  - 390px, no sideways scroll (after fixing the edge tooltips).

### Manual checklist

**Slide** (Home and the cardio detail):
- [ ] Release before 80% → springs back.
- [ ] Release after → snaps, check pops, haptic on a phone.
- [ ] Home shows "האימון התחיל" and resets after ~1.8 s if it stays on Home.
- [ ] Tab to the knob, then Enter / Space.
- [ ] English: drags left → right.
- [ ] Reduced motion: instant snap, no pop.

**Builder:**
- [ ] Each type (run / intervals / walk / bike) loads its preset.
- [ ] Repeat sets: ×N 1–30, nested blocks, delete the last block removes the set.
- [ ] Metric switch (RPE → Z1–Z5; pace / speed show the effort).
- [ ] Assign days (a strength day shows "כוח"), weekly switch.
- [ ] Draft (not in her app) vs add to plan (in her app); delete from ⋯.

**Run:**
- [ ] Run a session to the end → "סגרת N סבבים".
- [ ] End early → "עשית X מתוך N סבבים".
- [ ] Lock the phone / switch apps mid-block → the clock is right on return and the screen stayed awake
      while open.
- [ ] Voice and vibration only when switched on (Android Chrome for vibration).

**After:**
- [ ] The finish log appears for the coach: `GET /api/coach/trainees/:id/cardio` → `logs` (no screen
      yet).
- [ ] English / LTR on both apps.

## Suggested commits

Shared files with another session's uncommitted work — use `git add -p` and take only the hunks named:
- **`packages/tokens/tokens.css`:** take the section "12. Slide to start + cardio" and the removed
  `--shadow-knob` / `--loop-nudge` lines plus the two edited comments (`--surface-slide-track`,
  `--ease-spring`). The nutrition tokens are not mine.
- **`packages/types/src/index.ts`:** take only the last lines (`export * from './cardio'`). The `category`
  / `coach` fields are not mine.

Not mine, not in these commits: the dashboard `AppShell`, `Sidebar.css`, `TopLine`, `VariantCard`,
`WeekBoard`, `trainees/copy/he.ts`, mobile `src/copy/*`, and everything nutrition / Toast / `useToast`.
Also the untracked `docs/design/*.html` (the references) and `docs/phase-reports/dashboard-fidelity.md`
/ `fidelity/`.

1. `feat(mobile): one shared slide-to-start (Home)`
2. `feat(server): cardio sessions and cardio logs`
3. `feat(dashboard): cardio session builder`
4. `feat(mobile): cardio sessions — detail, live player, finish log`
5. `docs: cardio and slide report`

```bash
git add -p packages/tokens/tokens.css   # section 12 + the removed slide tokens / comments only
git add -A -- apps/mobile/src/components/common/SlideToStart apps/mobile/src/hooks/useSlideToStart.ts apps/mobile/src/features/home/components/SlideToStart apps/mobile/src/features/home/hooks/useSlideToStart.ts apps/mobile/src/features/home/components/HomeStage/HomeStage.tsx apps/mobile/src/features/home/copy/he.ts apps/mobile/src/features/home/copy/en.ts
git commit -m "feat(mobile): one shared slide-to-start (Home)"

git add -p packages/types/src/index.ts   # the cardio re-export only
git add -A -- packages/types/src/cardio.ts packages/api-client/src/cardioApi.ts packages/api-client/src/index.ts packages/shared/src/cardioDisplay.ts packages/shared/src/index.ts packages/shared/src/copy/he.ts packages/shared/src/copy/en.ts apps/server/src/features/cardio apps/server/src/app.ts apps/server/src/features/coach/coach.routes.ts apps/server/src/i18n/locales/he.ts apps/server/src/i18n/locales/en.ts
git commit -m "feat(server): cardio sessions and cardio logs"

git add -A -- apps/dashboard/src/features/cardio apps/dashboard/src/services/cardio apps/dashboard/src/app/config/routes.ts apps/dashboard/src/app/router/AppRouter.tsx apps/dashboard/src/features/planBuilder/components/WorkoutAddMenu apps/dashboard/src/features/planBuilder/components/CardioTab apps/dashboard/src/features/planBuilder/components/WorkoutTabs/WorkoutTabs.tsx apps/dashboard/src/features/planBuilder/components/PlanEditor/PlanEditor.tsx
git commit -m "feat(dashboard): cardio session builder"

git add -A -- apps/mobile/src/features/cardio apps/mobile/src/services/cardio apps/mobile/src/app/config/routes.ts apps/mobile/src/app/config/tabs.ts apps/mobile/src/app/router/AppRouter.tsx apps/mobile/src/features/home/components/HomeScreen/HomeScreen.tsx apps/mobile/src/features/home/components/WeekDayDetail/WeekDayDetail.tsx apps/mobile/src/features/workouts/components/WorkoutsScreen/WorkoutsScreen.tsx
git commit -m "feat(mobile): cardio sessions — detail, live player, finish log"

git add -A -- docs/phase-reports/cardio-and-slide.md
git commit -m "docs: cardio and slide report"
```

Commit 1 must go first (commit 4's detail page uses the shared slide). Commit 2 holds the shared types /
api-client / shared helpers that commits 3 and 4 import, so keep that order.

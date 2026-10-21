# Trainee workout player + summary — redesign (direction B)

Reference: `docs/design/trainee-workout-player.html` (the "לבדיקה" review row was not built).

## Summary

The active workout and the workout summary were rebuilt to the direction-B design. All logic stayed: per-set logging
pre-filled by the server, the phone cache and sync, carry-forward, supersets, holds (▶), interval blocks, beeps, sound
toggle, wake lock, offline finish queue, discard, Daily Pump upload, rating and notes. New behaviours: a dark rest
sheet, auto-advance to the next exercise, jumping between exercises from the queue, "+ Extra set" (small server
change), an all-done finish offer, and 0.5 kg weight steps.

## Phase 1 — audit (what existed, what was missing)

| Data | Status |
|---|---|
| Exercise facts (muscles, equipment, level) | ✅ `PlanExercise.exercise` (library facts, Latin) — chips |
| Prescribed sets / reps range / rest | ✅ `resolvedSets` — scoreboard (ranges when sets differ) |
| Last performance | ⚠️ partial: `lastPerformance` has ONE representative set (weight × reps, or a hold), not the set count. Shown as "בפעם הקודמת: 40 ק״ג × 10"; the design's "3 × 12 · 10 ק״ג" needs a server change (backlog) |
| Volume | ✅ `stats.totalVolume` (server) — "—" when 0 (bodyweight only) |
| PR detection | ✅ `log.personalRecords` (server, at finish) — "שיא אישי" tag per exercise |
| Achievement progress | ✅ `GET /api/achievements` `progress` — the next locked "completed workouts" target (5/10/25/50/100); hidden when none |
| Coach name | ✅ from `GET /api/plans/week` `coach` — **this field is part of the other open work (Home coach card), not committed yet**; without it the copy falls back to "המאמנת" wording |
| Adding a set | ❌ the server refused sets outside the plan → added (see below) |
| Rest at 0 vibration | ✅ Vibration API (Android); iOS Safari has none (Capacitor Haptics in Phase 5b) |

## What changed

**Player** (`/workouts/session/:logId`, prefix `wp-`)
- `PlayerHeader`: sticky white blur; ✕ (end) + sound on the start side, ⋯ on the other; mono workout name
  (aria-hidden; a visually-hidden h1 carries it) and the Barlow italic 800 30px clock (`role=timer`, from the server
  start time, so it's right after lock / background).
- `PlayerProgress`: one group per exercise (or superset), one segment per set; done = ink, the current exercise's
  open segments a shade darker. "תרגיל X מתוך N" + "X / Y סטים".
- `PlayerTip`: the existing Focus tip as a soft card with a bulb and two text buttons (same "don't show again" key).
- `PlayerExercise`: pink "עכשיו" pill (blinking dot, static with reduced motion), superset pill, name (Barlow italic
  800 38px, LTR at the reading start; Hebrew names in Karantina), chips, 3-column scoreboard, last time, coach notes,
  set rows, "+ סט נוסף" (hidden for interval blocks, max 20 sets per exercise).
- `PlayerSetRow` + `PlayerStepper`: grid number | kg | reps | ✓. Current = soft row, ink number and check; done =
  Cherry number with ✓, steppers collapse to their values, blush check; upcoming = white pills with hairlines.
  48px pills, 36px − / + (tap area stretched to 48px), the number still opens the keypad. Bodyweight exercise with no
  weight shows "גוף"; stepping a weight down to 0 clears it. Check = pop + light haptic → rest; un-check allowed.
- `RestSheet`: dark sheet (radius 32 top, 300 ms in / 200 ms out, inert while away, Esc = skip), Karantina "מנוחה" +
  REST, 120px ring drawn every frame from the stored end time (whole seconds with reduced motion), "הבא" = the next
  set's exercise + "סט N · R חזרות", −15 / +15 / דילוג. At 0: beep (unless it ended while locked), vibrate, polite
  toast "יאללה, הסט הבא", close. Uses the prescribed rest; an extra set rests like the exercise's last planned set.
- After the last set of an exercise the screen moves to the next one (the rest sheet already names it).
- `PlayerQueue` ("האימון", UP NEXT): index circle (pink = on screen, Cherry ✓ = done), name with ellipsis, set pips;
  tap jumps there and focuses its first open set.
- Pinned ink "סיום אימון X/Y" over a white fade. Sets left → bottom sheet "לסיים עכשיו?" / "נשארו N סטים…" /
  "סיום ושמירה" / "חזרה לאימון". All sets done → the same sheet opens by itself ("כל הסטים בוצעו."). Nothing done →
  the existing "nothing logged" sheet. ⋯ menu: leave (workout stays open), interval timer, discard (+ confirm).
- Logic moved into hooks: `useRestTimer` (beeps + end), `useHoldTimer` (▶ holds); `useWorkoutSession.addSet`.

**Summary** (`/workouts/logs/:logId/summary`, prefix `ws-`)
- `SummaryStage`: pink stage with grid lines, radius 40 bottom; "DONE · <workout> · dd.mm", close; the ring + check
  draw themselves (static with reduced motion); Karantina "האימון הושלם"; workout name + day/time; 4-column
  scoreboard משך / סטים / נפח / שיאים.
- `SummaryRecap` (RECAP): dot (Cherry if any set done), name, "X/Y סטים · R חזרות", blush "שיא אישי".
- `FeelPicker` (FEEL): 5 zone chips (Z1…Z5), "קליל" / "בדיוק" / "קשה מאוד"; chosen = solid, lifted. Replaces
  `RatingPicker` (deleted). Same `rating` 1–5 field.
- "משהו ל<coach>?" textarea; `PumpPhotoField` restyled as the soft card (same private upload: compressed on the
  phone, EXIF/GPS dropped, authenticated Cloudinary asset, 1-hour signed links, trainee + coach only).
- `SummaryNextAchievement`: ring + "עוד N אימונים ל-25" / "ההישג הבא שלך".
- Ink "שמירה ושליחה ל<coach>" → saves rating / notes, toast "נשמר ונשלח ל<coach>", back to Home (or the log page).
  Opens scrolled to the top.

**Server** — "+ Extra set": `PATCH /workout-logs/:id/sets` (and finish) now accepts an update for the set right after
an exercise's last one and adds it as a working set (only the next index; max `MAX_SETS_PER_EXERCISE` = 20; a
conditional `$push` that refuses an index another device added first, then retries as an update). Unsent extra sets
survive a reload (`withPendingExtraSets`). New test in `workoutSession.test.ts`.

**Other**: weight step is 0.5 kg for every exercise (replaces the per-equipment 1 / 2.5 kg rule, per this brief).
Removed: `SessionBlock`, `SessionExerciseCard`, `SessionSetRow`, `NumberStepper`, `RestBar`, `FocusTip`,
`RatingPicker` and their now-unused copy keys. New eyebrows in app copy: REST, RECAP, FEEL, DAILY PUMP, DONE.

## Decisions / things to confirm (owner)

1. **Rating meaning**: the chips now read as effort (1 קליל … 5 קשה מאוד). The stored field is still `rating` 1–5;
   coach screens that show it as "rating" may need relabelling.
2. **Weight step 0.5 kg** everywhere (was 1 kg dumbbell/kettlebell, 2.5 kg otherwise).
3. **✕ = end** (opens the finish flow, as in the design). "Leave, workout stays open" moved to the ⋯ menu.
4. Upcoming-set check icon uses `--color-icon-quiet` instead of the design's faint grey (2.5:1 → 3.4:1 for icons).
5. The "עכשיו" pill and the current queue circle use `--solid-pink` (small white text on Neon Pink is 3.8:1).
6. Copy is the design's wording; English is a draft translation; the all-done line "כל הסטים בוצעו." is from the
   design's toast.

## Known issues / TODOs
- "Last time" set count (see audit) — needs `lastPerformance` to carry the set count.
- Rest end vibration is Android-only until Capacitor Haptics (Phase 5b); the light tap on ✓ uses the haptics service.
- No client tests (none in the repo yet). Checked manually in the browser (below).
- The summary's coach name depends on `TraineeWeek.coach` from the other open change (see commits).

## Test checklist
Commands: `npm test` (621 server tests + i18n parity — pass), `npm run lint` (oxlint + i18n audit + contrast audit —
clean), `npx tsc --noEmit -p apps/mobile/tsconfig.app.json` (clean). Manual, on `npm run dev` with `npm run seed:dev`
(trainee2@sistem.dev) at 360 / 390 / 430 px:

- [x] Full workout: start → check sets → rest → next exercise → finish → summary → save → Home (verified 2026-10-21).
- [ ] Un-check a set: blush ✓ → set opens again, segment / pips / X/Y go back; rest is not restarted.
- [x] Add a set: "+ סט נוסף" adds a row with the last set's numbers; X/Y grows; the server stores it (verified).
      Reload while offline → the added row is still there.
- [x] Jump between exercises: tap a queue row → that exercise, its first open set is current.
- [x] Rest: +15 / −15 change the clock and ring; דילוג closes; auto end → toast "יאללה, הסט הבא" (verified).
- [ ] Background / lock: lock the phone mid-rest and past its end → on unlock the clock is right, the sheet is gone,
      no late beep. The workout clock is right after unlock. Screen stays awake while the player is open.
- [x] Finish early: sheet shows "נשארו N סטים…"; "סיום ושמירה" finishes; nothing done → "nothing logged" sheet.
- [x] Summary values: duration ′, sets, volume ("—" when bodyweight only), PRs, recap per exercise, next achievement.
- [ ] Photo privacy: camera / gallery upload → photo shows; open it in a private window without auth → no access;
      the coach sees it in the dashboard; the downloaded file has no GPS / EXIF.
- [x] EN / LTR: everything mirrors (verified on the summary); eyebrows hidden in English (by design of `Eyebrow`).
- [ ] Reduced motion: no pop, no blinking dot, ring moves in whole seconds, sheets appear without sliding, the check
      is drawn at once.
- [ ] Supersets / holds / intervals: a superset shows both exercises with A1/A2; ▶ hold counts down and logs; an
      interval block offers "התחלת אינטרוולים" and hides "+ סט נוסף".

## Screenshots (`docs/phase-reports/workout-player/`)
- `before-1-player.jpg` (old player, 307px window) → `after-1-player.jpg`, `after-2-rest.jpg`, `after-3-queue.jpg`,
  `after-4-finish-early.jpg`
- `before-2-summary.jpg` → `after-5-summary-top.jpg`, `after-6-summary-bottom.jpg`, `after-7-summary-en.jpg`

The "after" shots are a 390×844 frame scaled to the browser window. Testing created one finished "Full Body C" log
(4 sets, rating 3) for the dev seed trainee trainee2@sistem.dev; her language was switched to English and back.

## Dependencies
None added or removed.

## Suggested commits

Note: the working tree also holds another open change (Home week track / coach card / notifications, see
`docs/phase-reports/fix-home-week-track-coach-card.txt`). It owns `packages/types/src/index.ts` and
`apps/server/src/features/plans/traineePlan.service.ts` (the `coach` field the summary reads) — commit that change
first, or the summary commit won't typecheck on its own.

1. `feat(server): allow adding an extra set during a workout session`
2. `feat(mobile): workout player redesign (direction B)`
3. `feat(mobile): workout summary redesign (direction B)`
4. `docs: workout player report, screenshots and design reference`

```bash
git add -A -- apps/server/src/features/workoutLogs/workoutSession.service.ts apps/server/src/features/workoutLogs/workoutLog.constants.ts apps/server/src/features/workoutLogs/__tests__/workoutSession.test.ts
git commit -m "feat(server): allow adding an extra set during a workout session"
```

```bash
git add -A -- apps/mobile/src/copy/he.ts apps/mobile/src/copy/en.ts apps/mobile/src/features/workouts/copy apps/mobile/src/features/workouts/data/sessionConfig.ts apps/mobile/src/features/workouts/data/sessionSets.ts apps/mobile/src/features/workouts/data/workoutDisplay.ts apps/mobile/src/features/workouts/hooks/useWorkoutSession.ts apps/mobile/src/features/workouts/hooks/useRestTimer.ts apps/mobile/src/features/workouts/hooks/useHoldTimer.ts apps/mobile/src/features/workouts/pages/WorkoutSessionPage apps/mobile/src/features/workouts/components/SessionClock apps/mobile/src/features/workouts/components/PlayerHeader apps/mobile/src/features/workouts/components/PlayerProgress apps/mobile/src/features/workouts/components/PlayerTip apps/mobile/src/features/workouts/components/PlayerExercise apps/mobile/src/features/workouts/components/PlayerSetRow apps/mobile/src/features/workouts/components/PlayerStepper apps/mobile/src/features/workouts/components/RestSheet apps/mobile/src/features/workouts/components/PlayerQueue apps/mobile/src/features/workouts/components/SessionBlock apps/mobile/src/features/workouts/components/SessionExerciseCard apps/mobile/src/features/workouts/components/SessionSetRow apps/mobile/src/features/workouts/components/NumberStepper apps/mobile/src/features/workouts/components/RestBar apps/mobile/src/features/workouts/components/FocusTip
git commit -m "feat(mobile): workout player redesign (direction B)"
```

```bash
git add -A -- apps/mobile/src/features/workouts/pages/WorkoutSummaryPage apps/mobile/src/features/workouts/data/summaryDisplay.ts apps/mobile/src/features/workouts/components/SummaryStage apps/mobile/src/features/workouts/components/SummaryRecap apps/mobile/src/features/workouts/components/FeelPicker apps/mobile/src/features/workouts/components/SummaryNextAchievement apps/mobile/src/features/workouts/components/PumpPhotoField apps/mobile/src/features/workouts/components/RatingPicker
git commit -m "feat(mobile): workout summary redesign (direction B)"
```

```bash
git add -A -- docs/phase-reports/workout-player.md docs/phase-reports/workout-player docs/design/trainee-workout-player.html
git commit -m "docs: workout player report, screenshots and design reference"
```

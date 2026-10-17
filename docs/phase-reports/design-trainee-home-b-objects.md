# Design — Trainee Home B: object of the day + no volume

Reference: `docs/design/trainee-home-b.html` (updated version).

## Summary

- The Home stage's cast-iron kettlebell is replaced by a **3D object of the day**: a different procedural three.js object
  for each day of the week, in the reference's soft-touch style (matte white, blush and pink accents, satin chrome, studio
  PMREM environment, contact shadow). Sun kettlebell · Mon hex dumbbell · Tue weight plate · Wed medicine ball · Thu jump
  rope · Fri shaker bottle · Sat stopwatch — picked by the **device's local day** (`new Date().getDay()`).
- Smaller stage: 210 px high (was 250) with the reference's camera and 0.82 object scale. Same float, sway, drag-to-rotate
  with inertia, reduced-motion stillness (still turns by hand), lazy three.js, pause when hidden / off-screen, DPR ≤ 2, full
  disposal on unmount.
- The label **"היום: [name]"** / "Today: [name]" sits under the object (with the drag icon once the live object is there).
  The reference's dot switcher is **not** shipped.
- Home no longer shows total volume: the scoreboard has two columns (workouts this week · weeks in a row), and the volume
  achievements are left out of Home's "next achievement" and its chips. Volume data, logic and the Achievements / summary
  screens are unchanged.

## Static fallback — one PNG per object

`features/home/assets/objects/<id>.png` (7 files, 780×420 = 390×210 @2x, 45–75 kB each, transparent). Each is the live
scene's first frame, rendered from the same scene code and tokens in headless Chrome, so the swap to the live object is
invisible. `data/objects/objectRenders.ts` maps them; they are URLs, so only today's file is downloaded.
(Regenerating: bundle `dailyObjectScene` + `readStudioColors` with esbuild, render each id with
`preserveDrawingBuffer: true` at 780×420 / pixel ratio 1, `update(0, 0, true)`, save `canvas.toDataURL()`. Not committed
as a script — tell me if you want one.)

## Structure

- `data/objects/studio.ts` — the shared module: materials (matte / blush / ink / chrome / accent), the PMREM studio, the
  lights, the contact shadow, `lathe` / `tube` helpers, `disposeTree`.
- `data/objects/kettlebell.ts`, `dumbbell.ts`, `weightPlate.ts`, `medicineBall.ts`, `jumpRope.ts`, `shakerBottle.ts`,
  `stopwatch.ts` — one builder each (ported from the reference).
- `data/objects/objectOfDay.ts` — ids in week order + `objectOfDay(date)` (no three.js code).
- `data/dailyObjectScene.ts` — renderer, camera, animation; imported **together with three.js** after first paint, so the
  builders are also out of the main bundle (chunk 7.6 kB).
- `hooks/useDailyObjectScene.ts`, `components/DailyObject3D/` (`.tsx` + `.css`).

## Decisions I made (please confirm)

- **Colors**: the reference uses three.js r128, which treated hex colors as linear, so its objects look lighter than
  their hex values. The app's three (0.186) converts colors correctly, so the new tokens hold the reference's *rendered*
  look (e.g. blush `#ffe2ee`, accent `#ff71bf`). Checked side by side with the reference render.
- **No entrance animation**: the reference animates swaps between objects (only for its dot switcher). In the app the PNG
  shows first and the live object replaces it in the same pose, so there is nothing to animate in.
- **Device day**, as asked — not her stored time zone. If she travels, the object follows the phone.
- Hebrew names are the reference's (קטלבל, משקולת, פלטה, כדור כוח, חבל קפיצה, שייקר, סטופר). English: Kettlebell,
  Dumbbell, Weight plate, Medicine ball, Jump rope, Shaker bottle, Stopwatch. DRAFT, like the rest of Home's copy.
- Volume achievements are hidden from **both** the "next achievement" headline and the chips (otherwise a volume goal could
  still become the headline). New shared helper `isVolumeAchievement` in `@sistem/shared`.
- With no plan this week the scoreboard shows only "weeks in a row" in the first of the two columns (as in the reference grid).
- Removed with the old bell: the "12 KG" print logic (`kettlebellWeightOf`, `KETTLEBELL_BRAND_WEIGHT`), the "drag to rotate"
  copy, and the score's `totalVolume` / `tonnes` copy.

## Files changed

Added
- `apps/mobile/src/features/home/data/objects/` — `studio.ts`, `kettlebell.ts`, `dumbbell.ts`, `weightPlate.ts`,
  `medicineBall.ts`, `jumpRope.ts`, `shakerBottle.ts`, `stopwatch.ts`, `objectOfDay.ts`, `objectRenders.ts`
- `apps/mobile/src/features/home/data/dailyObjectScene.ts`, `hooks/useDailyObjectScene.ts`
- `apps/mobile/src/features/home/components/DailyObject3D/` (`DailyObject3D.tsx`, `DailyObject3D.css`)
- `apps/mobile/src/features/home/assets/objects/*.png` (7)

Modified
- `apps/mobile/src/features/home/components/HomeStage/HomeStage.tsx`, `HomeScreen/HomeScreen.tsx`,
  `Scoreboard/Scoreboard.tsx` + `.css`
- `apps/mobile/src/features/home/data/homeDisplay.ts`, `hooks/useHomeData.ts`, `copy/he.ts`, `copy/en.ts`
- `packages/tokens/tokens.css` (kettlebell tokens → `--color-object-*` / `--color-studio-*`; `--color-stage-shadow` for the
  knob; `--kettlebell-height` → `--daily-object-height: 210px`)
- `packages/shared/src/achievementDisplay.ts` (`isVolumeAchievement`)
- `docs/design/trainee-home-b.html` (your updated reference — was already modified before this task)

Deleted
- `apps/mobile/src/features/home/components/Kettlebell3D/`, `data/kettlebellScene.ts`, `hooks/useKettlebellScene.ts`,
  `assets/kettlebell.png`

## Dependencies

None added or removed.

## How to test

```
npm run lint                      # oxlint + i18n audit + contrast audit — pass
npm run test:i18n                 # copy parity — 31 passed
npm run build -w @sistem/mobile   # pass (tsc -b + vite); dailyObjectScene + three in their own chunks
npm run dev                       # sign in as trainee2@sistem.dev
```

Verified by me: all seven objects render from the app's scene code (headless Chrome, contact sheet on the pink stage), and
the colors match the reference's own render.
Not verified by me in the running app — please check: the stage at 210 px with the "היום: …" label (HE + EN), dragging +
inertia, the PNG → live swap, reduced motion, WebGL off (PNG, no drag icon), the scoreboard's two columns, and that no
volume chip appears. To see another day's object, change the device date (or temporarily `objectOfDay(new Date('2026-10-12'))`).

## Known issues / TODOs

- The day is read once per Home visit; if Home stays open past midnight the object changes on the next visit.
- Note: during this task I briefly ran `git mv` by mistake (it stages a rename); I immediately undid it with
  `git restore --staged` on those two paths, so the index is as it was. Nothing was committed.

## Suggested commits

1. `feat(home): object of the day on the Home stage, no volume on Home` — everything under `apps/mobile/src/features/home`,
   the tokens, the shared helper and the updated reference. (One commit: HomeScreen / HomeStage / Scoreboard changes depend
   on each other, so a split would leave a commit that doesn't build.)
2. `docs: object of the day report` — this file

```sh
git add -A -- apps/mobile/src/features/home packages/tokens/tokens.css packages/shared/src/achievementDisplay.ts docs/design/trainee-home-b.html
git commit -m "feat(home): object of the day on the Home stage, no volume on Home"

git add -A -- docs/phase-reports/design-trainee-home-b-objects.md
git commit -m "docs: object of the day report"
```

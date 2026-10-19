# Design — Trainee type system (Karantina / Barlow Condensed / JetBrains Mono / Rubik)

Reference: `docs/design/trainee-home-b.html`, `docs/design/trainee-workouts.html`.

## Summary

- Hebrew headings now use **Karantina 700**. Before, Barlow Condensed has no Hebrew, so they fell back to Rubik and looked flat.
  Numbers and Latin workout / exercise names stay **Barlow Condensed**. Small Latin "eyebrows" use **JetBrains Mono 700**.
  All running text, buttons, chips and labels use **Rubik**.
- Fonts are **self-hosted** through @fontsource, so the Capacitor build works offline. The Google Fonts and Fontshare
  `@import`s are removed from the mobile app. Each face has a size-adjusted local fallback (`src/styles/fonts.css`, values
  measured from the font files), and every face uses `font-display: swap`, so the swap causes no layout shift.
- Tokens: `--font-display-he`, `--font-num`, `--font-mono`, `--font-body`, plus `--font-display*` (face / style / weight / case,
  switched by `<html lang>`) and a display scale `--text-display-xs…3xl` = 22/26/30/38/48/54/62. In EN this scale is
  18/20/24/30/36/42/48 because Barlow fills more of its size. `--font-numeric` and `--font-family-home` are gone.
- Two new shared parts: `Eyebrow` (the mono label, `aria-hidden`, hidden in EN unless `keepInEnglish`) and `DisplayText`
  (numbers inside a heading in Barlow italic 800 as `<bdi dir="ltr">`, words in Karantina: "10 אימונים", "אוקטובר 2026",
  "11–17 באוק׳").
- One global class `.display-title` applies the display face. Plain `h1`–`h6` are now Rubik bold, so display type is
  opt-in and a small heading never becomes a tiny Karantina. `.display-name[data-script=he]` (Hebrew workout names) uses
  Karantina instead of Rubik.

## Decisions I made (please confirm)

- **Section labels stay small Rubik with the mono eyebrow** (WEEK / COACH / NEXT GOAL / FUEL / THIS WEEK / NEXT WEEK / EXTRA /
  MONTH / LOG), as both references draw them (`.sh h2` stays 13px). The brief's "section titles → Karantina" is applied to the big
  titles under them: week header, lock title, free-workout card, calendar month, week group titles, and similar.
- **No week number**: plans have none (same as the Workouts report). "WEEK 06" became **THIS WEEK**, "TODAY · WK06" became
  **TODAY**, and the WeekHeader still reads "השבוע". DisplayText is already wired in, so a future "שבוע 6" gets its number in
  Barlow with no code change.
- The date eyebrow "MON 19.10" is added **in front of** the full Hebrew date. The reference replaced the date with it, but an
  aria-hidden label must never be the only one.
- Eyebrow strings live in `src/copy` (`appCopy.eyebrow`, Latin in both languages, weekdays Sunday first).
- Line height: Karantina's descenders (ק ך ן ף ץ) reach 0.1em below the baseline, so a clamped heading under 0.92 cuts them.
  `--line-height-display` is **0.92** (Barlow 0.9).
- **Onboarding**: only the question title changed (Karantina 30 / 38 on the activities step). Its structure and behaviour are
  untouched. The "Q.01" number now uses JetBrains Mono.
- **Auth** titles also use the display face (they are the first screens a trainee sees).
- **Coach mode in the mobile app** (Inbox / Trainees / trainee detail titles) keeps the old system display stack, because it
  is not trainee scope. Its body text is now Rubik, like the rest of the app. The dashboard is untouched.

## Changed components

Shared: `components/common/Eyebrow` (new), `components/common/DisplayText` (new, + `splitNumbers.ts`), `styles/fonts.css` (new),
`styles/typography.css`, `styles/globals.css`, `main.tsx`, `copy/he.ts` + `en.ts`, `packages/tokens/tokens.css`,
`PlaceholderPage`, `BottomSheet` (token rename).

Home: HomeScreen (eyebrows), HomeStage (greeting Karantina, date eyebrow, stage message, rest-day next title),
TodayWorkoutHeadline (TODAY eyebrow, Hebrew name Karantina 62), NextAchievement (DisplayText "10 אימונים"), CoachNote (COACH
eyebrow + name), StartingPhotoPrompt, IntervalTimerEntry, FuelToday (group labels), WeekDayDetail.

Workouts: LargeTitleHeader, SegmentedTabs (label span), WeekHeader, UpNextCard (UP NEXT eyebrow), WorkoutsScreen (eyebrows),
NextWeekLock, FreeWorkoutEntry, FreeWorkoutSheet (title + options), MonthCalendar, WorkoutLogGroup, SessionExerciseCard /
WorkoutDetailPage / WorkoutLogPage / WorkoutSessionPage (names via `.display-name`), WorkoutSummaryPage, PumpPhotoField,
PersonalRecordList, IntervalTimer (phase) + IntervalTimerPage (timer title), and the numbers in RestBar / RatingPicker /
SummaryStats.

Other trainee screens: WaitingPage title + Countdown digits, onboarding StepHeading / ActivitiesStep, auth AuthCard /
AuthScreen, Profile (name, card titles), SubPageHeader, StartingPhotoCard, ProgressPhotoSlot, BodySummary / TrendChart
numbers, NutritionPage, MealCard, PortionTracker, achievements (celebration name, unlocked title, stats / streak numbers).

All other modified CSS files only rename tokens: `--font-numeric` → `--font-num`, `--font-family-home|body` →
`--font-body`, `--font-mono, monospace` → `--font-mono`.

## The `cur` bug from the prototype

There is no collision in the ported code. The dock's current tab is `current` inside `AppDock.tsx`, derived from the route.
The object of the day lives in `useDailyObjectScene.ts` / `data/dailyObjectScene.ts`, all local to the hook's effect. No
module-level variable is shared. The reference file itself now uses `curObj`.

## Dependencies

Added to `@sistem/mobile`: `@fontsource/karantina`, `@fontsource/barlow-condensed`, `@fontsource/jetbrains-mono`,
`@fontsource/rubik` (all 5.3.0; you asked for them). Removed: the Google Fonts / Fontshare network imports in `globals.css`.

## How to test

```
npm run lint                       # oxlint + i18n audit + contrast audit — pass
npm run test:i18n                  # copy parity — 31 passed
npm run build -w @sistem/mobile    # pass (fonts emitted as local assets)
npm run dev                        # trainee (seed:dev)
```

What I checked in Chrome (HE, phone width): Home (greeting, date eyebrow, stage message, starting photo, interval timer, coach,
"10 אימונים", fuel), Workouts plan (large title, tabs, "השבוע", NEXT WEEK lock "25 באוק׳ – 31 באוק׳") and history (month
"אוקטובר 2026", log week titles "11-17 באוק׳"). The page loaded only the self-hosted faces, with no console errors. EN check
(by switching `<html lang>`): the title computes to Barlow Condensed italic 800 uppercase, and eyebrows are hidden.

Still for you to check: real EN mode (Settings), the session / summary / waiting / onboarding screens on a phone, iPhone SE
(the 62px Hebrew name on the stage is clamped to 2 lines), reduced motion (unchanged), and a cold offline start in the
Capacitor build.

## Known issues / TODOs

- In EN, a display title that holds Hebrew the coach wrote (coach name slot, meal names) falls back to Rubik with synthetic
  italic. Workout names avoid this through `nameScript`.
- Eyebrow color is `--color-text-faint`, the same as the reference. It is decorative (aria-hidden), so the contrast audit
  ignores it.
- Rubik fallback metrics are a compromise between its Hebrew and Latin widths (111%).
- Coach-mode screen titles still use the placeholder `--font-family-display` stack. They need a decision if coach mode
  should follow the trainee type system.

## Suggested commits

1. `feat(tokens): trainee type system tokens and self-hosted fonts`: tokens, fonts.css, main.tsx, globals.css,
   typography.css, mobile package.json, package-lock.json
2. `feat(mobile): Eyebrow and DisplayText components`: the two folders + app copy
3. `feat(mobile): apply the type system to trainee screens`: the feature / layout / common CSS + TSX
4. `docs: type system report and updated home reference`

```sh
git add -A -- packages/tokens/tokens.css apps/mobile/src/styles/fonts.css apps/mobile/src/main.tsx apps/mobile/src/styles/globals.css apps/mobile/src/styles/typography.css apps/mobile/package.json package-lock.json
git commit -m "feat(tokens): trainee type system tokens and self-hosted fonts"

git add -A -- apps/mobile/src/components/common/Eyebrow apps/mobile/src/components/common/DisplayText apps/mobile/src/copy/he.ts apps/mobile/src/copy/en.ts
git commit -m "feat(mobile): Eyebrow and DisplayText components"

git add -A -- apps/mobile/src/features apps/mobile/src/components/common/Autocomplete apps/mobile/src/components/common/BottomSheet apps/mobile/src/components/common/Button apps/mobile/src/components/common/Input apps/mobile/src/components/common/Select apps/mobile/src/components/layout
git commit -m "feat(mobile): apply the type system to trainee screens"

git add -A -- docs/phase-reports/design-type-system.md docs/design/trainee-home-b.html
git commit -m "docs: type system report and updated home reference"
```

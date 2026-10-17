# Design — Trainee Home, direction B ("training OS")

Reference: `docs/design/trainee-home-b.html` (direction A, `trainee-home.html`, ignored).

## Summary

- Trainee Home rebuilt as direction B: a full-bleed hot-pink stage with a live three.js cast-iron kettlebell
  (drag to rotate with inertia), the workout name in Barlow Condensed italic, a facts row and slide-to-start;
  then the starting-photo prompt, a 7-lane week track with a detail line, a scoreboard, the interval-timer bar,
  the coach's note with quick-reply chips, the next achievement with ticks + close-achievement chips, and today's portions.
- The bottom tab bar is replaced by a floating ink **AppDock** (both roles — one nav component), and switching tabs
  now plays a direction-aware **depth transition**; every tab keeps its own scroll position.
- Every value comes from an existing endpoint; sections without data are not drawn (list below). New strings have
  HE + EN. All visual values are tokens in `packages/tokens/tokens.css`.

## What is shown, and from where

| Section | Source |
|---|---|
| Greeting, initials, date | `AuthUser.name`; `TraineeWeek.today` (server, her zone) |
| Today's workout, exercise count, slide-to-start | `GET /plans/week` (`nextWorkoutId`, `isToday`, `inProgress`, `activeLog`); start / resume = existing `useStartWorkout` (+ the conflict modal) |
| "3/4 this week" | plan workout statuses (server) |
| Week track + detail | `/plans/week` statuses; identity color = the workout's place in the plan (same rule as the plan builder) |
| Scoreboard | this week (plan), `streak.current`, `stats.totalVolume` (`GET /achievements`) |
| Interval timer bar | opens `/timer`; the last-used work interval = the timer's saved settings on this device |
| Coach note | the newest of: this week's `plan.notes`, the nutrition plan's `intro` (`GET /nutrition-plan`); time = its publish time, "ago" from server time |
| "Week … is ready" chip | her newest **unread** `plan_published` notification for this week or later (tap → Workouts, marks it read) |
| Next achievement, ticks, close chips | `achievements.progress`: locked one-time achievements, closest first (ties in config order); names / hints from `describeAchievement` |
| Nutrition today | `GET /meal-logs` → today's planned / marked portions; "Log a meal" → Nutrition tab |
| Starting-photo prompt | existing `useStartingPhotoReminder` (no starting photo + not dismissed); "צילום" → Profile photos (the existing starting-photo flow) |

## Hidden — no data source (decide / add later)

- **Notifications bell** — trainees have no notifications screen (PRD 13a decision: no trainee inbox), so a bell would lead nowhere.
- **"שבוע N"** in the headline — there is no plan week number. (Could be "count of her published plan weeks"; tell me if that is the meaning.)
- **Estimated duration ("45′ דקות בערך")** — plans have no duration field.
- **Coach name / initials and photo** — trainee APIs don't send the coach's name. The avatar is an icon and the line reads "מהמאמנת". Needs a small API field.
- **Quick replies "👍 תודה!" and "תשובה"** — there is no trainee → coach messaging. Only the "plan ready" chip is shown.
- "Nutrition plan updated" as a chip — the notification exists, but no wording was given; only plan updates get a chip.
- Workouts **without a day** are not on the week track (as before); they still drive the stage (doable any day).

## Decisions I made (please confirm)

- **Kettlebell label weight**: her highest target weight on a kettlebell exercise of today's workout, if there is one;
  otherwise a fixed brand value of **12 kg** (`KETTLEBELL_BRAND_WEIGHT` in `features/home/data/homeDisplay.ts`). The static
  fallback PNG always shows 12 KG.
- **Fallback PNG** (`features/home/assets/kettlebell.png`, 108 kB, 780×500): rendered from the same scene code in headless
  Chrome (transparent background, the live scene's first frame), so the swap to the live bell is invisible.
- **Greeting** is always "בוקר טוב" as in the design — at night it reads oddly; send evening / afternoon wording if wanted.
- **Rest day**: the stage reads "האימון של היום / יום מנוחה", with the next workout as a tappable row (opens its page, where she
  can start it). No slider, as specified. An open workout still shows the slider (resume).
- **Missed day** on the track: a thin ring in the workout color + muted date (not in the spec's four states; never red).
- **AppDock for coach mode too** (same 3 coach tabs), so there is one nav component. Say if coach mode should keep the old bar.
- **Perspective**: the depth transition uses `perspective()` inside each screen's transform instead of `perspective` on the
  container — a container perspective would become the containing block of the fixed screens. Visually identical.
- **Haptics**: Capacitor isn't installed (Phase 5b). `services/haptics/haptics.ts` uses `Capacitor.Plugins.Haptics` when the native
  bridge provides it, else `navigator.vibrate` (Android); iOS Safari has none. No dependency added for it.
- **Fonts**: Barlow Condensed + Rubik from Google Fonts; Rubik is applied to Home + the dock only (`--font-family-home`), not app-wide.
- Placeholder (screen-reader-only / mine) strings: `stage.facts`, `score.title`, `achievement.others`, `score.tonnes` (טון / t).

## How the tab transition works

`ScreenTransition` (in `AppRouter`) renders the routes per screen. When the tab changes, the old screen keeps rendering its
own location while the new one enters (440 ms in / 300 ms out, `--screen-dir` mirrors it in English; reduced motion = 160 ms fade).
During the transition both screens are `position: fixed` and scrolled internally to where they were; afterwards the new screen
returns to normal window scrolling (iOS status-bar tap-to-top keeps working) and its remembered scroll is restored — waiting up
to 1.5 s for a freshly mounted screen to load enough content. Taps are blocked only during the transition. Full-screen flows
(session, summary) never transition. `AppShell` no longer renders a bar: it asks for the one dock (`dockStore`), and skips its own
GSAP page-enter while a tab transition is playing.

## Files changed

Added
- `apps/mobile/src/features/home/components/` — `HomeScreen`, `HomeStage`, `Kettlebell3D`, `TodayWorkoutHeadline`, `WorkoutFacts`,
  `SlideToStart`, `StartingPhotoPrompt`, `WeekTrack`, `WeekDayDetail`, `Scoreboard`, `IntervalTimerEntry`, `CoachNote`,
  `QuickReplies`, `NextAchievement`, `AchievementTicks`, `MiniAchievements`, `FuelToday` (each `.tsx` + `.css`)
- `apps/mobile/src/features/home/hooks/useHomeData.ts`, `useKettlebellScene.ts`, `useSlideToStart.ts`
- `apps/mobile/src/features/home/data/homeDisplay.ts`, `kettlebellScene.ts`; `features/home/assets/kettlebell.png`
- `apps/mobile/src/components/layout/AppDock/` (`AppDock.tsx`, `AppDock.css`, `dockStore.ts`)
- `apps/mobile/src/components/layout/ScreenTransition/` (`ScreenTransition.tsx`, `.css`, `screenPhase.ts`)
- `apps/mobile/src/hooks/useScreenTransition.ts`, `apps/mobile/src/app/config/tabs.ts`
- `apps/mobile/src/services/haptics/haptics.ts`, `apps/mobile/src/features/workouts/data/freeTimerSettings.ts`

Modified
- `packages/tokens/tokens.css` (ink / stage colors, workout solid fills, numeric + Home fonts, sizes, radii, shadows, motion, dock)
- `apps/mobile/src/styles/globals.css` (Google Fonts import)
- `apps/mobile/src/features/home/pages/HomePage/HomePage.tsx`, `features/home/copy/he.ts`, `en.ts`
- `apps/mobile/src/app/router/AppRouter.tsx`, `components/layout/AppShell/AppShell.tsx` + `.css`, `hooks/usePageEnter.ts`
- `apps/mobile/src/features/workouts/pages/IntervalTimerPage/IntervalTimerPage.tsx` (settings read moved to `freeTimerSettings.ts`)
- `apps/mobile/package.json`, `package-lock.json`

Deleted
- `apps/mobile/src/components/layout/TabBar/` (replaced by AppDock)
- `apps/mobile/src/features/home/components/WeekStrip/`, `StartingPhotoReminder/` (replaced by WeekTrack, StartingPhotoPrompt)
- `apps/mobile/src/features/home/pages/HomePage/HomePage.css`

## Dependencies

- Added: `three@^0.186.1` (mobile), `@types/three@^0.186.0` (mobile, dev) — requested in the brief. three is dynamically imported
  after first paint and builds into its own chunk (737 kB / 187 kB gzip), so it never blocks Home's content.
- Removed: none.

## How to test

```
npm run lint          # oxlint + i18n audit + contrast audit — pass (4 old warnings in untouched files)
npm run test:i18n     # copy parity — 31 passed
npm run build -w @sistem/mobile   # pass
npm run dev           # then sign in as trainee2@sistem.dev (seed:dev)
```

Checked in Chrome (seed trainee2, dev server): stage + live kettlebell, all sections, dock, forward / back tab transitions,
scroll restore after returning to Home (600 → Profile → 600), slider drag in RTL + spring back, the LTR mirror, no console errors.
Not completed by me: an actual slide-to-start (it would create a workout log in the dev DB).

Manual checks still to do: workout day / rest day / no plan / plan finished · photo prompt shown → dismissed · no coach note ·
achievement at 0 · no nutrition plan (section hidden) · WebGL off (chrome://flags or `--disable-webgl` → PNG, no drag hint) ·
CPU throttling (content first, then the bell) · EN via Settings · VoiceOver: dock labels read when collapsed, the knob is a
button (Enter / Space start) · reduced motion: no float / pulse / nudge, a fade between tabs, the bell still turns by hand ·
iPhone SE + Pro Max (safe areas, dock above the home indicator) · a desktop window (480 px centered column).

## Known issues / TODOs

- Main mobile bundle is still over Vite's 500 kB warning (old backlog item "Split the mobile bundle by role").
- Hidden sections above need data or wording from you.
- A long Latin workout name is clamped to 2 lines at 64 px.
- Rubik / Barlow are loaded for the whole app (one Google Fonts request) though only Home and the dock use them.
- Other tab screens were not redesigned; they now sit under the floating dock (padding updated in `AppShell`).

## Suggested commits

1. `feat(tokens): trainee Home direction B tokens and fonts` — `packages/tokens/tokens.css`, `apps/mobile/src/styles/globals.css`
2. `feat(mobile): floating dock and depth tab transitions` — `apps/mobile/src/app/config/tabs.ts`, `apps/mobile/src/app/router/AppRouter.tsx`,
   `apps/mobile/src/components/layout/`, `apps/mobile/src/hooks/useScreenTransition.ts`, `apps/mobile/src/hooks/usePageEnter.ts`,
   `apps/mobile/src/services/haptics/`
3. `feat(home): trainee Home redesign with live 3D kettlebell` — `apps/mobile/src/features/home/`,
   `apps/mobile/src/features/workouts/data/freeTimerSettings.ts`, `apps/mobile/src/features/workouts/pages/IntervalTimerPage/IntervalTimerPage.tsx`,
   `apps/mobile/package.json`, `package-lock.json`
4. `docs: trainee Home direction B report` — `docs/phase-reports/design-trainee-home-b.md`

```sh
git add -A -- packages/tokens/tokens.css apps/mobile/src/styles/globals.css
git commit -m "feat(tokens): trainee Home direction B tokens and fonts"

git add -A -- apps/mobile/src/app/config/tabs.ts apps/mobile/src/app/router/AppRouter.tsx apps/mobile/src/components/layout apps/mobile/src/hooks/useScreenTransition.ts apps/mobile/src/hooks/usePageEnter.ts apps/mobile/src/services/haptics
git commit -m "feat(mobile): floating dock and depth tab transitions"

git add -A -- apps/mobile/src/features/home apps/mobile/src/features/workouts/data/freeTimerSettings.ts apps/mobile/src/features/workouts/pages/IntervalTimerPage/IntervalTimerPage.tsx apps/mobile/package.json package-lock.json
git commit -m "feat(home): trainee Home redesign with live 3D kettlebell"

git add -A -- docs/phase-reports/design-trainee-home-b.md
git commit -m "docs: trainee Home direction B report"
```

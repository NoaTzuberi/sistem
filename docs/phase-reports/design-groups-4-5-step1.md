# Cardio type presets, measurement colors, group 5 cleanup + previews for groups 4 / 5 (2026-11-05)

## Summary
- **A. Run builder types load a structure.** ריצה / אינטרוולים / הליכה / אופניים each load their starter blocks
  (`SPORT_PRESETS` in `cardio/data/ownCardioDraft.ts`). Untouched blocks switch at once; after an edit the shared
  ConfirmSheet asks "להחליף את מבנה האימון?" — "החלפה" loads the preset, "להשאיר את המבנה" changes only the type,
  ✕ / scrim / Esc changes nothing. A new workout now starts on the ריצה preset. The summary + chart follow live.
- **B. One color per measurement, everywhere.** Tokens `--color-measure-*` = chest #7C4DFF, waist #FF006E, hips #C23BC0,
  arms #0094FF, thighs #FF7A00 (the dashboard Body tab and the log sheet use the same tokens, so they change too). One
  shared class map (`profile/measurementTones.css` → `--meas-color`) drives the profile row stripe + sparkline, the
  chips (unselected = white + color dot, selected = solid color + white text) and the measurements chart (line, dots,
  area 18% → 0; the latest point keeps its white ring). The change pill is unchanged.
- **Sparkline direction bug — cause:** `buildMiniChart` mirrored the time axis in Hebrew (newest on the LEFT), so a
  falling value drew a rising line. Now every body chart runs old → new left → right (latest dot on the right) inside
  `dir="ltr"` / `direction="ltr"`, also the Profile weight card (its axis labels + reveal animation follow). Checked
  with trainee2's real data: waist 73 → 72.5 → 72 etc. all slope down to the right.
- **Group 5 items 3–5 (done):** dock band, Hebrew letter-spacing, dead exercise library (details below).
- **Previews (waiting for "approved"):** group 4 (achievements, forgot / reset password, language switch, trainee
  messages) and group 5 items 1–2 (coach profile, coach messages).

## Group 5 item 3 — the band behind the dock
`AppShell` takes `surface="soft"` → `data-surface="soft"`: the shell and the band behind the dock use
`--color-subscreen-page` (#F6F4F7). Set on every soft-surface screen with the dock: Profile, Settings, Questionnaire,
Weight, Measurements, Progress photos, Photo compare, Workout detail, Workout log and every coach screen (CoachScreen);
also on the two soft full screens without a dock (Measurements log, message threads). Home / Workouts / Nutrition stay
white (their page is white). Screenshots: `screenshots/dock-{coach-profile,settings,photos}-real.jpg`.

## Group 5 item 4 — Hebrew letter-spacing (43 declarations removed)
- Mobile (9): `typography.css` h1, h2, h6, `.text-label`; today-headline-title (workout name), wp-header-name (workout
  name, was mono), wp-card-name, achievement-list-title, streak-summary-label, achievement-strip-title,
  onboarding-answers-title.
- Dashboard (34): page-title, publish-title, sheet-title, trainee-name, tab-card-title, ach-modal-title, ach-grid-title,
  ach-stat-value, goal-weight-number (has the Hebrew unit), tqv-spotlight-title, tqv-hero-name, pw-info-name,
  login-badge, login-headline, ai-plan-title, nutrition-plan-title, nb-card-title, nutrition-empty-title,
  calculation-summary-subtitle, nb-header-name, greeting-title, settings-preview-eyebrow, templates-empty-title,
  food-section-heading, food-card-name, notice-panel-title, stat-tile-value (has a unit), workout-hero-title,
  builder-title, family-tile, library-header-title, family-detail-name.
- Kept — Latin-only mono eyebrows (aria-hidden): `.eyebrow`, ach-hero-eyebrow, wp-card-position, cp-live / finish /
  detail eyebrows, pp-eyebrow, mp-eyebrow, pf-compare-label code, pf-chart-axis, sts-go ("GO"), cb-editor-eyebrow.
- Kept — number-only values (digits, no Hebrew possible): cp-live-clock, key-number-value, ach-hero-number,
  calories-ring-kcal, nb-eq-value, nb-target-number, greeting-number dd, pump-count, hero-value, invite-code-value,
  settings-stepper-input, settings-preview-number, retention-value, chart-headline-value, chart-tooltip-value,
  exercise-spec-number, hero-stat dd, library-summary-card dd. Say if these should go too.

## Group 5 item 5 — dead trainee exercise library
- Grep: nothing outside `features/exercises` + `services/exercises` imported them; no route, tests, copy folder or
  assets. Deleted both folders (20 files), `ROUTES.EXERCISES`, `EXERCISE_DETAIL_PATH` / `exercisePath` (routes.ts), the
  i18n-audit skip entries, and `--loop-slow` (only they used it).
- `/exercises` had no route of its own: it already falls to the catch-all `RootRedirect` → her landing screen (Home).
  Nothing links to it, so no route was added. Coach library + server exercise API untouched.

## Previews (step 1 — not built)
Files in `docs/design-preview/` (gitignored): `achievements.html`, `auth-password.html?s=request|sent|form|success|expired`,
`login.html`, `messages.html?s=thread|empty`, `coach-messages.html?s=list|thread|empty`, `coach-profile.html`, shared
`group45.css`, real app CSS in `snap/app.css`. Before / after in `screenshots/*-before.jpg` / `*-after.jpg`. Serve with
`python3 -m http.server 8765` from the repo root.

## Decisions for the owner
1. Achievements page = the Profile "הישגים" board (hero, chips, category groups, medals, modal) + a white "הבא בתור"
   card (3 closest, bars in the category color) + one white numbers card (workouts / volume / PRs + best streak and
   this week). The old grey tiles + side-bar rows go; coach mode's trainee Overview (#15) uses the same ProgressStats —
   restyle it there too?
2. Reset success: today a reset signs her in and goes straight to the app. The preview shows a success card
   ("הסיסמה אופסה בהצלחה." + התחברות). Keep going straight in, or show the card first?
3. "נשלח אלייך מייל" becomes the sent-state title (your wording); the line under it is the server's existing text.
4. Own bubbles = Neon Pink with white text (as asked). White on #FF006E is ~4:1 — under AA for 16px body text. OK, or
   use the darker pink (`#D4005C`, ~5:1)?
5. Day separators need a label: proposed the date (`יום ב׳, 3 בנוב׳`) and "היום" / "אתמול" — "היום" / "אתמול" are new
   words (DRAFT) unless shared copy has them.
6. Trainee messages has no dock (full screen), so "clears the dock" = clears the safe area + keyboard
   (visualViewport) only.
7. Coach profile: no coach bio exists yet (Phase 16a), so no bio line. "פרטים אישיים" and "הודעות שנשלחות עם
   התוכנית" have no screen in the app — proposed as rows that open the dashboard Settings (external-link icon). OK, or
   leave them out? The mode switch (both roles only) stays as a row in "הגדרות".
8. Coach messages: search filters the list by trainee name on the phone (placeholder = the existing "חיפוש מתאמנת").
   Message texts in the previews are samples (the dev DB has no messages).
9. Language switch on light surfaces (coach profile, dashboard) uses the soft grey track; on pink, white 20%.

## Design-audit grep (both apps, after this change)
| Check | Mobile | Dashboard | Notes |
|---|---|---|---|
| `transition: all` | 0 | 0 | |
| Hard-coded hex | 0 | 0 | |
| Green / gold / brown | 0 | 0 | "amber" = the orange warning tokens (#c75a00 / #ff7a00 family), not brown |
| Side bars (thick inline border) | 6 | 4 | mobile: Button secondary, CoachIntro, PlanExerciseList, PersonalRecordList, UnlockedAchievements, AchievementList (the last goes with group 4) |
| Glass (`backdrop-filter`) | 22 | 52 | mostly the designed auth card, dock, sheets and stage chips |
| Small radius ≤ 6px | 12 | 6 | chart bars, progress bars, confetti — intended |
| Square (radius 0) | 1 | 1 | |
| Cherry fills | 18 | 18 | mostly "done" states (allowed); LanguageSwitch goes with group 4 |
| Outlined button (`.btn-secondary`) | 3 | 0 | `components/common/Button` (LogoutButton on coach profile — goes with group 5 item 1) |
| Letter-spacing | 12 | 18 | all Latin mono eyebrows or numbers (lists above) |

## Files changed
- A: `apps/mobile/src/features/cardio/{data/ownCardioDraft.ts, hooks/useOwnCardioBuilder.ts, pages/OwnCardioBuilderPage/OwnCardioBuilderPage.tsx, copy/he.ts, copy/en.ts}`
- B: `packages/tokens/tokens.css`, `apps/mobile/src/features/profile/{measurementTones.css (new), data/profileDisplay.ts, components/MeasChips/*, components/MeasChart/MeasChart.css, components/MeasurementList/*, components/WeightCard/*, pages/MeasurementsPage/*}`
- Dock: `components/layout/AppShell/*` + the 12 pages listed above (`surface="soft"`)
- Letter-spacing: 9 mobile + 31 dashboard CSS files (above)
- Exercise library: deleted `apps/mobile/src/features/exercises/`, `apps/mobile/src/services/exercises/`; modified `app/config/routes.ts`, `scripts/i18n-audit.mjs`; `--loop-slow` removed from tokens.css
- Dependencies: none.

## How to test
- `npm run lint`, `npm run test:i18n` (41 / 41), `npx tsc --noEmit -p apps/mobile/tsconfig.app.json`, the dashboard's, and
  both builds — all pass.
- Run builder: Workouts → + → אימון ריצה חדש → tap each type (blocks change at once) → change a duration → tap another
  type → the sheet → "להשאיר את המבנה" (type changes, blocks stay) / "החלפה".
- Profile → היקפים: colors + sparklines slope with the data; tap a row → chips + chart in that color.
- Coach Profile / Settings / Photos → scroll to the bottom: no white band behind the dock.

## Known issues / TODOs
- `tokens.css` carries both the measurement colors (B) and the `--loop-slow` removal (item 5) — it goes in the B commit.
- The deep-linked measurement chip (`?m=thighs`) can open scrolled out of view in the chip row (not new).

## Suggested commits
```bash
git add -A -- apps/mobile/src/features/cardio
git commit -m "feat(mobile): run builder types load their starter structure, confirm before replacing edited blocks"
git add -A -- packages/tokens/tokens.css apps/mobile/src/features/profile/measurementTones.css apps/mobile/src/features/profile/data/profileDisplay.ts apps/mobile/src/features/profile/components/MeasChips apps/mobile/src/features/profile/components/MeasChart apps/mobile/src/features/profile/components/MeasurementList apps/mobile/src/features/profile/components/WeightCard apps/mobile/src/features/profile/pages/MeasurementsPage
git commit -m "fix(mobile): one color per measurement and body charts always run old to new left to right"
git add -A -- apps/mobile/src/components/layout/AppShell apps/mobile/src/features/workouts/pages/WorkoutDetailPage/WorkoutDetailPage.tsx apps/mobile/src/features/workouts/pages/WorkoutLogPage/WorkoutLogPage.tsx apps/mobile/src/features/coach/components/CoachScreen/CoachScreen.tsx apps/mobile/src/features/profile/pages/MeasurementsLogPage/MeasurementsLogPage.tsx apps/mobile/src/features/profile/pages/PhotoComparePage/PhotoComparePage.tsx apps/mobile/src/features/profile/pages/ProfilePage/ProfilePage.tsx apps/mobile/src/features/profile/pages/ProgressPhotosPage/ProgressPhotosPage.tsx apps/mobile/src/features/profile/pages/QuestionnairePage/QuestionnairePage.tsx apps/mobile/src/features/profile/pages/SettingsPage/SettingsPage.tsx apps/mobile/src/features/profile/pages/WeightPage/WeightPage.tsx apps/mobile/src/features/messages/components/ThreadScreen/ThreadScreen.tsx
git commit -m "fix(mobile): the band behind the dock takes the soft page surface"
git add -A -- apps/mobile/src/styles/typography.css apps/mobile/src/features/home/components/TodayWorkoutHeadline apps/mobile/src/features/achievements/components/AchievementList apps/mobile/src/features/achievements/components/AchievementStrip apps/mobile/src/features/achievements/components/StreakSummary apps/mobile/src/features/workouts/components/PlayerExercise apps/mobile/src/features/workouts/components/PlayerHeader apps/mobile/src/features/coach/components/OnboardingAnswers apps/dashboard/src
git commit -m "style: no letter-spacing on text that can be Hebrew"
git add -A -- apps/mobile/src/features/exercises apps/mobile/src/services/exercises apps/mobile/src/app/config/routes.ts scripts/i18n-audit.mjs
git commit -m "chore(mobile): delete the unused trainee exercise library"
git add -A -- docs/phase-reports/design-groups-4-5-step1.md
git commit -m "docs: report for run builder presets, measurement colors, group 5 cleanup and group 4/5 previews"
```

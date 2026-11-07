# Cleanup + tokens split (2026-11-07)

## Summary
- **Cleanup** (own commit): deleted the unused dashboard `NutritionAiDraftCard` and `MealEditor` (grep: nothing imported
  them; no copy keys or helpers became unused) and `formatRelative` from @sistem/shared (no callers since `formatTimeAgo`
  got its own wording). CLAUDE.md's shared-helpers list updated (gitignored, not committed).
- **Tokens split** — a pure refactor: `packages/tokens/tokens.css` (1535 lines) → an entry of `@import`s + 24 topic files.
  Every custom property keeps its name and value; `npm run check:tokens` confirms 1210 properties in 3 selectors
  (`:root`, `:root:lang(en)`, `:root[dir='rtl']`) resolve identically to HEAD. Apps still import `tokens.css`; no app code changed.

## Audit
- Consumers: both apps `import '@sistem/tokens/tokens.css'` in `main.tsx` (Vite inlines the `@import`s). No mirror / copy
  script. Two scripts read the file directly: `scripts/contrast-audit.mjs` (part of `npm run lint`) and
  `scripts/check-colors.mjs` (dev only) — both now read the entry + its imports in order.
- Old sections (lines): 1 Colors 572 · 2 Fonts 43 · 3 Type scale 65 · 4 Spacing 9 · 5 Shape 57 · 6 Shadows 79 · 7 Motion 67 ·
  8 Opacity 5 · 9 Layers 13 · 10 Breakpoints 14 · 11 App chrome 48 · 12 Slide + cardio 66 · 13 Trainee Profile 163 ·
  14 Questionnaire + Settings 57 · 15 First run 60 · 16 Auth 6 · 17 Coach mode 128 · `:lang(en)` 35 · `[dir='rtl']` 14.
- **Defined twice** (the later wins; kept, order preserved): `--color-on-ink-muted` (65% then 72% — both in
  `semantic/text.css`, in order), `--text-coach-name` (20px nutrition → 26px coach) and `--size-coach-avatar` (32px nutrition →
  40px coach) — `coach.css` is imported after `nutrition.css` for this (the checker fails if the order flips).
- **Look unused** (no reference in either app, the shared packages or another token) — 37, not deleted:
  base: `--shadow-none`, `--breakpoint-lg|2xl|3xl` (breakpoints are documentation for hand-written @media), `--tab-bar-height`,
  `--transition-snap`, `--cut-corners-diagonal`, `--border-width-heavy`; components: `--size-switch-width|height`;
  achievements `--text-ach-target`; cardio `--color-cardio-strength|preview`, `--size-cb-icon`; coach `--color-coach-segment-track`,
  `--surface-coach-tabs`, `--radius-coach-pill`, `--size-coach-quick-action`, `--size-coach-bar`, `--text-coach-tab`,
  `--text-coach-metric`; dashboard `--surface-frosted-light`, `--gradient-week-cloud`, `--surface-timeline`; nutrition
  `--color-nb-goal-gain`; profile `--text-profile-goal|badge`, `--size-profile-badge|tab|tick`, `--radius-profile-badge`,
  `--color-profile-tick-rest|switch-off`, `--shadow-profile-badge`; workouts `--text-workouts-title`, `--text-week-label`;
  surfaces `--color-stage-shadow`.

## File map (lines)
```
tokens.css                 40   entry: @imports only
base/palette.css           49   brand colors, neutrals, solid / tint / ink pairs, ink
base/typography.css       111   fonts, type scale, weights, line heights (+ English display sizes)
base/spacing.css           85   space scale, radii, cuts (+ RTL), borders
base/elevation.css        104   shadows, rings, blurs, opacity, z-index
base/motion.css            72   durations, easings, press scales, loops
base/layout.css            50   breakpoints, touch, sidebar / drawer / dock, safe areas (+ RTL)
semantic/surfaces.css      33   brand gradient, card, soft fill, hairline, pink stage, hover fills, frosted header
semantic/text.css          21   faint text, text and rules on ink
semantic/states.css        20   primary hover, warning, flag, disabled
components/controls.css    26   pill button, segmented, language switch, iOS switch
components/sheets.css      27   sheet scrim / handle / sizes, confirm sheet
components/slide.css       24   slide to start
domains/auth.css           31   glass, running track, auth stage, social button, auth notice
domains/onboarding.css     45   question deck, wheel, video veil
domains/first-run.css      74   first run / self-guided / payments / photos (+ English)
domains/home.css           50   lanes, pulse, 3D object + studio, Home sizes
domains/workouts.css       88   workout identity colors, Workouts tab, detail / log, interval timer
domains/exercises.css      26   movement-pattern colors
domains/cardio.css         61   zones Z1–Z5, live player, run builder
domains/nutrition.css     129   portion groups, trainee Nutrition, dashboard builder / library
domains/body.css           38   measurement colors, measurement screens
domains/achievements.css   76   category colors, hero, medals, modal, page
domains/profile.css       145   profile stage / card, sub-screens, questionnaire tints (+ English)
domains/coach.css         168   coach mode, messages, coach profile, default plan messages (+ English)
domains/dashboard.css     160   canvas, login flow, statistics, quick view, notifications, publish modal
```
(`semantic/` has no colors of its own for ink / on-primary — those stay in the palette.) Old `═══ N.` headings became plain
section comments; every file starts with a 2–4 line header (what goes in, what doesn't).

## Verification
- `npm run check:tokens` → "Tokens match HEAD: 1210 custom properties in 3 selectors." It was also run against two
  deliberate breaks (a changed value; nutrition imported after coach) and reported both.
- `npm run lint` (i18n + contrast audits: no findings; the contrast audit loads all 1175 `:root` tokens), `npm run test:i18n`
  (41 / 41), both `tsc --noEmit`, `npm run build` — pass. `node scripts/check-colors.mjs` — 0 / 0.
- Screenshots old tokens.css vs the split (PNG, same session): Home, Nutrition, coach trainee page, dashboard trainee —
  byte-identical; dashboard overview differs only in its live "overdue by 679 h 12 / 19 min" timers (taken minutes apart).
  Saved (gitignored): `docs/design-preview/screenshots/tokens-split/<screen>-{old,new}.png`.

## Known issues / TODOs
- The 37 unused candidates and the 3 double definitions above — owner's call.
- `check:tokens` compares with HEAD, so it is a refactor check, not part of `lint` (an intended value change would fail it).

## Suggested commits
```bash
git add -A -- apps/dashboard/src/features/aiDraft/components/NutritionAiDraftCard apps/dashboard/src/features/nutrition/components/MealEditor packages/shared/src/i18n/intl.ts docs/phase-reports/design-groups-4-5-followups.md
git commit -m "chore: remove unused NutritionAiDraftCard, MealEditor and formatRelative"
git add -A -- packages/tokens scripts/check-tokens.mjs scripts/check-colors.mjs scripts/contrast-audit.mjs package.json
git commit -m "refactor(tokens): split tokens.css into base, semantic, component and domain files"
git add -A -- docs/phase-reports/tokens-split.md
git commit -m "docs: report for the cleanup and the tokens split"
```

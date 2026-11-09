# Dashboard: Karantina font + dev reset for the welcome

Date: 2026-11-09. Lint + i18n + contrast audits clean, every app builds. Checked on an isolated in-memory database.

## Summary
- **Karantina in the dashboard.** `@fontsource/karantina@^5.3.0` (same as mobile) is imported in `main.tsx` (700
  weight only), plus the same size-matched "Karantina Fallback" face (`styles/fonts.css`), so the swap doesn't move
  the layout. The tour card titles and the welcome title now draw in Karantina.
- **Nothing else changes.** Only `TourOverlay.css` and `TourWelcome.css` use the display font in the dashboard.
  Overview, Trainees, Settings and Food list were screenshotted with and without the Karantina file: pixel-identical.
  Dashboard page titles ("צהריים טובים, …", page headers) use the heading font, not Karantina, so they are unchanged.
- **Why the welcome didn't show.** It only opens while `CoachProfile.tourCompletedAt` is empty. Your coach account
  finished or skipped the tour before the welcome existed, which set that date, so the welcome counts as seen.
- **Dev reset.** `npm run dev:reset-tour -- <coach email>` clears `tourCompletedAt` for that coach and prints the old
  value. It refuses NODE_ENV=production, `--env-file`, any env file or database name containing "prod" (Sistem-prod),
  and a non-local database without `--allow-remote`. It prints the target database (hosts + name, never credentials).

## How to see the welcome again
1. `npm run dev:reset-tour -- <your coach email> --allow-remote` (your dev database is non-local, so the flag is needed).
2. Check the printed database name is your DEV one, and the line says "Cleared".
3. Reload the dashboard: the welcome opens about a second after the page loads.
4. "אולי אחר כך" / Esc / × marks it seen again; repeat step 1 to see it once more.

## Files changed
- Added: `apps/dashboard/src/styles/fonts.css`, `apps/server/src/features/coachProfiles/scripts/resetTour.ts`,
  `docs/phase-reports/signup-welcome-checks/karantina-{welcome,tour}-he.png`, this report.
- Modified: `apps/dashboard/src/main.tsx`, `apps/dashboard/package.json`, `package-lock.json`, `package.json`,
  `apps/server/package.json`.

## Dependencies
- Added: `@fontsource/karantina` ^5.3.0 to `@sistem/dashboard` (already in the lockfile for mobile, one lock line).

## Known issues / TODOs
- English tour / welcome titles use `--font-num` (Barlow Condensed italic), which the dashboard doesn't load either; they
  still fall back to a system bold italic. Same fix (`@fontsource/barlow-condensed/800-italic.css`) if you want it.

## Suggested commits
```sh
git add -A -- apps/dashboard/package.json apps/dashboard/src/main.tsx apps/dashboard/src/styles/fonts.css package-lock.json docs/phase-reports/signup-welcome-checks/karantina-welcome-he.png docs/phase-reports/signup-welcome-checks/karantina-tour-he.png
git commit -m "fix(dashboard): load Karantina for the tour and welcome titles"
git add -A -- apps/server/src/features/coachProfiles/scripts/resetTour.ts apps/server/package.json package.json
git commit -m "chore(server): dev-only script to show the dashboard welcome again"
git add -A -- docs/phase-reports/dashboard-font-reset-tour.md
git commit -m "docs: report for the dashboard font and the welcome reset"
```

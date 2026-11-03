# Body measurements screen ("מידות") — direction B redesign (2026-11-03)

## Summary
- `/profile/measurements` rebuilt in the Profile's direction-B style: soft page surface, round back + Karantina
  title (the shared `SubScreenHeader`), a pink "+ תיעוד" pill, ink/white measurement chips (side-scroll, no
  scrollbar), a white hero card (latest value 56px Barlow, date, change pill, the spring segmented range control,
  the chart), and "היסטוריה" as white cards with soft value chips (the chart's measurement in ink).
- Opens on the tapped measurement: the Profile's measurement rows link to `/profile/measurements?m=<id>`
  (`measurementsPath(id)`); the default stays the first one with data. Switching updates `?m=` (replace).
- Chart: monotone smooth pink line (2.5px) over a pink 18% → 0 gradient, small dots, the latest bigger with a
  white ring, 3 light y gridlines/labels, muted 12px x labels, tap/drag → ink tooltip pill (value + date), arrow
  keys / Esc. Line draws in (400ms ease-out) on every range / measurement change; none with reduced motion.
- One point: value + "עוד מדידה אחת ונראה מגמה"; no data for that measurement: "עדיין לא תועדו מידות.".
- Change pill: down = cherry tint (#FFE3EE / #A50047) + down arrow, up / none = soft grey; screen readers hear
  "ירידה של / עלייה של …". No green, no judgment words.
- Data, saving and the log / edit screens are unchanged; the coach's body tab and the weight screen keep the old
  `TrendChart` / `MeasurementHistory` (not part of this request).

## Files changed
- Added: `apps/mobile/src/features/profile/components/{MeasChart,MeasChips,MeasHero,MeasHistory}/` (.tsx + .css),
  `features/profile/hooks/useMeasurementTrend.ts` (selection from `?m=`, range, change, history),
  `features/profile/hooks/useMeasChart.ts` (size + touch), `features/profile/data/measChart.ts` (pure: smooth path,
  area, 3 ticks — on top of the shared `buildLineChart`), this report.
- Modified: `features/profile/pages/MeasurementsPage/MeasurementsPage.{tsx,css}`, `MeasurementList.tsx` (link with
  `?m=`), `app/config/routes.ts` (`measurementsPath`), `features/bodyTracking/copy/{he,en}.ts` (chartOneMore,
  historyTitle, measurementPicker, changeDown / changeUp — DRAFT except the line you gave), `packages/tokens/tokens.css`
  (`--*-meas-*` block before section 14).
- Dependencies: none.

## How to test
- `npm run lint` (oxlint + i18n + contrast audits) and the mobile typecheck pass; `npm run test:i18n` 41 / 41.
- Checked in the browser at 390×844 (iPhone 14 width) with the dev seed accounts — screenshots in chat:
  several points (trainee2, waist, 3M and All + tooltip), history cards, one point, empty measurement.
- Manual: Profile → tap "מותניים" → the screen opens on it; switch chips / ranges → the line redraws; tap and drag
  the chart; tap a history card → the existing edit screen; English (Settings) → LTR, same layout.

## Known issues / TODOs
- Wide screens: the app shell already centers the app at 480px (`--app-column-max`), narrower than the ~720px
  you mentioned — the screen does not stretch. Say if this one screen should be wider than the rest of the app.
- Test data: one temporary measurement day was added to trainee1@sistem.dev (dev DB) for the one-point shot and
  deleted afterwards (trainee1 has 0 entries again). trainee2's data was only read.
- Copy marked DRAFT (he + en) apart from "עוד מדידה אחת ונראה מגמה" and "היסטוריה".

## Suggested commits
```bash
git add -A -- packages/tokens/tokens.css apps/mobile/src/app/config/routes.ts apps/mobile/src/features/bodyTracking/copy/he.ts apps/mobile/src/features/bodyTracking/copy/en.ts apps/mobile/src/features/profile/data/measChart.ts apps/mobile/src/features/profile/hooks/useMeasurementTrend.ts apps/mobile/src/features/profile/hooks/useMeasChart.ts
git commit -m "feat(mobile): measurement trend hook, smooth chart math and tokens for the measurements screen"
git add -A -- apps/mobile/src/features/profile/components/MeasChart apps/mobile/src/features/profile/components/MeasChips apps/mobile/src/features/profile/components/MeasHero apps/mobile/src/features/profile/components/MeasHistory apps/mobile/src/features/profile/pages/MeasurementsPage apps/mobile/src/features/profile/components/MeasurementList/MeasurementList.tsx docs/phase-reports/measurements-redesign.md
git commit -m "feat(mobile): direction-B measurements screen that opens on the tapped measurement"
```

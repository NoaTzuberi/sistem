# Design fix group 2 — weight, log measurements, photo compare (direction B, 2026-11-04)

## Summary
- Built from the approved previews (`docs/design-preview/{weight,measurements-log,photo-compare}.html`). Data, routes and logic kept.
- **Weight (`/profile/weight`):** the measurements screen's parts — round back + Karantina title, the pink "+ תיעוד" pill (still the
  weight sheet), the hero card (`MeasHero`: 56px value, change pill, spring segmented range, pink chart with tooltip), and history as
  white cards (`WeightHistoryCards`: date, value, change since the weigh-in before — cherry tint down, soft grey up).
- **Log measurements (`/profile/measurements/log`, still a page):** the day as a soft pill over the native date picker, one white card
  per measurement (label + "אחרון: …" on the start side, a 52px soft input with the number in Barlow 24 and the unit after it), the sticky
  56px pink "שמירה" — disabled until something changed. Delete uses the ConfirmSheet.
- **Per-row errors:** the server's range error now also sends `field` (the measurement id); the page shows the server's message under
  that row (anything else under the form). No new texts.
- **Photo compare (`/profile/photos/compare`, also coach mode read-only):** pose chips (white / ink, existing labels), the two days as
  soft pills over native selects ("לפני: …" / "אחרי: …"), a "{n} ימים" chip, the "זה לצד זה / החלקה" switch: side by side (radius 20, the
  day's weight on each photo) or the existing Profile slider (`PhotoCompareFrame`, now with optional לפני / אחרי labels). Empty state:
  your sentence + the pink "הוספת תמונה" (her screen only → today's photos page). Photos stay signed links.

## Notes
- Copy: "זה לצד זה", "החלקה", "הוספת תמונה" and the empty-state sentence are yours; "{n} ימים" (plural) and the switch's screen-reader
  label are DRAFT. "אחרון:" kept.
- The server's range message names the measurement by its id ("waist חייב להיות בין 10 ל־300 ס״מ.") — existing server text (its
  catalog has no measurement labels); worth a wording fix later.
- The weight sheet itself (log / edit) is unchanged (still the old Modal) — not part of this group.
- Old chart (`TrendChart`, `RangePicker`, `LineChart`), `MeasurementPicker`, `MeasurementHistory`, `WeightHistory` kept — coach mode's Body
  tab still uses them; they go in the coach-tabs group (your decision).
- Real-app check: the side-by-side / slider views need progress photos (the test account has none) — checked in the preview only; the
  empty state, weight and the form (incl. the per-row server error with a 2 cm value — nothing saved) checked in the app.

## Files changed
- Added: `apps/mobile/src/features/profile/hooks/{useWeightTrend,useMeasurementsLog}.ts`, `features/profile/components/WeightHistoryCards/`,
  `features/bodyTracking/hooks/usePhotoComparison.ts`, this report.
- Modified: `features/profile/pages/{WeightPage,MeasurementsLogPage,PhotoComparePage}/*`, `features/profile/components/{MeasHero,MeasChart,
  PhotoCompareFrame}/*.tsx`, `features/bodyTracking/components/PhotoCompare/*`, `features/bodyTracking/copy/{he,en}.ts`,
  `packages/api-client/src/{createApiClient,index}.ts` (`extractErrorField`), `apps/server/src/features/bodyMetrics/bodyMetric.controller.ts`
  (+ test), `packages/tokens/tokens.css` (`--*-ml-*`).
- Dependencies: none.

## How to test
- `npm run lint` (oxlint + i18n + contrast audits), `npm run build -w @sistem/mobile`, `npm run test:i18n`, body-metrics server tests (35) — pass.
- Before / after (gitignored): `docs/design-preview/screenshots/{weight,measurements-log,photo-compare}-real.jpg`.

## Suggested commits
Run the confirm-sheet and cardio-builder commits first (`docs/phase-reports/confirm-sheet.md`, `cardio-builder.md`) — they share `tokens.css`.

```bash
git add -A -- apps/server/src/features/bodyMetrics/bodyMetric.controller.ts apps/server/src/features/bodyMetrics/__tests__/bodyMetrics.test.ts packages/api-client/src/createApiClient.ts packages/api-client/src/index.ts
git commit -m "feat(server): a body measurement's range error names its field so the form can show it under that row"
git add -A -- packages/tokens/tokens.css apps/mobile/src/features/profile/components/MeasHero apps/mobile/src/features/profile/components/MeasChart apps/mobile/src/features/profile/hooks/useWeightTrend.ts apps/mobile/src/features/profile/components/WeightHistoryCards apps/mobile/src/features/profile/pages/WeightPage
git commit -m "feat(mobile): direction-B weight screen with the measurements hero, chart and history cards"
git add -A -- apps/mobile/src/features/profile/hooks/useMeasurementsLog.ts apps/mobile/src/features/profile/pages/MeasurementsLogPage
git commit -m "feat(mobile): direction-B log measurements form with row cards, per-row errors and a sticky save"
git add -A -- apps/mobile/src/features/bodyTracking/hooks/usePhotoComparison.ts apps/mobile/src/features/bodyTracking/components/PhotoCompare apps/mobile/src/features/bodyTracking/copy apps/mobile/src/features/profile/components/PhotoCompareFrame apps/mobile/src/features/profile/pages/PhotoComparePage docs/phase-reports/design-group-2-body.md
git commit -m "feat(mobile): direction-B photo compare with pose chips, date pills, side by side or slider"
```

# Groups 4–5 follow-ups (2026-11-07)

## Summary
1. **Join screen**: "יש לי כבר חשבון" is now the soft white pill. The outlined `secondary` variant of
   `AuthSubmitButton` is removed (nothing else used it); variants are `primary` | `soft`.
2. **Dashboard side bars → rounded soft cards** (radius `--radius-profile-group`, no side border):
   NutritionAiRationale, NutritionAiDraftCard, MealEditor. The 4th grep hit, PortionSplitBar, is the white gap between
   bar segments (not a side bar) — kept. NutritionAiDraftCard and MealEditor were unused — deleted afterwards in a
   separate cleanup commit (with `formatRelative`), so only NutritionAiRationale's change is in this commit.
3. **Time ago**: `formatTimeAgo` (@sistem/shared) no longer uses Intl.RelativeTimeFormat — its Hebrew short form reads
   "לפני דק׳ (1)". Own wording in the shared copy (`timeAgo.minutes|hours|days`, plural forms): he "לפני דקה",
   "לפני 5 דק׳", "לפני שעה", "לפני שעתיים", "לפני 3 שע׳", "אתמול", "שלשום", "לפני 3 ימים"; en "5 min ago", "2 hr ago",
   "yesterday", "3 days ago" (EN DRAFT; Hebrew beyond the two given examples DRAFT). The number is isolated LTR with
   `isolateLtr` — the text form of `<bdi dir="ltr">`; a string is needed because some callers put it inside sentences
   (`lastActivityAt`, `today.joined`). All callers get it with no change: mobile coach Messages rows, coach Today activity,
   new-trainee line, Home coach note, reaction notice; dashboard activity feed, notifications, trainees table, quick view,
   archive table.
4. **StartingPhotoStep.css**: `--line-height-normal` (doesn't exist) → `--line-height-base` (1.5). CSS only.
5. **Coach Overview**: "8 / 28 הישגים" is back as a small soft chip under the numbers card (`ProgressStats`
   `showAchievementCount`, on in the overview only). New copy `achievementCount` ('{progress} הישגים', EN DRAFT).

## Files changed
- Modified: `apps/mobile/src/features/join/pages/JoinPage/JoinPage.tsx`,
  `apps/mobile/src/features/auth/components/AuthSubmitButton/{AuthSubmitButton.tsx,AuthSubmitButton.css}`,
  `apps/dashboard/src/features/aiDraft/components/{NutritionAiRationale,NutritionAiDraftCard}/*.css`,
  `apps/dashboard/src/features/nutrition/components/MealEditor/MealEditor.css`,
  `packages/shared/src/format.ts`, `packages/shared/src/copy/{he,en}.ts`,
  `apps/mobile/src/features/onboarding/steps/StartingPhotoStep/StartingPhotoStep.css`,
  `apps/mobile/src/features/achievements/components/ProgressStats/{ProgressStats.tsx,ProgressStats.css}`,
  `apps/mobile/src/features/achievements/copy/{he,en}.ts`,
  `apps/mobile/src/features/coach/components/TraineeAchievements/TraineeAchievements.tsx`
- Dependencies: none.

## How to test
- `npm run lint` (i18n + contrast: no findings), `npm run test:i18n` (41 / 41), both `tsc --noEmit`, `npm run build` — pass.
- /join/<code> signed out → the second button is the white pill.
- Coach → הודעות: "לפני 37 דק׳". Coach → trainee → סקירה: the "8 / 28 הישגים" chip.
- Dashboard → trainee → nutrition with an AI draft → "קריאה מלאה" opens the rounded rationale card.
- Screenshots (gitignored): `docs/design-preview/screenshots/real-g45-followups/<screen>-{before,after}.jpg`
  (join, coach-messages, coach-today, coach-overview, d-nutrition, d-trainees, d-overview). The rationale card is not
  open in the dashboard shot; the onboarding photo step was not shot (needs a fresh onboarding).

## Known issues / TODOs
- None open (the unused components and `formatRelative` were removed in the cleanup commit).

## Suggested commits
```bash
git add -A -- apps/mobile/src/features/join/pages/JoinPage/JoinPage.tsx apps/mobile/src/features/auth/components/AuthSubmitButton
git commit -m "style(mobile): join screen second action is the soft pill, drop the outlined auth button"
git add -A -- apps/dashboard/src/features/aiDraft/components/NutritionAiRationale
git commit -m "style(dashboard): rounded soft cards instead of side bars"
git add -A -- packages/shared/src/format.ts packages/shared/src/copy/he.ts packages/shared/src/copy/en.ts
git commit -m "fix(shared): time ago reads naturally in Hebrew and English, number isolated left to right"
git add -A -- apps/mobile/src/features/onboarding/steps/StartingPhotoStep/StartingPhotoStep.css
git commit -m "fix(mobile): starting photo step uses the existing line-height token"
git add -A -- apps/mobile/src/features/achievements/components/ProgressStats apps/mobile/src/features/achievements/copy apps/mobile/src/features/coach/components/TraineeAchievements/TraineeAchievements.tsx
git commit -m "feat(mobile): achievements count chip on the coach overview numbers card"
git add -A -- docs/phase-reports/design-groups-4-5-followups.md
git commit -m "docs: report for groups 4-5 follow-ups"
```

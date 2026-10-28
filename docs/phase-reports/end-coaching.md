# Coach: end coaching with a trainee (no account deletion)

## Audit (before)
- `coaching.service.endCoaching()` existed (sets status 'ended', live false, endedAt) but **nothing called it** —
  no route, no UI. The Coaching model already had `ended` + `endedAt`.
- Access was already centralized: `loadCoachTrainee` only passes a coach with a LIVE coaching, so an ended
  coaching closes every `/coach/trainees/:id/*` route at once (server-side, not UI).
- Note: CLAUDE.md still mentions a `no_coach` app state; it no longer exists. A trainee without a coach is
  self-guided and lands on Home.

## Summary
- `PATCH /api/coach/trainees/:id/end-coaching` (own live coaching only, via loadCoachTrainee) → Coaching ended +
  endedAt, event `coaching.ended` → in-app notification `coaching_ended` to the trainee ("<coach> סיימה את הליווי",
  a dismissible card on her Home). Her account, plans and logs are untouched; she becomes self-guided. Coming
  back = a new invite (a new Coaching; nothing re-links silently).
- Read-only archive: `GET /api/coach/archive`, `/archive/:id`, `/archive/:id/workout-logs` behind
  `loadCoachArchivedTrainee` (newest ended coaching of this coach, none live). Only that coaching's logs from
  before the end, her questionnaire, no photos at all (no avatar, Daily Pump stripped), no free workouts / body /
  meals she logs later.
- Mobile coach mode: ⋯ on the trainee stage → sheet with Cherry "סיום ליווי" → confirm sheet (Cherry / ביטול) →
  the list's new "ארכיון" filter → read-only archived page (logs + questionnaire).
- Dashboard: ⋯ (ActionMenu, danger = Cherry text) beside the plan pill → ConfirmDialog (new `cherry` pill) →
  "ארכיון" chip on the trainees list → read-only archived page.
- Logic: shared `useEndCoaching` (@sistem/shared) used by both apps; copy in shared `coach.endCoaching` /
  `coach.archive` (he + en, explanation and secondary lines marked DRAFT).

## Files changed
Server — added: `features/coach/coachArchive.service.ts`, `coachArchive.controller.ts`, `__tests__/coachArchive.test.ts`.
Modified: `events/appEvents.ts`, `features/notifications/notification.{constants,types,service,listeners}.ts`,
`features/coachings/coaching.service.ts` (endCoaching returns whether it ended), `middleware/coachTrainee.middleware.ts`,
`features/coach/coach.routes.ts`.
Packages — `types/src/index.ts`, `api-client/src/coachApi.ts`, `shared/src/{copy/he.ts,copy/en.ts,index.ts,traineeStatus.ts}`,
added `shared/src/hooks/useEndCoaching.ts`.
Mobile — added `features/coach/components/{TraineeMoreMenu,EndCoachingSheet,ArchivedTraineeRow}`,
`features/coach/hooks/{useCoachArchive,useTraineeEndCoaching}.ts`, `features/coach/pages/ArchivedTraineePage`,
`features/home/components/CoachingEndedCard`. Modified `services/coach/coachService.ts`, `app/config/routes.ts`,
`app/router/AppRouter.tsx`, `features/coach/{data/coachMode.ts,copy/he.ts,copy/en.ts}`,
`features/coach/components/{SheetButton,WorkoutLogList}`, `features/coach/pages/{TraineesPage,TraineeDetailPage}`,
`features/home/{copy/he.ts,copy/en.ts,hooks/useHomeData.ts,components/HomeScreen/HomeScreen.tsx}`.
Dashboard — added `features/trainees/{components/ArchiveTable,pages/ArchivedTraineePage,hooks/useCoachArchive.ts,data/archiveDisplay.ts}`.
Modified `components/common/{PillButton,ConfirmDialog}`, `services/coach/coachService.ts`, `app/config/routes.ts`,
`app/router/AppRouter.tsx`, `features/trainees/{hooks/useWorkoutLogs.ts,components/WorkoutLogList,components/TraineeHeader,pages/TraineeDetailPage,pages/TraineesPage}`.

## Dependencies
None.

## How to test
- `npm test` (684 server + 39 copy parity pass; new: `coachArchive.test.ts` — owner only, every live route 404
  after the end, notification, archive without photos / later data, re-join leaves the archive).
- `npm run lint` (i18n + contrast clean), `npm run build -w @sistem/mobile`, `-w @sistem/dashboard`.
- Manual: `npm run seed:dev`, coach@sistem.dev → trainee2 → ⋯ → סיום ליווי → confirm → she is under ארכיון,
  opening her shows logs + questionnaire only. Log in as trainee2 → Home shows "<coach> סיימה את הליווי" (hide = read).

## Known issues / TODOs
- Archive shows workouts + questionnaire only; past body numbers / nutrition plan / plans are not offered yet
  (decide which past data she should keep seeing).
- The dashboard questionnaire's weight-goal bar asks the live body endpoint, which now answers 404 → the bar
  stays at its start (silent).
- A workout she had open at the moment of ending is left as is (she can finish it; it is not in the archive).
- Hebrew explanation / error / empty / "ended on" lines are DRAFT for the owner.
- Shared files with the parallel coach-app Phase B work (uncommitted in the same checkout): `packages/types/src/index.ts`,
  `apps/server/src/features/coach/coach.routes.ts`, mobile `AppRouter.tsx`, `routes.ts`, `coachService.ts`,
  `features/coach/copy/*`, `TraineeDetailPage.tsx`, `SheetButton/*`. Commit Phase B first (or together) — `git add`
  of those files takes both changes.

## Suggested commits
```
git add -A -- apps/server/src/events/appEvents.ts apps/server/src/features/notifications apps/server/src/features/coachings/coaching.service.ts apps/server/src/middleware/coachTrainee.middleware.ts apps/server/src/features/coach/coachArchive.service.ts apps/server/src/features/coach/coachArchive.controller.ts apps/server/src/features/coach/__tests__/coachArchive.test.ts apps/server/src/features/coach/coach.routes.ts packages/types/src/index.ts packages/api-client/src/coachApi.ts
git commit -m "feat(server): coach ends a coaching + read-only archive"

git add -A -- packages/shared/src/hooks/useEndCoaching.ts packages/shared/src/index.ts packages/shared/src/traineeStatus.ts packages/shared/src/copy/he.ts packages/shared/src/copy/en.ts apps/mobile/src/services/coach/coachService.ts apps/mobile/src/app/config/routes.ts apps/mobile/src/app/router/AppRouter.tsx apps/mobile/src/features/coach apps/mobile/src/features/home
git commit -m "feat(mobile): end coaching from coach mode, archive filter, trainee notice on Home"

git add -A -- apps/dashboard/src/components/common/PillButton apps/dashboard/src/components/common/ConfirmDialog apps/dashboard/src/services/coach/coachService.ts apps/dashboard/src/app/config/routes.ts apps/dashboard/src/app/router/AppRouter.tsx apps/dashboard/src/features/trainees
git commit -m "feat(dashboard): end coaching menu, archive filter and read-only archived trainee"

git add -A -- docs/phase-reports/end-coaching.md
git commit -m "docs: end coaching report"
```

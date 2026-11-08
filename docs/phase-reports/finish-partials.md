# Finish the partial / missing items (status check 2026-11-07)

Date: 2026-11-08. Server tests 716/716 (new: trainee ends coaching ×2, tour ×1), copy parity 42/42, lint + i18n +
contrast audits clean, every app builds. Checked in a separate in-memory test database with the seed accounts
(never the dev or prod database), WebKit at iPhone size for mobile and Chromium at 1440 / 760 px for the dashboard.
Screenshots: `docs/phase-reports/finish-partials/`.

## Summary
1. **The trainee ends her coaching herself.** `PATCH /api/me/coaching/end` → the same end as the coach's (ended + endedAt,
   the coach loses every live route and photo), and the coach gets `trainee_ended_coaching` ("<name> סיימה את הליווי",
   tap → her archive in both apps). Mobile: Settings → "המאמנת שלי" row → sheet (coach card + Cherry "סיום הליווי") →
   the shared ConfirmSheet (destructive) → self-guided Home + a toast.
2. **Camera or gallery in onboarding.** `StartingPhotoStep` uses `PhotoSourceTiles` (no forced capture). Onboarding logic
   untouched. `StartingPhotoCard` was not used anywhere (Profile uses `PpStartingCard`, which already has the picker), so
   it was deleted with its 4 unused copy keys.
3. **iOS full-bleed on every screen.** One stack (`hooks/useDocumentSurface.ts`): every screen names its bottom surface
   (html / body color: Safari's bars, under the toolbar, overscroll) and top surface (theme-color). The newest screen
   wins, so the leaving screen of a tab transition can't overwrite it, and an overlay (the interval timer, the cardio
   player) beats its screen. AppShell sets it for every screen (default = its own ground); the screens without AppShell
   set it themselves.
4. **Copy.** Free workout "by muscle": "עד 5 תרגילים" / "up to 5" (`FREE_WORKOUT_MUSCLE_EXERCISES` = 5).
5. **Dashboard tour.** It opens once on her first dashboard visit (`CoachProfile.tourCompletedAt`; finishing or
   skipping sets it). Settings → "סיור במערכת" replays it. There are 6 steps, each a cutout around the real element.
   A step opens its page first if needed. With no element on screen (no trainees, the sidebar as a sheet under
   860 px), the card is centered. Esc = skip. The arrows go next / back (they follow the reading direction).
   Tab stays inside the card. Reduced motion = a fade only. No new dependency.

## Screen surfaces (item 3)
Probe = WebKit 393×852: the top edge vs theme-color and the last row at the end of the page vs the html color.
Every probed route matches; the full output is in `finish-partials/surfaces-probe.txt`. Before: only the auth
screens set anything, so every other screen showed #fcfcfc in Safari's bars.

| Route | Bottom (html) | Top (theme-color) | Set by |
|---|---|---|---|
| /login, /register, /forgot-password, /reset-password, /join/:code, admin-only | auth | auth | AuthScreen (unchanged) |
| /start, /start/code, /start/coach/:code, /profile/coach-code(/:code) | soft | soft | FirstRunScreen |
| /onboarding, /onboarding/:step | onboarding (new edge token) | page | OnboardingScreen |
| /waiting, /profile/photos/day, /coach/today/inbox | page | page | AppShell |
| /home | card | pink | AppShell `top="pink"` |
| /workouts, /nutrition, workout summary | card | card | AppShell (bleed) |
| /profile | soft | stage | AppShell `top="stage"` |
| settings, weight, measurements (+log), photos, compare, questionnaire, achievements, workout detail, workout log, /workouts/own-cardio/* | soft | soft | AppShell / OwnCardioBuilderPage |
| /timer | soft | soft | AppShell `bottom="soft"` (the running timer: stage / interval-rest, overlay) |
| /workouts/session/:id | stage | stage | AppShell `bottom="stage"` (was StageBackground) |
| cardio detail | card | card | CardioDetailPage |
| cardio run | page → zone-1…5 while running | same | CardioRunPage, CardioPlayer (overlay) |
| /home/messages, /coach/messages/:id | soft | ink | ThreadScreen |
| /coach/today, /coach/trainees/:id, /coach/archive/:id, /coach/profile | soft | ink | CoachScreen `inkTop` / AppShell |
| /coach/trainees, /coach/messages | soft | soft | CoachScreen |

Not probed (no data in the test DB, set by the same code): cardio detail / run, workout summary / log, archived trainee.

**Check by hand on your iPhone** (Safari, scroll down so the toolbar shrinks, then up and past the top / bottom):
1. Home (pink top, white bottom)
2. Profile (pink top, soft bottom)
3. Settings (all soft)
4. Workouts and Nutrition (all white)
5. A workout session (pink stage), and open the interval timer in it (rest = ink)
6. A cardio run (the zone color changes per block)
7. Onboarding (white top, pink bottom)
8. Coach mode: Today and a trainee's screen (ink top, soft bottom)
9. Messages thread (ink top)
10. Login (unchanged, as a reference)

## Tour copy (DRAFT — he feminine, en)
| Step (target) | he | en |
|---|---|---|
| 1 trainees (sidebar "כל המתאמנות") | **המתאמנות שלך** — כאן כל המתאמנות: מי מחכה לתוכנית, מי פעילה ומי צריכה תשומת לב. | **Your trainees** — Every trainee is here: who is waiting for a plan, who is active and who needs attention. |
| 2 invite (Trainees page button) | **ככה מצטרפים** — שלחי למתאמנת את הקישור או את הקוד בן 6 התווים. היא מזינה אותו באפליקציה ומצטרפת אלייך. | **How they join** — Send a trainee your link or your 6-character code. She enters it in the app and joins you. |
| 3 plan builder ("תוכנית חדשה") | **בניית תוכנית** — התבנית היא רק הצעה: אפשר להוסיף, להסיר ולשנות הכול. תני שם לכל אימון, והמתאמנת תראה אותו. | **Building a plan** — A template is only a suggestion: add, remove and change anything. Name each workout — your trainee sees the name. |
| 4 nutrition (sidebar "רשימת מזון") | **תזונה** — בונים תוכנית במנות או בתפריט מלא. מאגר המזונות כבר מוכן, ואפשר להוסיף ולערוך. | **Nutrition** — Build a plan in portions or as a full menu. The food bank is ready, and you can add and edit foods. |
| 5 settings (sidebar "הגדרות") | **הודעות ותשלום** — בהגדרות שומרים הודעות ברירת מחדל לשליחת תוכניות, וקישורי PayBox ו-Bit למתאמנות. | **Messages and payment** — Settings keep your default messages for sending plans, and your PayBox and Bit links for trainees. |
| 6 activity (Overview card, else the bell) | **מה קורה עכשיו** — כאן מופיעים אימונים שהסתיימו, תמונות ועדכונים מהמתאמנות. ההתראות מחכות בפעמון. | **What's happening** — Finished workouts, photos and updates from your trainees show up here. Notifications wait in the bell. |
| buttons | הבא · סיום · דילוג · "שלב {step} מתוך {total}" (screen readers) | Next · Done · Skip · "Step {step} of {total}" |
| Settings | סיור במערכת · הסיור הקצר על הדשבורד, מההתחלה. · להתחיל סיור | Dashboard tour · The short tour of the dashboard, from the start. · Start the tour |

Other new copy (DRAFT): Settings "המאמנת שלי" / sheet / confirm: "לסיים את הליווי עם {coach}?" + "החשבון וכל ההיסטוריה
שלך נשארים. תמשיכי להתאמן לבד, ואפשר להצטרף למאמנת בהמשך עם קוד." · toast "הליווי עם {coach} הסתיים" · coach
notification "{name} סיימה את הליווי" · server error `coaching_not_live`. Onboarding photo tiles reuse the progress-photo
words (צילום / פותח את המצלמה / גלריה / תמונה קיימת).

## Files changed
**Server**: `app.ts`, `events/appEvents.ts` (endedBy), `coachings/coaching.{service,routes}.ts`,
`coach/coachArchive.service.ts`, `coach/coach.routes.ts`, `notifications/notification.{constants,types,service,listeners}.ts`,
`coachProfiles/coachProfile.{model,service,controller}.ts`, `i18n/locales/{he,en}.ts`; tests:
`coach/__tests__/coachArchive.test.ts` (modified), `coachProfiles/__tests__/coachTour.test.ts` (added).
**Packages**: types `index.ts` (notification + `EndMyCoachingResponse`), `accounts.ts` (`CoachTourResponse`); api-client
`traineeApi.ts` (`endMyCoaching`), `accountsApi.ts` + `index.ts` (`createCoachTourApi`); shared `coachNotifications.ts`
(section `'archive'`), `copy/{he,en}.ts`; tokens `base/elevation.css` (`--z-tour`), `domains/dashboard.css` (tour),
`domains/onboarding.css` (`--color-onboarding-edge`, a new token; no existing value changed).
**Mobile**: added `hooks/useDocumentSurface.ts` (rewritten), `styles/surfaces.css`, `features/profile/components/MyCoachSheet/`,
`features/profile/hooks/useEndMyCoaching.ts`; deleted `features/bodyTracking/components/StartingPhotoCard/`; modified
the files listed in the commits below.
**Dashboard**: added `features/tour/` (copy, `data/tourSteps.ts`, `data/tourLayout.ts`, hooks `useTour.tsx`,
`useSpotlight.ts`, `useTourKeyboard.ts`, `TourOverlay`, `TourReplayCard`), `services/coachProfile/coachTourService.ts`;
`data-tour` marks on Sidebar items, TopLine "new plan", NotificationBell, the invite button, ActivityFeed (WidgetCard `tourId`).

## Dependencies
None added or removed. (The browser checks used a Playwright copy already in the npx cache; nothing installed.)

## How to test
- `npm test` · `npm run lint` · `npm run build`
- Trainee: Profile → ⚙ Settings → "המאמנת שלי" → "סיום הליווי" → confirm → Home shows the self-guided card + the toast.
  Coach (mobile Inbox / dashboard bell / Overview activity): "<name> סיימה את הליווי" → opens her archive.
- Onboarding: reach "תמונת התחלה" → two tiles (camera / gallery).
- Dashboard: a coach whose `tourCompletedAt` is null sees the tour on her first visit. Settings → "להתחיל סיור" replays it.
  Try Esc, ←/→, Tab, a window under 860 px (centered cards), and macOS "Reduce motion".
- iPhone: the list above.

## Known issues / TODOs
- **I stopped your `npm run dev` during this task.** To restart my own test server I ran `pkill -f "tsx src/server.ts"`.
  That pattern also matched your server's nodemon command, so `concurrently -k` stopped your app on 5173 too. Nothing in
  your database or code was affected. Run `npm run dev` again. After that I stopped my processes by exact process ID only.
- The coach card in the "my coach" sheet shows "בונה לך תוכנית" when the coaching is still `waiting`. That is
  existing CoachCard behavior.
- The tour's "messages" step points at the Overview activity card (the dashboard has no messages screen). If the card
  isn't on screen, it points at the bell.
- `theme-color` is followed by Android Chrome and older iOS. Newer iOS Safari reads the page's own top and bottom
  colors, which is what the html color + full-bleed screens give it. Only a real iPhone confirms the toolbar area (list above).
- The onboarding edge token is an average of the gradient's bottom corners (the video steps have their own veil).

## Suggested commits
1. `feat(server): a trainee can end her own coaching; her coach is notified`
2. `feat(shared): coach notification for a trainee who ended the coaching, opening her archive in both apps`
3. `feat(mobile): "my coach" in Settings with ending the coaching`
4. `feat(mobile): camera or gallery for the onboarding starting photo`
5. `fix(mobile): by-muscle free workout copy matches the 5-exercise limit`
6. `feat(mobile): browser edge colors on every screen (iOS full-bleed)`
7. `feat: first-visit coach tour in the dashboard, replay from Settings`
8. `docs: report for finishing the partial items`

```sh
git add -A -- apps/server/src/app.ts apps/server/src/events/appEvents.ts apps/server/src/features/coachings/coaching.service.ts apps/server/src/features/coachings/coaching.routes.ts apps/server/src/features/coach/coachArchive.service.ts apps/server/src/features/coach/__tests__/coachArchive.test.ts apps/server/src/features/notifications apps/server/src/i18n/locales/he.ts apps/server/src/i18n/locales/en.ts packages/types/src/index.ts packages/api-client/src/traineeApi.ts
git commit -m "feat(server): a trainee can end her own coaching; her coach is notified"
git add -A -- packages/shared/src/coachNotifications.ts packages/shared/src/copy/he.ts packages/shared/src/copy/en.ts apps/dashboard/src/features/notifications/data/notificationItems.ts apps/mobile/src/features/coach/pages/InboxPage/InboxPage.tsx
git commit -m "feat(shared): coach notification for a trainee who ended the coaching, opening her archive in both apps"
git add -A -- apps/mobile/src/features/profile/pages/SettingsPage apps/mobile/src/features/profile/components/MyCoachSheet apps/mobile/src/features/profile/hooks/useEndMyCoaching.ts apps/mobile/src/features/profile/copy/he.ts apps/mobile/src/features/profile/copy/en.ts apps/mobile/src/services/coachings/coachingsService.ts apps/mobile/src/features/home/components/HomeScreen/HomeScreen.tsx apps/mobile/src/features/home/copy/he.ts apps/mobile/src/features/home/copy/en.ts
git commit -m "feat(mobile): \"my coach\" in Settings with ending the coaching"
git add -A -- apps/mobile/src/features/onboarding/steps/StartingPhotoStep apps/mobile/src/features/onboarding/copy/he.ts apps/mobile/src/features/onboarding/copy/en.ts apps/mobile/src/features/bodyTracking/hooks/useStartingPhotoUpload.ts apps/mobile/src/features/bodyTracking/copy/he.ts apps/mobile/src/features/bodyTracking/copy/en.ts apps/mobile/src/features/bodyTracking/components/StartingPhotoCard
git commit -m "feat(mobile): camera or gallery for the onboarding starting photo"
git add -A -- apps/mobile/src/features/workouts/copy/he.ts apps/mobile/src/features/workouts/copy/en.ts
git commit -m "fix(mobile): by-muscle free workout copy matches the 5-exercise limit"
git add -A -- apps/mobile/src/hooks/useDocumentSurface.ts apps/mobile/src/styles/surfaces.css apps/mobile/src/main.tsx apps/mobile/src/components/layout/AppShell/AppShell.tsx apps/mobile/src/components/common/StageBackground apps/mobile/src/features/auth/hooks/useAuthSurface.ts apps/mobile/src/features/workouts/components/IntervalTimer/IntervalTimer.tsx apps/mobile/src/features/workouts/pages/IntervalTimerPage/IntervalTimerPage.tsx apps/mobile/src/features/workouts/pages/WorkoutSessionPage/WorkoutSessionPage.tsx apps/mobile/src/features/cardio/components/CardioPlayer/CardioPlayer.tsx apps/mobile/src/features/cardio/pages/CardioDetailPage/CardioDetailPage.tsx apps/mobile/src/features/cardio/pages/CardioRunPage/CardioRunPage.tsx apps/mobile/src/features/cardio/pages/OwnCardioBuilderPage/OwnCardioBuilderPage.tsx apps/mobile/src/features/firstRun/components/FirstRunScreen/FirstRunScreen.tsx apps/mobile/src/features/onboarding/pages/OnboardingPage/OnboardingPage.tsx apps/mobile/src/features/home/pages/HomePage/HomePage.tsx apps/mobile/src/features/profile/pages/ProfilePage/ProfilePage.tsx apps/mobile/src/features/messages/components/ThreadScreen/ThreadScreen.tsx apps/mobile/src/features/coach/components/CoachScreen/CoachScreen.tsx apps/mobile/src/features/coach/pages/TodayPage/TodayPage.tsx apps/mobile/src/features/coach/pages/TraineeDetailPage/TraineeDetailPage.tsx apps/mobile/src/features/coach/pages/ArchivedTraineePage/ArchivedTraineePage.tsx apps/mobile/src/features/coach/pages/CoachProfilePage/CoachProfilePage.tsx packages/tokens/domains/onboarding.css
git commit -m "feat(mobile): browser edge colors on every screen (iOS full-bleed)"
git add -A -- apps/server/src/features/coachProfiles apps/server/src/features/coach/coach.routes.ts packages/types/src/accounts.ts packages/api-client/src/accountsApi.ts packages/api-client/src/index.ts packages/tokens/base/elevation.css packages/tokens/domains/dashboard.css apps/dashboard/src/features/tour apps/dashboard/src/services/coachProfile/coachTourService.ts apps/dashboard/src/components/layout/AppShell/AppShell.tsx apps/dashboard/src/components/layout/Sidebar/Sidebar.tsx apps/dashboard/src/components/layout/TopLine/TopLine.tsx apps/dashboard/src/components/common/WidgetCard/WidgetCard.tsx apps/dashboard/src/hooks/useNavigation.ts apps/dashboard/src/features/notifications/components/NotificationBell/NotificationBell.tsx apps/dashboard/src/features/trainees/pages/TraineesPage/TraineesPage.tsx apps/dashboard/src/features/overview/components/ActivityFeed/ActivityFeed.tsx apps/dashboard/src/features/coachSettings/pages/CoachSettingsPage/CoachSettingsPage.tsx
git commit -m "feat: first-visit coach tour in the dashboard, replay from Settings"
git add -A -- docs/phase-reports/finish-partials.md docs/phase-reports/finish-partials
git commit -m "docs: report for finishing the partial items"
```

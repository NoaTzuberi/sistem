# First run · self-guided · coach payment links · meal photo sheet · progress photos

Date: 2026-10-23. Server tests 647/647 (12 new), copy parity 38/38, lint + i18n + contrast audits clean, all apps build.
**Screenshots: not taken.** A run against the dev DB would trigger the start-up migrations, and owner asked to save tokens.
Run `npm run dev:all` on a backed-up dev DB to review.

## Owner decisions (this task)
- 6-character coach code **per coach** (on her permanent coaching link; alphabet without I L O 0 1; regenerate = new code,
  the old one answers "revoked"). 16-character link codes and personal links unchanged. Validated server-side, rate-limited (join limiter).
- Self-guided schemas built now; free-workout proposal approved as written.
- Free / own workouts count for totals, PRs and achievements, **not** the plan-based streak (plan key never matches).
- The Coaching (`waiting`) is created when she **confirms** the coach (same as a /join link at sign-up).

## What changed
**Server**
- `AppState` gains `choose_path` (no coach + no choice yet), loses `no_coach`. `User.selfGuidedAt` (set by
  `POST /api/users/me/self-guided`, or at onboarding completion without a coach). `AuthUser.coachingStatus` (null = self-guided).
  Rules (`users/appState.service.ts`): completed without coach → home; coaching joined before onboarding ended → waiting;
  joined later → home (waiting card).
- Invites: `Invite.shortCode`, `newShortCode()`, `resolveInvite` accepts it (any case). Join preview adds `coachAvatar`
  (signed-in viewers only) and `coachCommunityNames`.
- Payments: `CoachProfile.payment { payboxUrl, bitPhone, note }`; `coachProfiles/coachPayment.validation.ts`
  (https only, no credentials, normalized URL; Israeli mobile → 05XXXXXXXX; note ≤ 140); `GET/PUT /api/coach/profile/payment`.
  `GET /api/coachings` (her own live coachings only) now carries `coachAvatar`, `communityNames`, `payment`.
- Free workouts: `WorkoutLog.source plan|free`, `freeExercises`; plan / workout / coaching ids required only for plan logs.
  `POST /api/workout-logs/free` (scratch / repeat / muscle), `POST /:id/exercises`, `GET /free/exercises` (primaries, her
  equipment + level). Coach log list = her coaching's logs + the trainee's free logs. `workout_completed` goes to every live coach.
- Own cardio: `OwnCardioWorkout` model; `CardioLog.ownWorkoutId` (plan fields optional; unique index now partial on plan logs,
  swapped by `CardioLog.syncIndexes` at start). `/api/cardio/own` CRUD (delete = archive), logs via `POST /cardio/logs { ownWorkoutId }`.
  Coach cardio list includes her own runs (never the workout definitions).
- Own nutrition target: `features/ownNutrition` (`OwnNutritionTarget`), `PUT /api/meal-logs/target`. `MealLog.source plan|own`
  (coach/plan fields optional for own). GET /meal-logs adds `ownTarget`, `hasCoachPlan`; days add `source`.
  Default meals (her meals-per-day answer, else 4) when a plan has no meals / for her own target.
- Meal photos: several per meal (photo `_id`, cap 15/day). `POST /:date/photos/:mealId` adds, `DELETE /:date/photos/:photoId`
  removes one (legacy photos without id: by meal id).

**Mobile**
- `features/firstRun`: ChoosePathPage `/start`, CoachCodePage `/start/code` + `/profile/coach-code` (6 LTR boxes, paste code
  or link, a long link code skips the boxes, shake + Cherry ring + role=alert), CoachConfirmPage. JoinBanner on Register and
  in the welcome card; intro line per path (`WelcomeStep`). Register lands on the server's state. NoCoachPage + CoachCodeForm removed.
- Self-guided: Home stage line + ONE "אימון חופשי" action (waiting coach: "<coach> בונה לך תוכנית…"), dismissible "יש לך מאמנת?"
  card (localStorage per user), join toast. Workouts: free workout on for everyone (flag removed), SgEmptyState, "הריצות שלי" +
  "בניית אימון ריצה" (`OwnCardioBuilderPage`, `/workouts/own-cardio/*`), next week hidden when self-guided; session "הוספת תרגיל"
  sheet for free workouts. Nutrition: "היעד שלי" sheet (steppers ½, free vegetables) + tracking against it.
- Profile: `JoinCoachRow` when self-guided; CoachCard shows photo, waiting status, `CoachPayments` (PayBox pill opens externally,
  Bit number LTR + copy + toast, note, "התשלום מתבצע ישירות מול המאמנת").
- Meal photo sheet rewritten (`MealPhotoSheet`, `MealPhotoTodayGrid`, `useMealPhotos`, `data/mealPick.ts`); `MealPhotoField` removed.
- Progress photos page rewritten (`PpStartingCard`, `PpTimeline`, `PpAddSheet` with pose chips, compare = profile frame,
  `useProgressPhotosScreen`). Shared: `GalleryViewer` (swipe, arrows, Esc, focus return), `PhotoSourceTiles`, `SgEmptyState`.
- Tokens: section 15 in `packages/tokens/tokens.css` (`--*-fr-*`).

**Dashboard**: Settings page `/settings` (nav "חשבון") with the Payments card + live preview; short code on the invite sheet;
"אימון חופשי" tag on free logs; trainee day details show several photos per meal.

## Data rules chosen
- Self-guided = no live coaching. Her free logs, own-cardio runs and own-target meal logs are trainee-owned (no coachingId):
  every live coach sees them as history. Own workout **definitions** (cardio) stay hers.
- Payment links: only in `/coachings` (her own live coachings) — never in the public join preview or to unrelated trainees.
- Joining later never locks her out of Home.

## Missing data / not done
- Coach discipline / city: not stored → meta line hidden on the confirm card.
- QR scanning: hidden (no simple web-view camera scanning without a new library) — native later.
- Bit: no official deep link → copy only.
- No default food list (food lists are per coach) → own target is portions only, no "what can I have?".
- Payment status tracking: future. "Sistem programs" (admin templates): future, note only.
- `ProgressPhotosDayPage` / `PhotoComparePage` routes kept but no longer linked from the new screen.
- Free workout "by muscle" picks up to 5 (copy still says 4–6 — owner wording).
- Coach "last activity" / stats still count plan logs only.

## PLACEHOLDER copy
All new strings are drafts in the copy files, marked PLACEHOLDER/DRAFT where they are not the task's wording:
`features/firstRun/copy`, `home/copy` (selfGuided, joinCoach), `workouts/copy` (selfGuided, free.*), `cardio/copy` (builder, own,
ownEdit; `saveNoCoach` → "שמירה"), `nutrition/copy` (ownTarget, mp), `profile/copy` (coachWaiting, joinCoach, payment, pp),
dashboard `coachSettings/copy`, `invites` shortCode, shared `coach.freeWorkout`, server locales (payment_*, free_workout_*,
own_cardio_title_invalid, own_target_*, meal_log_photos_full, meal_photo_not_found).

| key | he | en |
|---|---|---|
| choice.soloFailed | לא הצלחנו לשמור את הבחירה. אפשר לנסות שוב. | We couldn't save your choice. Try again. |
| code.pasteHint / pasteEmpty | הקישור שהמאמנת שלחה לך / לא מצאנו קוד במה שהועתק. אפשר להקליד אותו כאן. | The link your coach sent you / We found no code… |
| code.checking / failed / notTrainee | בודקת… / לא הצלחנו לבדוק את הקוד. בדקי את החיבור ונסי שוב. / הקוד מיועד למתאמנות… | Checking… / Couldn't check the code… |
| code.noCodeNote | אפשר להצטרף למאמנת מאוחר יותר, מהפרופיל. | You can join a coach later, from your profile. |
| confirm.access | {coach} תראה את התשובות שלך בשאלון, את המדידות, את האימונים שתתעדי ואת התמונות שתעלי. אף אחד אחר לא. | {coach} will see your questionnaire answers, … Nobody else will. |
| confirm.joining / failed / otherCoach | מצטרפת… / לא הצלחנו לצרף אותך… / את כבר בליווי של {coach}… | Joining… / … |
| intro.coachNoName | המאמנת שלך תשתמש בתשובות כדי לבנות לך תוכנית. | Your coach will use your answers… |
| home.selfGuided.line / waitingLine | היום הוא יום טוב להתאמן. / {coach} בונה לך תוכנית. בינתיים אפשר להתאמן לבד. | Today is a good day to train. / {coach} is building your plan… |
| home.selfGuided.joined | הצטרפת לליווי של {coach} | You joined {coach}'s coaching |
| workouts.selfGuided.title / text | האימונים שלך, בקצב שלך / בונים אימון מהתרגילים שמתאימים לציוד שלך… | Your workouts, your pace / … |
| workouts.selfGuided.cardioEmptyTitle / Text | ריצה משלך / בונים ריצה מקטעים וסטים חוזרים… | A run of your own / … |
| free.introSelf / emptyTitle / emptyText | אימון שאת בונה לבד. הוא יישמר בהיסטוריה שלך. / אימון ריק / מוסיפים את התרגיל הראשון… | … |
| cardio.builder.* | אימון ריצה חדש · שם האימון · קטעים · משך · עצימות · סבבים · הוספת קטע · הוספת סט חוזר · מחיקת האימון… | New run · Workout name · Blocks · … |
| nutrition.ownTarget.* | היעד שלי · כמה מנות מכל קבוצה ביום… · יעד מנות משלך · ירקות חופשי · שמירת היעד | My target · … |
| nutrition.mp.photosOfMeal / delete / deleted | {count} תמונות / מחיקה / התמונה נמחקה | … |
| profile.coachWaiting | בונה לך תוכנית | Building your plan |
| profile.joinCoach.sub | יש לך קוד או קישור? מצטרפות כאן | Have a code or a link? Join here |
| profile.payment.copyFailed | לא הצלחנו להעתיק. אפשר לסמן את המספר ולהעתיק ידנית. | Couldn't copy… |
| profile.pp.* | צולמה ב-{date} · החלפה · לפני ואחרי · ציר הזמן · תמונה חדשה · השוואה להתחלה… | Taken on {date} · Replace · … |
| dashboard coachSettings.* | הגדרות · תשלומים · קישור ל-PayBox · מספר לביט · הערה לתשלום · כך זה ייראה אצל המתאמנת… | Settings · Payments · … |
| invites.shortCode | או הקוד: | Or the code: |
| server payment_url_invalid / payment_phone_invalid / payment_note_too_long | הקישור ל-PayBox צריך להתחיל ב-https://… / המספר לא נראה כמו נייד ישראלי… / ההערה ארוכה מדי… | … |
| server free_workout_* / own_target_* / meal_log_photos_full | אימון חופשי · צריך לבחור לפחות שריר אחד · … | Free workout · Pick at least one muscle · … |

(Full he/en text: the copy files above; the parity test keeps them in sync.)

## Test checklist
- Fresh sign-up → "עם מאמנת" → code typed / pasted link / invalid (shake, alert) → confirm → questionnaire (intro names her) → waiting → coach publishes → Home.
- "אין לי עדיין קוד" and "לבד" → questionnaire (self intro) → Home with "אימון חופשי"; Workouts empty state; "בניית אימון ריצה"; Nutrition "הגדרת יעד מנות".
- Own portions: set target, mark portions, photo on a default meal. Own cardio: build, run, save, edit, delete.
- Join later: Profile "הצטרפות למאמנת" and Home card (dismiss persists) → Home shows the waiting line, tools still work.
- /join link: banner on sign-up, no choice screen.
- Resume: close after "לבד" → reopen in the questionnaire.
- Payments: coach fills /settings (bad URL / phone refused) → her trainee sees pill / copy toast / note; another coach's trainee does not.
- Meal photo: preselected meal, upload, badge counts, today grid, viewer delete; self-guided lock line.
- Progress photos: starting card, empty state, add with pose, timeline by month, compare, viewer swipe / delete / "השוואה להתחלה".
- EN / LTR mirror; reduced motion (no shake, no slides).

## Suggested commits (run in order; never includes CLAUDE.md)
Note: the uncommitted accounts & relationships work shares files (types, auth, invites, AppRouter…) — commit it first.

```bash
git add -A -- apps/server/src/features/users apps/server/src/features/invites apps/server/src/features/coachings/coaching.service.ts apps/server/src/features/communities/community.service.ts apps/server/src/features/onboarding apps/server/src/features/auth packages/types/src/index.ts packages/types/src/accounts.ts packages/api-client/src/accountsApi.ts packages/api-client/src/index.ts apps/mobile/src/features/firstRun apps/mobile/src/features/join apps/mobile/src/features/onboarding apps/mobile/src/features/auth apps/mobile/src/app apps/mobile/src/services/auth apps/mobile/src/services/users packages/tokens/tokens.css apps/server/src/features/coachings/__tests__
git commit -m "feat: first-run choice, 6-character coach code and coach confirm"

git add -A -- apps/server/src/features/workoutLogs apps/server/src/features/cardio apps/server/src/features/ownNutrition apps/server/src/features/mealLogs apps/server/src/features/plans apps/server/src/features/notifications apps/server/src/features/coach apps/server/src/i18n apps/server/src/features/plans/planWorkout.schema.ts packages/api-client/src/traineeApi.ts packages/api-client/src/cardioApi.ts apps/mobile/src/features/workouts apps/mobile/src/features/cardio apps/mobile/src/features/home apps/mobile/src/features/nutrition/components/OwnTargetSheet apps/mobile/src/features/nutrition/hooks/useOwnTargetForm.ts apps/mobile/src/components/common/SgEmptyState apps/mobile/src/services/workoutLogs apps/mobile/src/services/cardio apps/mobile/.env.example
git commit -m "feat: self-guided mode — free workouts, own cardio, own portion target"

git add -A -- apps/mobile/src/features/profile/components/JoinCoachRow apps/mobile/src/hooks/useActiveCoachings.ts
git commit -m "feat(mobile): join a coach later from Profile and Home"

git add -A -- apps/server/src/features/coachProfiles apps/mobile/src/features/profile/components/CoachCard apps/mobile/src/features/profile/components/CoachPayments apps/mobile/src/features/profile/data/paymentDisplay.ts apps/mobile/src/features/profile/hooks/useCopyText.ts apps/dashboard/src
git commit -m "feat: coach payment links (dashboard settings, trainee coach card)"

git add -A -- apps/mobile/src/features/nutrition apps/mobile/src/features/coach apps/mobile/src/components/common/GalleryViewer apps/mobile/src/components/common/PhotoSourceTiles apps/mobile/src/hooks/useGallerySwipe.ts apps/mobile/src/services/nutrition
git commit -m "feat(mobile): one meal photo sheet, several photos per meal"

git add -A -- apps/mobile/src/features/profile packages/shared/src/copy
git commit -m "feat(mobile): progress photos screen redesign"

git add -A -- docs/phase-reports/first-run-self-guided-payments-photos.md
git commit -m "docs: first run, self-guided, payments and photos report"
```

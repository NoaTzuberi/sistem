# Accounts & relationships — admin → coach → trainee, invites, communities

Date: 2026-10-22. Status: **built (phases 1–5).** Server tests 635/635, copy parity 36/36, lint + i18n + contrast audits clean,
all three apps build. Not run against your dev database yet (see "Before you start the server").

## 1. Audit findings

### Users, roles, auth
- `User.role` is ONE string (`trainee | coach`, default trainee) — `users/user.model.ts`. No admin role.
- JWT (`sub` only, 7 days), bcrypt. `requireRole(role)` reads the role from the DB on every request (good: a change
  applies without a new token), but compares one value (`user.role !== role`).
- `role` also drives: `appState` (`coach` → coach mode), `AuthUser.role` (both clients route on it), `seedDev`,
  `promoteCoach`, backfill / nutrition scripts.
- Sign-up `POST /api/auth/register` never accepts a role from the body (safe) and **auto-assigns the default coach**
  (`coachAssignment.service.ts`: `DEFAULT_COACH_EMAIL`, else the only coach, else null).
- Password reset (forgot / reset) exists on the server: random 32-byte token, sha256 stored, 1 h, cleared on use. It is
  backlog in the app (no screen, no deep link). Reusable for "set password" links.
- **No rate limiting anywhere** (login, register, forgot-password included). No rate-limit dependency installed.

### Coach creation
- No public coach sign-up (PRD §3). Coaches exist only through `promote:coach` (DEV script, refuses production) and
  `seed:dev`. **There is no way to create a coach in production today.**
- The dashboard has login only; its role gate is client-side, every `/api/coach` route checks `role=coach` itself.

### Trainee ↔ coach link
- `User.coachId` (one coach, nullable). The dashboard list = `User.find({ role: 'trainee', coachId })`
  (`coach.service.listCoachTrainees`, also `coachStats.service`).
- `loadCoachTrainee` middleware: `User.exists({ _id, role: 'trainee', coachId: req.userId })` → 404 otherwise (no id
  probing). Used on every `/api/coach/trainees/:traineeId/*` route. `exerciseFamily.controller.traineeIsHers` does the same.

### onboarding → waiting → active
- `onboardingStatus` on the User; answers in `OnboardingResponse`. Completing emits `trainee.onboarded { coachId }`
  (→ coach notification + AI drafts).
- "Waiting" is **not stored**: `appState.service` = onboarding incomplete → `onboarding`; no published plan →
  `waiting`; else `home`. The coach list status (new / waiting / active / inactive) is derived from plans
  (`resolveTraineeStatus`). Countdown: `GET /api/onboarding/waiting` from `onboardingCompletedAt`.

### Where coach-owned data lives
| Data | Collection | Owner fields |
|---|---|---|
| Training plans + workouts (strength AND cardio — cardio is `PlanWorkout.kind='cardio'`) + plan `notes` (coach note) | `Plan` | traineeId, coachId; **unique (traineeId, weekStartDate)** |
| Workout logs | `WorkoutLog` | traineeId, planId (no coachId); one open log per trainee (partial unique) |
| Cardio logs | `CardioLog` | traineeId, planId, workoutId (no coachId) |
| Personal records | `PersonalRecord` | userId, logId |
| Nutrition plan (working copy) + versions (intro message = coach note) | `NutritionPlan`, `NutritionPlanVersion` | traineeId (**unique on NutritionPlan**), coachId |
| Meal logs (portion tracking vs. the nutrition plan) | `MealLog` | traineeId, coachId; unique (traineeId, date) |
| AI drafts | `AiRecommendation` | traineeId, coachId; one active run per (traineeId, type) |
| Coach libraries | `FoodItem`, `Template`, `NutritionSettings`, `TrainingSettings` | coachId (already per coach) |
- "Coach private notes per trainee" do not exist yet (backlog). Coach notes today = `Plan.notes` and the nutrition intro.
- Trainee-owned: `OnboardingResponse`, `BodyMetric` (+ progress / starting photos), avatar, `Achievement`, Daily Pump
  (on the WorkoutLog), `WaterLog`.

### Security audit — every trainee-data route
| Route group | Guard | Scoping |
|---|---|---|
| `/api/coach/trainees` list, `/stats` | role coach | `coachId = me` ✔ |
| `/api/coach/trainees/:id/*` (detail, plans + builder, logs, body, achievements, exercise-history, AI, nutrition, meal-logs, cardio-logs) | role coach + `loadCoachTrainee` | trainee checked by `User.coachId`; **the data itself is queried by traineeId only** (e.g. `Plan.find({ traineeId })`, `CardioLog.find({ traineeId })`) |
| `/api/coach/exercise-families*` (GET/PATCH/merge/split/primary) | role coach | **global library, not per coach** |
| `/api/plans`, `/api/workout-logs` | requireAuth only | always `traineeId = me` ✔ (a coach just gets empty results) |
| `/api/onboarding`, `/body-metrics`, `/achievements`, `/nutrition-plan`, `/meal-logs`, `/cardio`, `/tab-updates` | role trainee | `me` ✔ |
| `/api/users/*`, `/api/notifications` | requireAuth | `me` ✔ |
| Photos | privatePhotos | link made per request after the access check ✔ |

### Risks found
1. **Coach change leaks history (High once coaches multiply).** Data is scoped by trainee, not by relationship: if a
   trainee moves from coach A to B (`User.coachId` changed), B sees all of A's plans, logs, nutrition, notes, AI drafts.
   → fixed by `coachingId`.
2. **Multi-coach blocked by indexes.** `Plan` unique (traineeId, week), `NutritionPlan` unique traineeId, AI one active
   run per (trainee, type) and MealLog/NutritionPlan "the plan" lookups assume one coach. → move to `coachingId`.
3. **Shared exercise library is editable by any coach.** Family PATCH / merge / split / primary changes it for all
   coaches (one coach today). Not in this task's scope → note; needs a decision before a 2nd coach (owner edits only,
   or per-coach overrides like `TrainingSettings`).
4. **Public sign-up auto-assigns "the" coach** (`resolveDefaultCoachId`) — with several coaches a stranger lands on a
   coach's list and she can read her answers. → sign-up without an invite must not create a coaching.
5. **No rate limiting** on login / register / reset (brute force, enumeration-by-timing is OK — bcrypt either way).
6. **No production coach creation** — today the only paths are DEV scripts.
7. Notifications / thanks / cardio "coach name" read `User.coachId` → must follow the coaching instead.
8. Low: the dashboard role gate is client-only (server checks are in place, OK).

## Owner decisions (2026-10-22)
- Sign-up without an invite is allowed: no coach, nobody sees her. The DEFAULT_COACH_EMAIL auto-assign is removed.
  After onboarding she lands on a "no coach yet" screen with a coach-code field (code or pasted /join link) instead of the
  waiting screen; a valid code runs the normal join → Coaching `waiting` → the regular waiting screen.
- New dependencies approved: `qrcode` (dashboard) and `express-rate-limit` (server).
- Set-password link: shown on the admin page to copy, and emailed through Resend when configured.
- New copy: drafted he + en, marked PLACEHOLDER, listed in the table at the end. Hebrew feminine to trainee and coach,
  short, no jargon; errors say what happened + what to do; buttons are verbs.

## Before you start the server (important)

- The first server start runs a **one-off migration on your database** (`coachings/accountsMigration.ts`): `role` → `roles[]`,
  `User.coachId` → a Coaching + membership (then the field is removed), `coachingId` written on every plan / log / nutrition / AI
  record, and the old per-trainee unique indexes dropped. It is idempotent, but not reversible by itself — **back up the dev
  database first** (`mongodump`).
- Set `ADMIN_EMAIL` in `apps/server/.env` to your account to get the admin role (added at every start, idempotent). Add
  `DASHBOARD_URL` (set-password links) and leave `MULTI_COACH_ENABLED` empty. `DEFAULT_COACH_EMAIL` is no longer read — remove it.
- After that, `npm run seed:dev` and `npm run promote:coach` work as before (promote no longer assigns trainees).

## 2. Data model

```
User ──roles[]: admin | coach | trainee   (passwordHash empty until an admin-created coach sets it)
 │
 ├─(coach)── CoachProfile { userId, displayName, slug, status active|suspended, createdBy }
 │              └── Community { coachId, name, slug, visibility invite|public, isPrimary }  ← one primary per coach
 │                     └── Membership { communityId, userId, role member|owner, status active|left }   (many per trainee)
 │              └── Invite { code, coachId, type coaching|community, communityId?, permanent, targetEmail?,
 │                           maxUses?, uses, expiresAt?, revokedAt? }
 │
 └─(trainee)── Coaching { traineeId, coachId, status waiting|active|ended, live, discipline?, startedAt, endedAt }
                  │   unique (traineeId, coachId) where live — per PAIR only; "one coach per trainee" = MULTI_COACH_ENABLED, in code
                  └── coach-owned, carry coachingId:
                        Plan (workouts incl. cardio, notes)   unique (coachingId, weekStartDate)
                        WorkoutLog / CardioLog                coachingId copied from the plan
                        NutritionPlan                         unique coachingId (one working copy per coaching)
                        NutritionPlanVersion, MealLog
                        AiRecommendation                      one active run per (coachingId, type)
   trainee-owned (no coachingId): OnboardingResponse, BodyMetric + progress photos, avatar, Achievement,
   PersonalRecord (via its log), Daily Pump (on the log), WaterLog
```
- `coachingRef.ts` fills `coachingId` on create from (trainee, coach) or from the plan, so no write path can leave it empty;
  services set it explicitly. Ending a coaching (`endCoaching`) keeps every record.
- Waiting → active: the first publish of a plan in that coaching (`markCoachingActive`). The dashboard's "inactive" stays a label
  derived from plans on an active coaching. The 48h window starts at the later of onboarding completion and joining the coach.

## 3. Migrations (server start, idempotent)
1. `role` → `roles[]`; `ADMIN_EMAIL` → `$addToSet roles 'admin'`.
2. Every coach → CoachProfile + primary Community (owner membership).
3. Every `User.coachId` → Coaching (`active` if that coach published her a plan, else `waiting`; `startedAt` = her sign-up) +
   membership in the coach's primary community; `coachId` unset.
4. `coachingId` backfill: plans, nutrition plans + versions, meal logs, AI drafts by (traineeId, coachId); workout + cardio logs by
   their plan. A record whose pair has no coaching (she moved to another coach earlier) gets an **ended** coaching — history kept.
5. Drops `traineeId_1_weekStartDate_1` (plans), `traineeId_1` (nutrition plans), `one_active_per_trainee_type` (AI),
   `coachId_1_role_1_createdAt_-1` (users); builds the new indexes.

## 4. Endpoints

| Method + path | Who | What |
|---|---|---|
| `GET /api/admin/coaches` | admin | coaches + status, password set?, live trainee count (no trainee data) |
| `POST /api/admin/coaches` `{ name, email }` | admin | user (no password) + profile + primary community + one-time link (48 h; emailed when Resend is set) |
| `POST /api/admin/coaches/:id/password-link` | admin | new link (old one stops working) |
| `PATCH /api/admin/coaches/:id` `{ status }` | admin | suspend / reactivate |
| `POST /api/auth/set-password` `{ token, password }` | public, rate-limited | sets the password, burns the token, signs in |
| `POST /api/auth/register` `{ …, inviteCode? }` | public, rate-limited | always a trainee; a code is redeemed with the sign-up; an unusable code → `inviteError`, account still made |
| `GET /api/coach/invites` | coach | permanent coaching link (made on first use) + open personal links |
| `POST /api/coach/invites` `{ targetEmail? }` | coach | personal link: single use, 14 days |
| `POST /api/coach/invites/regenerate` `{ type? }` | coach | new permanent link; old one → revoked |
| `DELETE /api/coach/invites/:id` | coach (own only) | revoke |
| `GET /api/coach/invites/community` | coach | community-only link (no UI yet) |
| `GET /api/join/:code` | public (token optional), rate-limited | coach name, type, `action` for this viewer; 404 invalid / 410 expired · revoked · used up |
| `POST /api/join/:code` | signed-in trainee, rate-limited | coaching (+ primary community) or community only; 409 `invite_other_coach` (+ `otherCoachName`) when flag off; 403 other email / not a trainee |
| `GET /api/coachings` | trainee | her live coachings |
| `GET /api/communities/mine` | signed in | her communities (names only) |
| `GET /api/plans`, `/plans/week`, `/workout-logs` `?coachingId=` | trainee | optional; must be hers (404) |
| login / register / forgot / reset / set-password, `/api/join/*` | — | per-IP limits: 20 / 15 min (auth), 60 / 15 min (join) |

## 5. MULTI_COACH_ENABLED
- **Off (default):** joining a coach while another coaching is live → preview `other_coach` ("את כבר בליווי של X") and accept →
  409; nothing switches. A community invite still works (membership only).
- **On:** an additional Coaching is created; each coach sees only her own plans / logs / nutrition / AI drafts; both see the
  trainee-owned data. The same week can hold one plan per coaching.
- Read in `coachings/coaching.config.ts` only; no index depends on it, so turning it on needs no migration.

## 6. Authorization (server-side, every route)
- Roles come from the database on every request (`requireRole` checks `roles[]`); a coach also needs an **active** profile
  (suspend → 403 `coach_suspended` on every coach route; her links answer 410).
- `loadCoachTrainee` = a **live** Coaching (this coach ↔ that trainee) → `req.coachingId`. Coach-owned reads / writes filter by it
  (plans, plan weeks, logs, cardio logs, meal logs, nutrition, AI drafts, exercise history + its PRs, stats, trainee list).
  Trainee-owned reads (questionnaire, body metrics, photos, achievements) need any live coaching. Ended coaching → 404.
- Communities never grant access: a community-only coach gets the same 404 as a stranger. Exposed: names only (display name /
  photo / public achievements are for the later community UI).
- Admin: coach accounts only; no route reads trainee private data. Support access would need a separate, audited decision.
- Future (not built): a per-coach sharing toggle for trainee-owned data (today every live coach sees it).
- Tests (`coachings/__tests__/accounts.test.ts`, 14): admin create → set password → login, single-use link, non-admin 403, public
  sign-up never coach / never linked, suspend + reactivate, new trainee end-to-end to active / home, existing trainee joins (coach
  notified), flag off blocked + community-only allowed + community gives no access, flag on second coaching, invalid / expired /
  revoked / used / other-email codes, revoke own links only, unusable code at sign-up, rate limit 429, cross-coach isolation of plans
  and logs + shared trainee data + `?coachingId` checks, ended coaching closes access, migration + idempotence.

## 7. Apps (single coach for now) — where the UI would change for multi-coach
- Hooks are coaching-aware: `useActiveCoachings()` (list), `useWeekPlan(coachingId?)`, `useHomeData(coachingId?)`,
  `useWorkoutHistory(…, coachingId?)`; api-client `getWeek / listPlans / listWorkoutLogs(coachingId?)`. Without an id the server
  uses her current (newest live) coaching.
- To change later: Home (one week strip / next workout / coach card per coaching, or grouped by discipline), Workouts (sections per
  coach), Nutrition (whose plan — today the current coaching's), coach-note "thanks" (current coaching), Profile coach line + coach
  card (one coach), tab-update dots (all plans), meal logs (one per day per trainee — a second nutrition coach needs a decision).
- Dashboard lists trainees from the coach's live coachings; filters unchanged (new / waiting / active / inactive). Ended coachings
  are not listed (no "end coaching" action exists yet).

## 8. Known issues / TODOs
- **Commit order:** the earlier, uncommitted profile-photo / questionnaire work shares files with this change (`user.model.ts`,
  `auth.service.ts`, `coach.service.ts`, `ProfileHero.tsx/.css`, `ProfilePage.tsx`, profile copy, `packages/types/src/index.ts`,
  `authApi.ts`). Commit that work first, or those commits below will include it.
- Exercise library is global: any coach can rename / merge / split families for everyone (audit risk 3) — decide before a 2nd coach.
- No "end coaching" endpoint / UI yet (model + service exist). Coach-mode mobile has no invite UI (dashboard only).
- QR scanning on the "no coach yet" screen: skipped (no reliable web camera scanning without a new library) — Phase 5b native.
- Join links use `CLIENT_URL` (`/join/<code>`, random code; the slug is never used in links). `sistem.app` deep links: Phase 5b.
- Rate limiting is in-memory per IP; behind a proxy set Express `trust proxy`, and use a shared store with several instances.
- The reset-password and set-password links share the token fields (a forgot-password request replaces an unused admin link).
- `nutritionIntroSeenVersion` is per trainee, versions restart per coaching — a new nutrition coach's v1 intro may count as seen.
- Personal-link lifetime (14 days) and set-password link (48 h) are defaults to confirm.
- Server email texts are DRAFTS (table below).

## 9. PLACEHOLDER copy (drafts — please review)

| key | he | en |
|---|---|---|
| admin.title | מאמנות | Coaches |
| admin.subtitle | ניהול חשבונות המאמנות במערכת | Manage the coach accounts on Sistem |
| admin.addCoach | + מאמנת *(owner)* | + Coach |
| admin.columns | שם · אימייל · סטטוס · סיסמה · מתאמנות · פעולות | Name · Email · Status · Password · Trainees · Actions |
| admin.statusActive / statusSuspended | פעילה / מושהית | Active / Paused |
| admin.passwordSet / passwordPending | נקבעה / עוד לא נקבעה | Set / Not set yet |
| admin.suspend / reactivate / newLink | השהיה / הפעלה מחדש / קישור סיסמה חדש | Pause / Reactivate / New password link |
| admin.suspendTitle | להשהות את {name}? | Pause {name}? |
| admin.suspendText | היא לא תוכל להשתמש בלוח הבקרה, והקישורים שלה יפסיקו לעבוד. המתאמנות והנתונים שלה נשמרים. | She won't be able to use the dashboard, and her links stop working. Her trainees and their data are kept. |
| admin.createTitle / createSubtitle | מאמנת חדשה / ייפתח לה חשבון, ותקבלי קישור חד-פעמי שבו היא בוחרת סיסמה. | New coach / Her account is opened and you get a one-time link where she chooses a password. |
| admin.create / creating | יצירה / יוצרת… | Create / Creating… |
| admin.linkTitle / linkHint | קישור ליצירת סיסמה / הקישור עובד פעם אחת, עד {date}. | Set-password link / The link works once, until {date}. |
| admin.emailSent / emailNotSent | הקישור נשלח גם לאימייל שלה. / האימייל לא נשלח. אפשר להעתיק את הקישור ולשלוח לה אותו. | The link was also emailed to her. / The email wasn't sent. Copy the link and send it to her. |
| admin.copyLink / copied / done | העתקה / הקישור הועתק / סיום | Copy / Link copied / Done |
| admin.empty / loadError / actionError / createError | עדיין אין מאמנות. אפשר להוסיף את הראשונה. / לא הצלחנו לטעון את המאמנות. / הפעולה לא הצליחה. אפשר לנסות שוב. / לא הצלחנו ליצור את החשבון. אפשר לנסות שוב. | No coaches yet. Add the first one. / Couldn't load the coaches. / That didn't work. Try again. / Couldn't create the account. Try again. |
| admin.backToDashboard / navGroup / adminRole | ללוח הבקרה / ניהול / מנהלת מערכת | To the dashboard / Admin / Sistem admin |
| invites.button | + הזמנת מתאמנת *(owner)* | + Invite a trainee |
| invites.title / subtitle | הזמנת מתאמנת / מתאמנת שנכנסת בקישור נרשמת, ממלאת את השאלון ומופיעה אצלך ברשימת "מחכות לתוכנית". | Invite a trainee / A trainee who opens the link signs up, fills in the questionnaire and shows up in your "Waiting for a plan" list. |
| invites.permanentTitle / permanentHint | הקישור הקבוע שלך / אפשר לשתף אותו עם כל מתאמנת, או להציג את הקוד לסריקה. | Your permanent link / Share it with any trainee, or show the code to scan. |
| invites.uses / noUses | מתאמנת אחת / שתי מתאמנות / {count} מתאמנות הצטרפו דרכו · עוד אף אחת לא הצטרפה דרכו | 1 trainee / {count} trainees joined through it · Nobody joined through it yet |
| invites.copy / share / copied | העתקה / שיתוף / הקישור הועתק | Copy / Share / Link copied |
| invites.regenerate / regenerateTitle / regenerateText | יצירת קישור חדש / ליצור קישור חדש? / הקישור הנוכחי יפסיק לעבוד. מי שכבר הצטרפה נשארת איתך. | Make a new link / Make a new link? / The current link stops working. Trainees who already joined stay with you. |
| invites.qrAlt | קוד QR של קישור ההצטרפות | QR code of the join link |
| invites.personalTitle / personalHint | קישור אישי / לשימוש אחד, בתוקף ל-14 ימים. אפשר לקשר אותו לאימייל של המתאמנת. | Personal link / Single use, valid for 14 days. You can tie it to the trainee's email. |
| invites.personalEmail / personalCreate / openLinks | אימייל (לא חובה) / יצירת קישור / קישורים אישיים פתוחים | Email (optional) / Make a link / Open personal links |
| invites.forEmail / anyone / expires | עבור {email} / לכל מתאמנת / בתוקף עד {date} | For {email} / For any trainee / Valid until {date} |
| invites.revoke / revoked / shareText | ביטול הקישור / הקישור בוטל / הצטרפי אליי ל-Sistem | Cancel link / Link cancelled / Join me on Sistem |
| invites.loadError / actionError / done / cancel | לא הצלחנו לטעון את הקישורים. / הפעולה לא הצליחה. אפשר לנסות שוב. / סיום / ביטול | Couldn't load your links. / That didn't work. Try again. / Done / Cancel |
| setPassword.title / subtitle | בחירת סיסמה / עוד רגע והחשבון שלך מוכן. בחרי סיסמה של 8 תווים לפחות. | Choose a password / Your account is almost ready. Choose a password of at least 8 characters. |
| setPassword.password / confirm / submit / saving | סיסמה חדשה / אימות הסיסמה / שמירה וכניסה / שומרת… | New password / Confirm password / Save and sign in / Saving… |
| setPassword.mismatch / tooShort | הסיסמאות לא זהות. אפשר להקליד שוב. / הסיסמה קצרה מדי. צריך לפחות 8 תווים. | The passwords don't match. Type them again. / The password is too short. Use at least 8 characters. |
| setPassword.missingToken / failed / toLogin | הקישור חסר או לא שלם. אפשר לבקש קישור חדש ממנהלת המערכת. / לא הצלחנו לשמור את הסיסמה. אפשר לנסות שוב. / למסך הכניסה | The link is missing or incomplete. Ask the Sistem admin for a new one. / Couldn't save the password. Try again. / To the login screen |
| join.title | הצטרפות | Join |
| join.invitedBy / invitedHint | {coach} מזמינה אותך להתאמן איתה ב-Sistem. / אחרי ההרשמה ממלאים שאלון קצר, והמאמנת בונה לך תוכנית. | {coach} invites you to train with her on Sistem. / After signing up you fill in a short questionnaire, and your coach builds your plan. |
| join.signUp / haveAccount | הרשמה / יש לי כבר חשבון | Sign up / I already have an account |
| join.confirmJoin | להצטרף לליווי של {coach}? *(owner)* | Join {coach}'s coaching? |
| join.confirmJoinText | המאמנת תראה את השאלון שלך ותבנה לך תוכנית אישית. | Your coach will see your questionnaire and build you a personal plan. |
| join.join / joining | הצטרפות / מצטרפת… | Join / Joining… |
| join.alreadyHers | את כבר בליווי של {coach}. | You're already training with {coach}. |
| join.otherCoach | את כבר בליווי של {coach} *(owner)* | You're already training with {coach} |
| join.otherCoachText | כרגע אפשר להיות בליווי של מאמנת אחת, ולכן לא החלפנו מאמנת. אם זו טעות, אפשר לפנות למאמנת שלך. | For now you can train with one coach at a time, so we didn't switch coaches. If this is a mistake, talk to your coach. |
| join.communityTitle / communityText / communityJoined | להצטרף לקהילה {community}? / בקהילה רואים רק את השם ותמונת הפרופיל שלך. התוכנית והנתונים שלך נשארים פרטיים. / הצטרפת לקהילה {community}. | Join the {community} community? / The community sees only your name and profile photo. Your plan and data stay private. / You joined the {community} community. |
| join.notTrainee | הקישור מיועד למתאמנות, והחשבון הזה הוא של מאמנת. | This link is for trainees, and this is a coach's account. |
| join.problems.invalid | הקישור לא תקין או שפג תוקפו *(owner)* | This link isn't valid or has expired |
| join.problems.expired / revoked / used_up | פג התוקף של הקישור / הקישור כבר לא פעיל / כבר השתמשו בקישור הזה | This link has expired / This link is no longer active / This link has already been used |
| join.problemHint / continue / failed / retry | אפשר לבקש מהמאמנת קישור חדש. / המשך / משהו השתבש. אפשר לנסות שוב. / ניסיון נוסף | Ask your coach for a new link. / Continue / Something went wrong. Try again. / Try again |
| join.noCoachTitle / noCoachText | עוד אין לך מאמנת / השאלון שלך נשמר. כדי שמאמנת תבנה לך תוכנית, הזיני את הקוד או הדביקי את הקישור שקיבלת ממנה. | You don't have a coach yet / Your questionnaire is saved. For a coach to build your plan, enter the code or paste the link she gave you. |
| join.codeLabel | יש לי קוד מאמנת *(owner)* | I have a coach code |
| join.codePlaceholder / codeSubmit / codeEmpty | קוד או קישור / המשך / צריך להזין קוד או קישור. | Code or link / Continue / Enter a code or a link. |
| join.adminOnlyTitle / adminOnlyText / logout | חשבון ניהול / את מנהלת את Sistem מלוח הבקרה במחשב. / התנתקות | Admin account / You manage Sistem from the dashboard on a computer. / Log out |
| profile.communities | הקהילות שלי *(design)* | My communities |
| server: too_many_requests | יותר מדי ניסיונות. אפשר לנסות שוב בעוד כמה דקות. | Too many attempts. Try again in a few minutes. |
| server: coach_suspended | החשבון שלך מושהה כרגע. לפרטים אפשר לפנות למנהלת המערכת. | Your coach account is paused. Contact the Sistem admin for details. |
| server: coach_not_found / coach_email_taken / coach_status_invalid | המאמנת לא נמצאה. / כבר קיים חשבון עם האימייל הזה. / הסטטוס לא תקין. | Coach not found. / An account with this email already exists. / Unknown status. |
| server: set_password_token_invalid | הקישור ליצירת סיסמה לא תקין או שפג תוקפו. אפשר לבקש קישור חדש ממנהלת המערכת. | This set-password link isn't valid or has expired. Ask the Sistem admin for a new one. |
| server: invite_invalid / invite_expired / invite_revoked / invite_used_up | הקישור לא תקין או שפג תוקפו. / פג התוקף של הקישור. אפשר לבקש מהמאמנת קישור חדש. / הקישור כבר לא פעיל. אפשר לבקש מהמאמנת קישור חדש. / כבר השתמשו בקישור הזה. אפשר לבקש מהמאמנת קישור חדש. | This link isn't valid or has expired. / … has expired. Ask your coach for a new one. / … is no longer active. Ask … / … has already been used. Ask … |
| server: invite_email_mismatch | הקישור נשלח לכתובת אימייל אחרת. אפשר להתחבר עם החשבון הנכון או לבקש קישור חדש. | This link was sent to a different email. Log in with that account or ask for a new link. |
| server: invite_other_coach | את כבר בליווי של {coach}, וכרגע אפשר להיות בליווי של מאמנת אחת בלבד. | You're already training with {coach}, and for now you can train with one coach at a time. |
| server: invite_not_trainee / invite_code_required / invite_type_invalid | הקישור מיועד למתאמנות. יש להתחבר עם חשבון של מתאמנת. / יש להזין קוד מאמנת. / סוג הקישור לא תקין. | This link is for trainees. Log in with a trainee account. / Enter a coach code. / Unknown link type. |
| server: email_set_password_* | יצירת סיסמה ל-Sistem · ברוכה הבאה ל-Sistem · נפתח לך חשבון מאמנת. לחצי על הכפתור כדי לבחור סיסמה. הקישור תקף ל-{hours} שעות ולשימוש אחד. · יצירת סיסמה | Set your Sistem password · Welcome to Sistem · A coach account was opened for you. Tap the button to choose your password. The link works once and for {hours} hours. · Set password |

## 10. How to test

Commands: `npm test` (server + copy parity) · `npm run lint` · `npm run build` ·
`npm run test -w @sistem/server -- src/features/coachings` (the 14 accounts tests).

Manual checklist (`npm run dev:all`, after the backup + `ADMIN_EMAIL`):
- [ ] **Admin creates a coach → set password → login:** dashboard as the admin → sidebar "ניהול → מאמנות" (or `/admin/coaches`) →
      "+ מאמנת" → copy the link → open it in a private window → choose a password → lands on the coach dashboard.
- [ ] **Suspend a coach:** "השהיה" → confirm → her dashboard shows errors (403), her join link shows "הקישור כבר לא פעיל";
      "הפעלה מחדש" restores both.
- [ ] **Coach link + QR + personal link:** trainees page → "+ הזמנת מתאמנת" → QR renders, copy works, "יצירת קישור חדש" changes
      the link; personal link with an email appears in the list; "ביטול הקישור" removes it.
- [ ] **New trainee:** open the link on the phone signed out → "הרשמה" → onboarding → waiting screen; the coach sees her under
      "מחכות לתוכנית" → coach publishes → the app moves to Home.
- [ ] **Existing trainee:** a trainee who signed up without a link lands on "עוד אין לך מאמנת" → paste the link → confirm → waiting.
- [ ] **Another coach, flag off:** a linked trainee opens a second coach's link → "את כבר בליווי של X", nothing changes.
      **Flag on** (`MULTI_COACH_ENABLED=true`, restart) → the join creates a second coaching; each coach sees only her plans.
- [ ] **Expired / revoked code:** revoke a personal link and open it → friendly screen + "המשך".
- [ ] **Community-only invite:** `GET /api/coach/invites/community` → open that link as a trainee of another coach → joined;
      Profile shows two community chips; that coach cannot open her.
- [ ] **Cross-coach isolation:** covered by the tests (`accounts.test.ts`).
- [ ] **EN / LTR:** switch to English on the admin page, the invite sheet, `/set-password`, `/join/…`, the no-coach screen.

## 11. Files

- **Added — server:** `features/admin/*`, `features/coachProfiles/*`, `features/coachings/*` (model, config, constants, service,
  routes, coachingRef, accountsMigration, tests), `features/communities/*`, `features/invites/*`,
  `middleware/optionalAuth.middleware.ts`, `middleware/rateLimit.middleware.ts`.
- **Added — packages:** `types/src/accounts.ts`, `api-client/src/accountsApi.ts`.
- **Added — dashboard:** `features/admin/*`, `features/invites/*`, `features/auth/{components/RequireRole,data/roles.ts,
  hooks/useSetPassword.ts,pages/SetPasswordPage}`, `hooks/useClipboard.ts`, `services/{admin,invites}/*`.
- **Added — mobile:** `features/join/*`, `services/{invites,coachings}/*`, `services/auth/appRole.ts`, `hooks/useActiveCoachings.ts`,
  `features/profile/hooks/useMyCommunities.ts`.
- **Deleted:** server `users/coachAssignment.service.ts` (+ its test); dashboard `features/auth/components/RequireCoach/*`.
- **Modified:** see the commit list below.

## 12. Dependencies
- Added: `express-rate-limit` (server), `qrcode` + `@types/qrcode` (dashboard). Removed: none.

## 13. Suggested commits

Commit the earlier uncommitted profile-photo / questionnaire work first (see Known issues) — several files below also carry it.

1. `feat(server): accounts model — roles, coachings, communities, invites + migration`
2. `feat: admin creates and suspends coaches, one-time set-password link` (server + dashboard + api-client)
3. `feat: coach invite links with QR and personal single-use links` (server + dashboard)
4. `feat: join flow — /join, sign-up with invite, no-coach screen, roles in the app` (server events + mobile)
5. `fix(server): coach access goes through the coaching; cross-coach tests`
6. `feat(mobile): coaching-aware plan hooks and community chips on Profile`
7. `docs: accounts & relationships report, PRD and build plan`

```
git add -A -- packages/types/src/accounts.ts packages/types/src/index.ts apps/server/src/features/users/users.constants.ts apps/server/src/features/users/user.model.ts apps/server/src/features/coachings/coaching.model.ts apps/server/src/features/coachings/coaching.config.ts apps/server/src/features/coachings/coaching.constants.ts apps/server/src/features/coachings/coaching.service.ts apps/server/src/features/coachings/coachingRef.ts apps/server/src/features/coachings/accountsMigration.ts apps/server/src/features/coachProfiles apps/server/src/features/communities apps/server/src/features/invites/invite.model.ts apps/server/src/features/plans/plan.model.ts apps/server/src/features/plans/plan.types.ts apps/server/src/features/workoutLogs/workoutLog.model.ts apps/server/src/features/workoutLogs/workoutLog.types.ts apps/server/src/features/cardio/cardio.model.ts apps/server/src/features/cardio/cardio.types.ts apps/server/src/features/nutrition/nutritionPlan.model.ts apps/server/src/features/nutrition/nutrition.types.ts apps/server/src/features/mealLogs/mealLog.model.ts apps/server/src/features/mealLogs/mealLog.types.ts apps/server/src/features/aiRecommendations/aiRecommendation.model.ts apps/server/src/features/aiRecommendations/aiRecommendation.types.ts apps/server/src/server.ts apps/server/src/config/env.ts apps/server/.env.example apps/server/src/events/appEvents.ts apps/server/vitest.config.mts
git commit -m "feat(server): accounts model — roles, coachings, communities, invites + migration"
```
```
git add -A -- apps/server/src/features/admin apps/server/src/features/auth/auth.controller.ts apps/server/src/features/auth/auth.routes.ts apps/server/src/features/auth/auth.service.ts apps/server/src/features/auth/auth.validation.ts apps/server/src/features/auth/email.service.ts apps/server/src/middleware/auth.middleware.ts apps/server/src/middleware/rateLimit.middleware.ts apps/server/src/i18n/locales/he.ts apps/server/src/i18n/locales/en.ts apps/server/src/features/users/appState.service.ts apps/server/src/features/users/scripts/promoteCoach.ts apps/server/src/features/users/scripts/seedDev.ts apps/server/src/features/users/coachAssignment.service.ts apps/server/src/features/users/__tests__/coachAssignment.test.ts apps/server/src/features/achievements/scripts/backfillAchievements.ts apps/server/src/features/nutrition/scripts/seedNutrition.ts apps/server/src/features/nutrition/scripts/resetNutrition.ts apps/server/package.json package-lock.json packages/api-client/src/accountsApi.ts packages/api-client/src/index.ts packages/api-client/src/authApi.ts apps/dashboard/src/features/admin apps/dashboard/src/features/auth/components/RequireRole apps/dashboard/src/features/auth/components/RequireCoach apps/dashboard/src/features/auth/data/roles.ts apps/dashboard/src/features/auth/hooks/useSetPassword.ts apps/dashboard/src/features/auth/pages/SetPasswordPage apps/dashboard/src/features/auth/pages/Login/Login.tsx apps/dashboard/src/app/config/routes.ts apps/dashboard/src/app/router/AppRouter.tsx apps/dashboard/src/services/auth/AuthContext.tsx apps/dashboard/src/services/auth/authService.ts apps/dashboard/src/services/admin apps/dashboard/src/copy/he.ts apps/dashboard/src/copy/en.ts apps/dashboard/src/hooks/useNavigation.ts
git commit -m "feat: admin creates and suspends coaches, one-time set-password link"
```
```
git add -A -- apps/server/src/features/invites/invite.constants.ts apps/server/src/features/invites/invite.controller.ts apps/server/src/features/invites/invite.routes.ts apps/server/src/features/invites/invite.service.ts apps/server/src/features/invites/invite.validation.ts apps/server/src/middleware/optionalAuth.middleware.ts apps/server/src/features/coach/coach.routes.ts apps/server/src/app.ts apps/dashboard/src/features/invites apps/dashboard/src/services/invites apps/dashboard/src/hooks/useClipboard.ts apps/dashboard/src/features/trainees/pages/TraineesPage/TraineesPage.tsx apps/dashboard/package.json
git commit -m "feat: coach invite links with QR and personal single-use links"
```
```
git add -A -- apps/server/src/features/onboarding/onboarding.service.ts apps/server/src/features/notifications/notification.listeners.ts apps/server/src/features/aiRecommendations/aiRecommendation.listeners.ts apps/server/src/features/coachings/coaching.routes.ts apps/mobile/src/features/join apps/mobile/src/services/invites apps/mobile/src/services/auth/AuthContext.tsx apps/mobile/src/services/auth/appRole.ts apps/mobile/src/app/config/routes.ts apps/mobile/src/app/config/tabs.ts apps/mobile/src/app/router/AppRouter.tsx apps/mobile/src/app/router/landingPath.ts apps/mobile/src/components/layout/AppDock/AppDock.tsx apps/mobile/src/features/achievements/components/AchievementCelebration/AchievementCelebration.tsx apps/mobile/src/features/auth/components/AuthScreen/AuthScreen.tsx apps/mobile/src/features/auth/pages/Login/Login.tsx apps/mobile/src/features/auth/pages/Register/Register.tsx
git commit -m "feat: join flow — /join, sign-up with invite, no-coach screen, roles in the app"
```
```
git add -A -- apps/server/src/middleware/coachTrainee.middleware.ts apps/server/src/features/coach/coach.controller.ts apps/server/src/features/coach/coach.service.ts apps/server/src/features/coach/coachStats.service.ts apps/server/src/features/plans/planBuilder.service.ts apps/server/src/features/plans/planWeekOptions.service.ts apps/server/src/features/plans/plan.service.ts apps/server/src/features/plans/plan.controller.ts apps/server/src/features/plans/traineePlan.service.ts apps/server/src/features/workoutLogs/workoutLog.controller.ts apps/server/src/features/workoutLogs/workoutLog.service.ts apps/server/src/features/workoutLogs/workoutSession.service.ts apps/server/src/features/cardio/cardio.controller.ts apps/server/src/features/cardio/cardio.service.ts apps/server/src/features/mealLogs/mealLog.controller.ts apps/server/src/features/mealLogs/mealLog.service.ts apps/server/src/features/nutrition/nutritionPlan.service.ts apps/server/src/features/aiRecommendations/aiRecommendation.controller.ts apps/server/src/features/aiRecommendations/aiRecommendation.service.ts apps/server/src/features/notifications/coachNoteThanks.service.ts apps/server/src/features/exerciseFamilies/exerciseFamily.controller.ts apps/server/src/features/exerciseFamilies/exerciseFamily.service.ts apps/server/src/testing/apiTestClient.ts apps/server/src/features/coachings/__tests__ apps/server/src/features/aiRecommendations/__tests__/aiRecommendations.test.ts apps/server/src/features/aiRecommendations/__tests__/nutritionRecommendations.test.ts apps/server/src/features/auth/__tests__/roles.test.ts apps/server/src/features/exerciseFamilies/__tests__/exerciseFamilies.api.test.ts apps/server/src/features/onboarding/__tests__/onboarding.test.ts apps/server/src/features/plans/__tests__/modelRules.test.ts apps/server/src/features/plans/__tests__/planSets.test.ts apps/server/src/features/plans/__tests__/planWeekOptions.test.ts apps/server/src/features/workoutLogs/__tests__/workoutSession.test.ts
git commit -m "fix(server): coach access goes through the coaching; cross-coach tests"
```
```
git add -A -- packages/api-client/src/traineeApi.ts apps/mobile/src/services/coachings apps/mobile/src/hooks/useActiveCoachings.ts apps/mobile/src/features/workouts/hooks/useWeekPlan.ts apps/mobile/src/features/workouts/hooks/useWorkoutHistory.ts apps/mobile/src/features/home/hooks/useHomeData.ts apps/mobile/src/features/profile/hooks/useMyCommunities.ts apps/mobile/src/features/profile/components/ProfileHero/ProfileHero.tsx apps/mobile/src/features/profile/components/ProfileHero/ProfileHero.css apps/mobile/src/features/profile/pages/ProfilePage/ProfilePage.tsx apps/mobile/src/features/profile/copy/he.ts apps/mobile/src/features/profile/copy/en.ts
git commit -m "feat(mobile): coaching-aware plan hooks and community chips on Profile"
```
```
git add -A -- docs/phase-reports/accounts-relationships.md docs/PRD.md docs/BUILD_PLAN.md
git commit -m "docs: accounts & relationships report, PRD and build plan"
```

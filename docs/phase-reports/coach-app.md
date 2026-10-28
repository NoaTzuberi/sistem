# Coach app (mobile coach mode) — report

Spec: docs/design/coach-app.html (+ the Phase B brief, 2026-10-27). One section per phase.

Phase B status: server tests 684/684 (new `coachConnect.test.ts`), copy parity + client tests 39/39, lint + i18n +
contrast audits clean, every app builds.

## Phase A — shell, Today, Trainees, Trainee detail, Profile, mode switch (2026-10-26)

Full report: `docs/phase-reports/coach-app-phase-a.md` (decisions, the attention rule, files, commits). In short:
coach shell (ink stage, dock היום / מתאמנות / פרופיל), Today (scoreboard, waiting carousel, activity feed built on read),
trainee list + detail, profile, and the coach ↔ trainee mode switch.

**Attention rule** (unchanged in B, `apps/server/src/features/coach/coachAttention.ts` → `ATTENTION_CONFIG`): an ACTIVE
coaching is flagged when she has no completed workout for **5+ days** (counted from the later of her last workout and her
first published plan's week) or **2+ missed** dated workouts this week ("no workout" wins). Waiting trainees are never flagged.

## Phase B — reactions, messages, invite sheet, light plan edits (2026-10-27)

### What changed
- **B1 Reactions.** Feed items for a finished workout, a cardio run and photos (Daily Pump, meal day, progress day) get
  👏 🔥 ❤️. One reaction per coach per item; the same emoji again removes it; a different one replaces it. Taps show at
  once and roll back with a toast on failure. Spring press (0.9 → back on `--ease-spring`); reduced motion = no scale.
  Trainee side: Home's coach area shows the newest reaction of the last 14 days ("שקד הגיבה 🔥 על Full Body B", tap → the
  log; a dot while new, marked seen once shown), and her workout log page lists the reactions on that log.
- **B2 Messages.** No messaging existed (only Home's "👍 תודה" on notes), so 1:1 threads were built: one thread = one
  coaching (an ended coaching's thread disappears for the coach; she can't write without a live coach).
  - Coach: new dock tab **הודעות** with an unread badge (polled every 30 s + on focus); the list (avatar, name, last
    message — "את: …" for her own — time, unread dot); the thread screen (bubbles + composer, full screen, no dock).
  - **Quick message sheet** from feed items ("הודעה"), attention cards ("שליחת הודעה") and the trainee screen (new pink
    "הודעה" quick action, first): recipient row, the 4 template chips (tap fills the text), textarea, ביטול / שליחה. After
    sending: toast "ההודעה נשלחה" with "לכל השיחה".
  - Trainee: Home's coach note shows the coach's newest message when it is newer than her notes, with a "תשובה" chip →
    `/home/messages` (the same thread screen). "👍 תודה" stays for notes.
  - No push yet: threads refetch every 15 s while visible and on focus. Push arrives with Capacitor (Phase 5b) inside the
    same send path.
- **B3 Invite sheet.** "+ הזמנה" (Today, Trainees) and "QR" on the Profile link card open it: Karantina title + the
  spec's line, a 220 px QR of her join link (the dashboard's `qrcode` library, now also a mobile dependency), the link row
  (LTR mono) + העתקה, שיתוף (Web Share API, falls back to copy; a cancelled share does nothing) and קישור אישי (the existing
  `POST /coach/invites` single-use link — the sheet then shows, copies and shares that link). Feedback lines appear inside
  the sheet (the app toast sits under sheets).
- **B4 Light plan edits ("עריכה קלה").** Opened from the "תוכנית" quick action and "עריכה קלה" on the אימונים tab's השבוע
  card. Picks this week's plan (published first) and a workout (chips; default = the first not done):
  - הזזה ליום אחר — 7-day picker (days already past in her zone are disabled), saves the whole plan through
    `PUT …/plans/:planId`; a published plan's change lights her Workouts tab dot (`liveUpdatedAt`). Undo toast.
  - החלפת תרגיל — pick the exercise → replacements from her library: the same family's other variants, then other families
    with the same movement pattern (families sharing one of its muscles first), filtered by HER equipment and level.
    Sets / reps / weights / rest / notes stay; the swapped line gets a new id so her old logs never point at the new
    exercise. Undo toast.
  - שכפול השבוע לשבוע הבא — `POST …/plans { duplicatePrevious }` for next week → a **DRAFT** + toast with undo (deletes the
    draft). Publishing: the existing "פרסום התוכנית" button on the draft (with its confirm sheet) in the same tab.
  - בנייה מאפס — opens the dashboard plans tab for her (`VITE_COACH_DASHBOARD_URL`); hidden when not set.
  - Done workouts can't be moved / swapped; cardio workouts can be moved, not swapped. Every rule stays on the server.
- Shared: `Toast` takes an optional action button (undo / open thread); `useToast` keeps such a toast 5 s.
  `@sistem/shared` `planPayload.ts` (`planToSavePayload`, `withWorkoutDay`, `withExerciseSwapped`).

### Endpoints added
| Method | Path | Who | Notes |
|---|---|---|---|
| PUT | `/api/coach/trainees/:traineeId/reactions` | coach | `{ targetType, targetId, reaction: clap\|fire\|heart\|null }`; target must be hers, inside this coaching (logs of the coaching or her own logs since joining; photo days with photos) → 404 otherwise |
| GET | `/api/coach/messages` | coach | threads of her LIVE coachings with messages, newest first, `unreadTotal` |
| GET | `/api/coach/messages/unread` | coach | `{ unread }` (dock badge) |
| GET | `/api/coach/trainees/:traineeId/messages?before=&limit=` | coach | page newest first |
| POST | `/api/coach/trainees/:traineeId/messages` | coach | `{ text }` ≤ 2000, rate-limited |
| POST | `/api/coach/trainees/:traineeId/messages/read` | coach | marks hers read → `{ unread }` |
| GET | `/api/messages?before=&limit=` | trainee | her thread with her current coach (+ coach name/avatar, unread) |
| GET | `/api/messages/unread` | trainee | `{ unread }` |
| POST | `/api/messages` | trainee | `{ text }`, rate-limited; 409 `message_no_coach` without a live coaching |
| POST | `/api/messages/read` | trainee | marks the coach's messages read |
| GET | `/api/reactions?logId=` | trainee | her coaches' reactions (14 days, or one log), live coachings only |
| POST | `/api/reactions/seen` | trainee | 204 |

`GET /api/coach/activity` items now carry `reactionTarget: { type, id, reaction }` on reactable items.
Security: every coach route = `requireRole('coach')` (active coach profile) + `loadCoachTrainee` (a LIVE coaching; another
coach's trainee = 404). The feed never reads outside her live coachings. Photos stay blurred signed links. Sending is
limited per user to 30 / minute (`messageRateLimit`, in-memory like the other limits).

### Data model (new)
- `Reaction { coachId, coachingId, traineeId, targetType, targetId, reaction, seenAt, timestamps }` — unique
  (coachId, traineeId, targetType, targetId). Target ids: a log id, or her date for a day of photos.
- `Message { coachingId, coachId, traineeId, sender: coach|trainee, text ≤ 2000, readAt, timestamps }`.

### Missing data / decisions to check
- PRD has no messages or reactions yet (§6, §9, §10). Built from the brief; please add them to the PRD (and §9: should a
  message notify — in-app inbox or push only?). Today a message creates **no** notification; the unread counts come from
  the messages themselves.
- No coach display photo for the trainee's thread header beyond the user avatar (`User.avatar`); initials otherwise.
- Swap "by the same muscle": exercise facts have muscles, but the family search filters by **movement pattern**, not
  muscle. Exercises without a family / pattern (unreviewed) get no "same movement" list.
- Duplicate copies "her most recent earlier plan" (server rule) = this week's when it exists.
- Moving a workout into a past day is blocked in the UI only (the server allows any day 0–6, as in the dashboard).
- A swap while she has that workout open in a live session: the session keeps its pre-filled sets (old exercise id); not
  guarded. Rare; worth a server check later.
- Pink "הודעה" action and dock badge use `--solid-pink` (white small text on Neon Pink fails 4.5:1).

### Placeholder copy (he = draft for the owner, feminine; en = placeholder)
SPEC = the spec's wording; everything else PLACEHOLDER.

| key | he | en | status |
|---|---|---|---|
| coach.reactions.label | 'תגובה' | 'Reaction' | PLACEHOLDER (screen reader: the group) |
| coach.reactions.names | { clap: 'מחיאות כפיים', fire: 'אש', heart: 'לב' } | { clap: 'Clap', fire: 'Fire', heart: 'Heart' } | PLACEHOLDER (screen reader) |
| coach.reactions.error | 'לא הצלחנו לשמור את התגובה. נסי שוב.' | "Couldn't save the reaction. Please try again." | PLACEHOLDER |
| coach.messages.title | 'הודעות' | 'Messages' | SPEC |
| coach.messages.message | 'הודעה' | 'Message' | SPEC |
| coach.messages.sendMessage | 'שליחת הודעה' | 'Send a message' | SPEC |
| coach.messages.empty | 'עוד אין הודעות. אפשר לכתוב למתאמנת מהמסך שלה או מהפיד.' | 'No messages yet. Write to a trainee from her screen or from the feed.' | PLACEHOLDER |
| coach.messages.loadError | 'לא הצלחנו לטעון את ההודעות.' | "Couldn't load the messages." | PLACEHOLDER |
| coach.messages.unread | 'לא נקרא' | 'Unread' | SPEC (screen reader) |
| coach.messages.youPrefix | 'את: {text}' | 'You: {text}' | PLACEHOLDER |
| coach.messages.unreadBadge | plural({ one: 'הודעה אחת חדשה', two: '2 הודעות חדשות', other: '{count} הודעות חדשות' }) | plural({ one: '1 new message', two: '2 new messages', other: '{count} new messages' }) | PLACEHOLDER (screen reader) |
| coach.messages.quickTitle | 'הודעה' | 'Message' | SPEC |
| coach.messages.templatesLabel | 'הודעות מוכנות' | 'Ready messages' | PLACEHOLDER (screen reader) |
| coach.messages.templates | ['כל הכבוד על האימון! 💪', 'מה שלומך? לא ראיתי אימון כמה ימים', 'שבוע חדש מוכן באפליקציה', 'זכרי לעדכן מדידות'] | ['Great job on the workout! 💪', "How are you? I haven't seen a workout in a few days", 'A new week is ready in the app', 'Remember to update your measurements'] | SPEC, PLACEHOLDER for the owner |
| coach.messages.cancel | 'ביטול' | 'Cancel' | SPEC |
| coach.messages.send | 'שליחה' | 'Send' | SPEC |
| coach.messages.sent | 'ההודעה נשלחה' | 'Message sent' | SPEC |
| coach.messages.openThread | 'לכל השיחה' | 'Open the conversation' | PLACEHOLDER |
| coach.invite.title | 'הזמנת מתאמנת' | 'Invite a trainee' | SPEC |
| coach.invite.text | 'מתאמנת שנרשמת דרך הקישור או ה-QR מצטרפת אלייך אוטומטית, ממלאת שאלון ומחכה לתוכנית.' | 'A trainee who signs up through the link or the QR joins you automatically, fills in the questionnaire and waits for her plan.' | SPEC |
| coach.invite.qrLabel | 'קוד QR להצטרפות' | 'QR code to join' | SPEC (screen reader) |
| coach.invite.linkLabel | 'הקישור שלך' | 'Your link' | PLACEHOLDER (screen reader) |
| coach.invite.personalLabel | 'קישור אישי לשימוש אחד' | 'A personal single-use link' | PLACEHOLDER (screen reader) |
| coach.invite.copy | 'העתקה' | 'Copy' | SPEC |
| coach.invite.copied | 'הקישור הועתק' | 'Link copied' | PLACEHOLDER |
| coach.invite.copyFailed | 'לא הצלחנו להעתיק. אפשר לסמן את הקישור ולהעתיק ידנית.' | "Couldn't copy. Select the link and copy it by hand." | PLACEHOLDER |
| coach.invite.share | 'שיתוף' | 'Share' | SPEC |
| coach.invite.shareTitle | 'הצטרפות ל-Sistem' | 'Join Sistem' | PLACEHOLDER (the share sheet title) |
| coach.invite.personal | 'קישור אישי' | 'Personal link' | SPEC |
| coach.invite.personalReady | 'קישור אישי נוצר · לשימוש אחד, 14 ימים' | 'Personal link created · single use, 14 days' | PLACEHOLDER |
| coach.invite.personalError | 'לא הצלחנו ליצור קישור אישי. נסי שוב.' | "Couldn't create a personal link. Please try again." | PLACEHOLDER |
| coach.invite.loadError | 'לא הצלחנו לטעון את הקישור.' | "Couldn't load the link." | PLACEHOLDER |
| coach.edit.title | 'עריכה קלה' | 'Quick edit' | SPEC |
| coach.edit.open | 'עריכה קלה' | 'Quick edit' | SPEC |
| coach.edit.workoutsLabel | 'האימון לעריכה' | 'Workout to edit' | PLACEHOLDER (screen reader) |
| coach.edit.noDay | 'בלי יום' | 'No day' | PLACEHOLDER |
| coach.edit.noPlan | 'אין תוכנית לשבוע הזה. בונים אותה בדשבורד.' | 'No plan for this week. Build it on the dashboard.' | PLACEHOLDER |
| coach.edit.move | 'הזזה ליום אחר' | 'Move to another day' | SPEC |
| coach.edit.moveHint | 'האימון עובר, השאר לא משתנה' | 'The workout moves, nothing else changes' | SPEC |
| coach.edit.swap | 'החלפת תרגיל' | 'Swap an exercise' | SPEC |
| coach.edit.swapHint | 'מתוך הספרייה שלך, לפי אותו שריר' | 'From your library, same muscle' | SPEC |
| coach.edit.duplicate | 'שכפול השבוע לשבוע הבא' | 'Duplicate this week to next week' | SPEC |
| coach.edit.duplicateHint | 'טיוטה, תפרסמי כשמוכן' | 'A draft — publish when ready' | SPEC |
| coach.edit.desk | 'בנייה מאפס' | 'Build from scratch' | SPEC |
| coach.edit.deskHint | 'נפתח בדשבורד במחשב' | 'Opens the dashboard on a computer' | SPEC |
| coach.edit.doneHint | 'האימון בוצע, אפשר רק לצפות' | 'This workout is done — view only' | PLACEHOLDER |
| coach.edit.moveTitle | 'לאיזה יום?' | 'Which day?' | SPEC |
| coach.edit.moveCurrent | '{title} · כרגע ביום {day}' | '{title} · now on {day}' | SPEC |
| coach.edit.moveNoDay | '{title} · בלי יום קבוע' | '{title} · no set day' | PLACEHOLDER |
| coach.edit.daysLabel | 'ימי השבוע' | 'Days of the week' | PLACEHOLDER (screen reader) |
| coach.edit.moveSave | 'שמירה ועדכון אצלה' | 'Save and update her' | SPEC |
| coach.edit.moved | 'האימון הוזז · {name} תראה את השינוי' | 'Workout moved · {name} will see the change' | SPEC (adapted: the server tells her by the tab dot) |
| coach.edit.swapTitle | 'איזה תרגיל להחליף?' | 'Which exercise to swap?' | PLACEHOLDER |
| coach.edit.swapWithTitle | 'במה להחליף את {name}?' | 'Swap {name} for…' | PLACEHOLDER |
| coach.edit.swapKeeps | 'הסטים, החזרות והמשקלים נשארים.' | 'Sets, reps and weights stay.' | PLACEHOLDER |
| coach.edit.swapFamily | 'אותו תרגיל, ציוד אחר' | 'Same exercise, other equipment' | PLACEHOLDER |
| coach.edit.swapPattern | 'אותה תנועה' | 'Same movement' | PLACEHOLDER |
| coach.edit.swapNone | 'לא נמצאו תרגילים חלופיים בספרייה.' | 'No other exercises found in the library.' | PLACEHOLDER |
| coach.edit.swapLoadError | 'לא הצלחנו לטעון תרגילים. נסי שוב.' | "Couldn't load exercises. Please try again." | PLACEHOLDER |
| coach.edit.swapped | 'התרגיל הוחלף' | 'Exercise swapped' | PLACEHOLDER |
| coach.edit.duplicated | 'השבוע הבא נוצר כטיוטה' | 'Next week was created as a draft' | SPEC (adapted: "שבוע 7 נוצר כטיוטה") |
| coach.edit.nextTaken | 'לשבוע הבא כבר יש תוכנית.' | 'Next week already has a plan.' | PLACEHOLDER |
| coach.edit.undo | 'ביטול' | 'Undo' | PLACEHOLDER |
| coach.edit.undone | 'השינוי בוטל' | 'Change undone' | PLACEHOLDER |
| coach.edit.error | 'לא הצלחנו לשמור. נסי שוב.' | "Couldn't save. Please try again." | PLACEHOLDER |
| coach.edit.back | 'חזרה' | 'Back' | PLACEHOLDER |
| coach.edit.cancel | 'ביטול' | 'Cancel' | SPEC |
| messages.title | 'הודעות' | 'Messages' | SPEC |
| messages.back | 'חזרה' | 'Back' | PLACEHOLDER |
| messages.threadLabel | 'שיחה' | 'Conversation' | PLACEHOLDER (screen reader) |
| messages.placeholder | 'כתבי הודעה…' | 'Write a message…' | SPEC |
| messages.inputLabel | 'הודעה' | 'Message' | SPEC (screen reader) |
| messages.send | 'שליחה' | 'Send' | SPEC |
| messages.sendError | 'ההודעה לא נשלחה. נסי שוב.' | "The message wasn't sent. Please try again." | PLACEHOLDER |
| messages.loadError | 'לא הצלחנו לטעון את ההודעות.' | "Couldn't load the messages." | PLACEHOLDER |
| messages.older | 'הודעות קודמות' | 'Earlier messages' | PLACEHOLDER |
| messages.empty | 'עוד אין הודעות. אפשר לכתוב כאן.' | 'No messages yet. You can write here.' | PLACEHOLDER |
| messages.read | 'נקראה' | 'Read' | PLACEHOLDER |
| messages.noCoach | 'אין לך מאמנת כרגע, אז אין למי לכתוב.' | "You don't have a coach right now, so there's no one to write to." | PLACEHOLDER |
| messages.mine | 'את' | 'You' | PLACEHOLDER (screen reader: who wrote a bubble) |
| messages.reply | 'תשובה' | 'Reply' | PLACEHOLDER |
| messages.openThread | 'להודעות' | 'Messages' | PLACEHOLDER |
| messages.reactionOn.workout | '{coach} הגיבה {emoji} על {title}' | '{coach} reacted {emoji} to {title}' | SPEC ("שקד הגיבה 🔥 על Full Body B") |
| messages.reactionOn.pump | '{coach} הגיבה {emoji} על ה-Daily Pump' | '{coach} reacted {emoji} to your Daily Pump' | PLACEHOLDER |
| messages.reactionOn.meal | '{coach} הגיבה {emoji} על תמונות הארוחה' | '{coach} reacted {emoji} to your meal photos' | PLACEHOLDER |
| messages.reactionOn.progress | '{coach} הגיבה {emoji} על תמונות ההתקדמות' | '{coach} reacted {emoji} to your progress photos' | PLACEHOLDER |
| messages.reactionOnLog | '{coach} הגיבה {emoji}' | '{coach} reacted {emoji}' | PLACEHOLDER (a workout log page) |
| app.tabs.messages | 'הודעות' | 'Messages' | SPEC |

### Test checklist
Automated: `npm test` (server: new `features/messages/__tests__/coachConnect.test.ts` — reactions toggle / feed / trainee
view / seen, cross-trainee + cross-coach 404s, messages both ways, unread counts, ended coaching, paging, rate limit),
`npm run lint` (oxlint + i18n + contrast), `npm run build`.

Manual (`npm run seed:dev`, `npm run dev`; coach@sistem.dev / trainee2@sistem.dev, password sistem-dev-1234):
- [ ] A coach logs in → coach shell (4 tabs); a trainee → trainee shell; a dual-role user → the mode switch.
- [ ] Today with real events + the empty state (a new coach).
- [ ] Scoreboard numbers → filtered list.
- [ ] Search / filter chips.
- [ ] Detail tabs; feed photos blurred, unblurred on her screen.
- [ ] Reactions: tap 🔥 → pressed; tap again → off; switch to ❤️. As the trainee: Home shows "… הגיבה ❤️ על …" (tap → the
      log, the log shows the reaction).
- [ ] Messages: quick sheet from a feed item / attention card / her screen, template chip, send → toast → "לכל השיחה";
      as the trainee: Home shows the message + "תשובה" → reply; as the coach: the dock badge counts it, the list shows the
      dot, opening the thread clears both.
- [ ] Invite: "+ הזמנה" → QR scans to the join link; העתקה; שיתוף (phone share sheet; desktop → copy); קישור אישי → a new
      single-use link shown and shared.
- [ ] Light edit: move a workout to a later day (as the trainee: Workouts dot + the new day); undo; swap an exercise
      (same sets); undo; duplicate → next week shows as a draft with "פרסום התוכנית"; undo removes it.
- [ ] "בנייה מאפס" opens the dashboard (needs `VITE_COACH_DASHBOARD_URL`).
- [ ] Cross-coach isolation: a second coach can't open the first coach's trainee / thread (404).
- [ ] EN / LTR mirror (bubbles swap sides, chevrons flip, the link row stays LTR); reduced motion (no bubble / reaction motion).
- [ ] iPhone SE + Pro Max widths.

### Screenshots
After (390 px, Hebrew, a throwaway in-memory database seeded with `seed:dev` + one finished workout, a 🔥 reaction and two
messages — the dev DB was not touched), in `docs/phase-reports/coach-app-b/`:
`after-today-reactions.jpg` (feed item with 👏 🔥 ❤️ + "הודעה", dock badge 1), `after-quick-message.jpg`,
`after-invite-sheet.jpg` (taken before the link row was set LTR — the copy button now sits after the address),
`after-messages-tab.jpg`, `after-thread.jpg`.
Not captured: the light-edit sheet, the trainee's Home notice and EN/LTR — the browser extension disconnected mid-session.
No "before" shots: Phase A stored none, and rebuilding HEAD needs a second checkout. Phase A's screens are unchanged except
the additions above.

### Known issues / TODOs
- **Another session was editing this checkout at the same time** (end coaching / archived trainees: `EndCoachingSheet`,
  `ArchivedTraineePage`, `TraineeMoreMenu`, `CoachingEndedCard`, coaching / notification server changes). Several files hold
  both changes: `AppRouter.tsx`, `routes.ts`, coach copy, `TraineeDetailPage`, `packages/types/src/index.ts`,
  `tokens.css`, server locales and `coach.routes.ts`. The commands below add whole files, so those commits will carry
  part of that work too — review with `git diff` before committing, or commit that work first.
- Push for messages / reactions: Phase 5b.
- The rate limit is per server process (as the auth limits).

### Dependencies
- Added: `qrcode` + `@types/qrcode` to `apps/mobile` (already in the lockfile for the dashboard — same versions).

### Suggested commits (never includes CLAUDE.md)
1. `feat(server): coach reactions and 1:1 messages` — reactions + messages features, routes, rate limit, feed reaction
   targets, locales, types, api-client, tests.
2. `feat(mobile): coach mode Phase B — reactions, messages, invite sheet, light plan edits` — mobile + shared + tokens.
3. `docs: coach app Phase B report`.

```sh
git add -A -- apps/server/src/features/reactions apps/server/src/features/messages apps/server/src/app.ts apps/server/src/features/coach/coach.routes.ts apps/server/src/features/coach/coachActivity.service.ts apps/server/src/middleware/rateLimit.middleware.ts apps/server/src/i18n/locales/he.ts apps/server/src/i18n/locales/en.ts packages/types/src/coachConnect.ts packages/types/src/index.ts packages/api-client/src/coachConnectApi.ts packages/api-client/src/index.ts
git commit -m "feat(server): coach reactions and 1:1 messages"
```

```sh
git add -A -- apps/mobile/package.json package-lock.json packages/shared/src/planPayload.ts packages/shared/src/index.ts packages/tokens/tokens.css apps/mobile/src/app/config/routes.ts apps/mobile/src/app/config/tabs.ts apps/mobile/src/app/router/AppRouter.tsx apps/mobile/src/components/common/Toast apps/mobile/src/hooks/useToast.ts apps/mobile/src/components/layout/AppDock apps/mobile/src/copy/he.ts apps/mobile/src/copy/en.ts apps/mobile/src/services/coach/coachService.ts apps/mobile/src/services/coach/coachConnectService.ts apps/mobile/src/services/messages apps/mobile/src/features/messages apps/mobile/src/features/coach/copy apps/mobile/src/features/coach/data/coachUnread.ts apps/mobile/src/features/coach/hooks/useInvite.ts apps/mobile/src/features/coach/hooks/usePlanQuickEdit.ts apps/mobile/src/features/coach/hooks/useQrCode.ts apps/mobile/src/features/coach/hooks/useQuickMessage.ts apps/mobile/src/features/coach/hooks/useReactions.ts apps/mobile/src/features/coach/hooks/useThreads.ts apps/mobile/src/features/coach/components/CoachSheet apps/mobile/src/features/coach/components/SheetButton apps/mobile/src/features/coach/components/InviteSheet apps/mobile/src/features/coach/components/InvitePill apps/mobile/src/features/coach/components/CoachLinkCard apps/mobile/src/features/coach/components/QuickMessageSheet apps/mobile/src/features/coach/components/ReactionBar apps/mobile/src/features/coach/components/PlanQuickEditSheet apps/mobile/src/features/coach/components/ThreadRow apps/mobile/src/features/coach/components/ActivityFeed apps/mobile/src/features/coach/components/ActivityItem apps/mobile/src/features/coach/components/TraineePlan apps/mobile/src/features/coach/components/TraineeWorkouts apps/mobile/src/features/coach/pages/MessagesPage apps/mobile/src/features/coach/pages/ThreadPage apps/mobile/src/features/coach/pages/TodayPage apps/mobile/src/features/coach/pages/TraineeDetailPage apps/mobile/src/features/home/components/HomeScreen apps/mobile/src/features/workouts/pages/WorkoutLogPage
git commit -m "feat(mobile): coach mode Phase B — reactions, messages, invite sheet, light plan edits"
```

```sh
git add -A -- docs/phase-reports/coach-app.md docs/phase-reports/coach-app-b
git commit -m "docs: coach app Phase B report"
```

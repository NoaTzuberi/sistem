# Sistem — Claude Code Build Plan

How to use this file:
- Run **one phase per Claude Code session** (or per `/clear`). Paste the phase prompt as-is.
- Review the phase report, test, commit yourself, then move on.

## Global rules (Claude Code follows these in every phase — also written into CLAUDE.md in Phase 0)

1. **Never run git commands that change history or the remote**: no `git add`, `git commit`, `git push`, `git merge`, `git rebase`, `git reset`, `git stash`, no branch creation. Read-only git (`git status`, `git diff`, `git log`) is fine.
2. **At the end of every phase, write a report** to `docs/phase-reports/phase-XX-<short-name>.txt` (e.g. `phase-01-strip-website.txt`) containing:
   - **Summary** — what was done, in 3–6 lines
   - **Files changed** — added / modified / deleted
   - **Dependencies** — added / removed
   - **How to test** — exact commands and manual checks
   - **Known issues / TODOs** — anything left open or needing a decision
   - **Suggested commits** — one or more commits in Conventional Commits format (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`), each with the list of files it should include, so the owner can commit them in logical chunks
   - The report **ends with the suggested commits as ready-to-paste git commands** (`git add -A -- <paths>` + `git commit -m "..."`, in order, one block per commit). Claude Code never runs them. CLAUDE.md is never included.
3. After writing the report, stop and print the report path and the suggested commits (as the ready-to-paste git commands) in chat.
4. `docs/PRD.md` is the source of truth. If something conflicts with it, ask before deviating.
5. **Mobile-first always** (mobile app only; the coach dashboard is desktop-first): design for 360–430px wide screens first, touch targets at least 44×44px, no hover-only interactions, no scroll-driven website effects. Every new screen must look right on a small phone (iPhone SE size) and a large one (Pro Max size).

- `docs/PRD.md` is the source of truth. If a phase conflicts with the PRD, the PRD wins — ask before deviating.
- Design is owned by the product owner: Claude Code builds functional, clean screens using the design tokens only, without inventing a visual style.

## Owner decisions (from the Phase 0 review, 2026-09-29)

These apply to every later phase. Details and reasoning: `docs/phase-reports/phase-00-audit.txt`.

- **Onboarding is fully protected.** Everything in the onboarding flow is KEEP. Anything onboarding imports (AppShell/Sidebar, Container, Section, GlassCard, common components, usersService) must be kept or replaced, never broken. Onboarding's own activity list (`features/onboarding/data/activities.ts`, server `users.constants.ts`) stays untouched. Keep `docs/Onboarding.txt`.
- **The separate activity logger is removed**: client `features/activities` + `services/activities`, server `features/activities` + `/api/activities`. It is not part of onboarding. `DashboardCalendar` and `AchievementBadges` stay (ADAPT), decoupled from it; they are reworked in Phase 7 and Phase 11.
- **Kaggle exercise dataset is NOT cleared for commercial use** (license unconfirmed). Keep only plain factual fields: exercise name, body part, equipment, level (and the one-word type needed for `movementType`). No copied text: no descriptions, tips, instructions or ratings. Until original descriptions exist (Backlog), **the coach's per-exercise notes in the plan are the instructions trainees see**.
- **Logo**: the ATLAS logo is replaced by a single `Logo` component rendering a "SISTEM" text placeholder, so the real logo can be swapped in one place. ATLAS logo files are deleted.
- **Onboarding copy**: only the word "ATLAS" is replaced with "Sistem"; all other wording stays until the owner sends new text.
- **DashboardPage stays** as the post-onboarding screen until the waiting screen exists (Phase 4).
- **CLAUDE.md stays gitignored.** Never commit it and never remove it from `.gitignore`. Never include it in suggested commits.
- **Onboarding data** moves to a separate `OnboardingResponse` collection (PRD §10). The migration from `User.profile` happens in Phase 3, not before.
- **Onboarding answers are saved to the server after every step** (resume on any device).
- **Onboarding videos** stay local and gitignored until Phase 2c, where they are compressed and hosted on **Cloudinary**. Never bundle them into the app and never commit them.
- **Cloudinary** is the storage for onboarding media, Daily Pump photos and progress photos (Phases 2c, 9, 10). Private photos use authenticated/signed delivery only.
- **AI chat is deleted** (client CoachWidget + server aiCoach). **Knowledge (RAG) is kept** for the Phase 12 coach recommendation.
- **All RepDB content is removed** (CC BY-NC): data, import, route and attribution. The Exercise schema fields (`contentTier`, `media.gallery`, etc.) are kept for now. Exercises have no media for the MVP.
- **No exercise library screen for trainees.** Exercise components are kept; the library UI moves into the dashboard plan builder.
- **One coach for now.** New trainees get the coach's id automatically on sign-up (from config/seed). The model must allow multiple coaches later.
- **Weeks start on Sunday.** Default time zone `Asia/Jerusalem`; store a `timezone` per user.
- **Fresh database.** No migration of ATLAS users.
- **Password reset is not in the MVP** (see Backlog).
- **Monorepo approved.** Phase 1 removals happen in the current structure; the move to apps/ + packages/ happens in Phase 2.

Later owner decisions (2026-10-07):

- **Hebrew is the default language, right-to-left everywhere**; English is an option in Settings. Built in Phase 15, **before any design work**. Coach content is never auto-translated.
- **`docs/reference/` is gitignored** (the coach's own content). The repo is private now and will become public later — see the PRD §14 backlog item on auditing the git history first.

Later owner decisions (2026-10-11):

- **Coach Community is the long-term direction** (PRD §15, Phase 16 — later, not scheduled): a coach profile and feed,
  then community branding per coach. Until then every phase follows the PRD §15.3 architecture notes: scope by
  `coachId`, assume multiple coaches, private media with signed URLs, runtime theming through tokens only.

---

## Phase 0 — Audit & project memory (no code changes)

```
Read docs/PRD.md fully. This repo is a copy of ATLAS that we are turning into Sistem, a mobile coaching app.

Do NOT change any code in this phase. Instead:
1. Map the current codebase: client structure, routes/pages, components, server routes, models, auth flow, onboarding flow, exercise library and its import pipeline.
2. Produce a table with three columns: KEEP / ADAPT / REMOVE for every major module, with one line of reasoning each, based on the PRD (§11 lists what to keep and remove).
3. List gaps: everything in the PRD MVP that does not exist yet.
4. Flag risks (e.g. anything in auth or onboarding that will break when the homepage is removed).
5. Propose a repo structure for three parts sharing one backend: the mobile app (React + Vite + Capacitor, with trainee mode and coach mode by role), the coach web dashboard (React), and the server — including how they share TypeScript types, API client and design tokens (e.g. a monorepo with apps/ and packages/). Proposal only, no moves yet.
6. Create a CLAUDE.md at the repo root with: project summary, stack, folder structure, commands (dev/build/test/lint), coding conventions you observed, "Always read docs/PRD.md before starting a task", and the Global rules from docs/BUILD_PLAN.md (no git writes, phase report + suggested commits after every phase).
7. Write the phase report per the Global rules (docs/phase-reports/phase-00-audit.txt).

Stop and show me the KEEP/ADAPT/REMOVE table and the structure proposal before anything else.
```

---

## Phase 1 — Strip the website

```
Using the KEEP/ADAPT/REMOVE table from the audit, remove everything website-only: marketing homepage, hero/scroll video, landing sections, website navigation/footer, SEO-only pages, and their unused assets, styles and dependencies.

Rules:
- Do not touch auth, onboarding, the exercise library, or server models/routes that are marked KEEP.
- Onboarding must keep working end to end. Before deleting anything, re-check the onboarding dependency list in the Phase 0 report (§5) and handle each item:
  - Adapt PageLayout into a minimal layout without Navbar/Footer BEFORE deleting Navbar/Footer (Register and ProtectedRoute use it).
  - Keep DashboardPage and the /dashboard route — it stays the post-onboarding screen until Phase 4.
  - Sidebar: remove links to deleted routes (/exercises); "/" redirects to login.
- Do not touch the onboarding videos (client/src/assets/onBoardingvid) — they stay local and gitignored until Phase 2c. Do not touch onboarding's own activity list (features/onboarding/data/activities.ts, server users.constants.ts).
- Logo: create one `Logo` component (own folder + CSS) that renders a "SISTEM" text placeholder, use it everywhere the ATLAS logo was used (AuthCard, Sidebar), and delete client/src/assets/Logo/ATLASlogo3.png (and the folder).
- Onboarding copy: replace only the word "ATLAS" with "Sistem" (WelcomeStep, FrequencyStep, ExercisePreferencesStep, RecoveryStep, ReviewStep). Change no other wording.
- Remove the AI chat: client features/coach + services/coach + <CoachWidget/>, server features/aiCoach + /api/coach, and the now-unused @google/genai dependency. Keep features/knowledge.
- Remove the separate activity logger: client features/activities + services/activities, server features/activities + /api/activities. Decouple DashboardCalendar (drop activity fetching, the "Log Activity" modal and activity entries; keep the workout calendar) and AchievementBadges (drop activity-based badges) so they still build. They are reworked in Phases 7 and 11.
- Remove all RepDB content: importRepDbPreview script + `import:repdb` npm script, REPDB_* mappings and RepDB types, repdbNormalize test, the /media/repdb static route, the RepDB attribution (server exercise.service + client ExerciseDetailPage), and server/data/repdb-preview. Keep the Exercise schema fields (contentTier, media.gallery, etc.). Make sure exercise search sorting still works without 'enhanced' records (tests).
- Kaggle import — facts only: the importer keeps only name (Title), body part (BodyPart), equipment (Equipment), level (Level) and the one-word type (Type → movementType, required by the schema). Stop mapping Desc into instructions.execution, stop storing the full CSV row in source.raw (keep only the factual fields), never import Rating/RatingDesc. Update the normalize/dedup tests accordingly. Set source.license to a value that states "unconfirmed — facts only". If a dev database already holds imported descriptions, document how to re-import (fresh DB per owner decision).
- Rewrite docs/THIRD_PARTY_CONTENT.md: RepDB removed; Kaggle dataset kept for factual fields only, with the decision and the reason (license could not be confirmed, provenance unknown → treated as not cleared for commercial use; descriptions, tips, instructions and ratings dropped).
- Remove the trainee exercise library routes (/exercises, /exercises/:slug) but keep the exercise components and services.
- Fix the 2 existing client TypeScript errors listed in the Phase 0 report.
- Remove dead imports and unused packages. The app must build and run with zero errors after this phase.
- The root route "/" should temporarily redirect to the login screen.
- Rename project/app name references from ATLAS to Sistem (package.json, titles, manifest, env examples) — but not in git history or migrations.

Finish with: list of deleted files, removed dependencies, and confirmation that `build` and `lint` pass.
```

---

## Phase 2 — App shell, design tokens, routing guards

```
Turn the client into a mobile-first app shell per docs/PRD.md §4.2, §5 and §12.

1. Design tokens: create a single tokens file (CSS variables) with the palette in PRD §12, plus a dark text token (#111111), spacing, radius (mostly 0 — we use sharp cuts), and typography scale. No hard-coded colors anywhere else.
2. Layout: mobile-first app container, safe-area handling, bottom tab bar with Home / Workouts / Profile (placeholder pages for now).
3. Routing guard implementing the state table in PRD §4.2 (unauthenticated → auth; onboarding incomplete → onboarding; onboarding done & no published plan → waiting screen; has plan → home). The state must come from the server, not local assumptions.
4. Role-based app shell: role=trainee gets the trainee tabs (Home / Workouts / Profile); role=coach gets coach tabs (Inbox / Trainees / Profile) — placeholder pages for now. Guards enforced on the server as well.
5. If the Phase 0 structure proposal was approved, apply it now (move the client into its place and scaffold an empty coach dashboard app that builds and shows a login page using the shared auth).

Keep styling minimal and functional — the owner will design. Do not add a UI library without asking.
```

---

## Phase 2b — Adapt kept ATLAS screens to app scale

```
The screens we kept from ATLAS (login, sign-up, onboarding questionnaire, and any shared components like buttons, inputs, cards) were built for a desktop website. Adapt them to the mobile app scale. Read the Global rules (mobile-first) and PRD §12 first.

1. Audit first: list every kept screen and shared component with what's not app-ready (fixed widths, desktop font sizes, hover-only effects, small tap targets, scroll/GSAP website effects, multi-column layouts, modals that don't fit a phone). Show me the list before changing anything.
2. Then adapt:
   - Viewport meta for Capacitor (width=device-width, viewport-fit=cover), safe-area insets, no horizontal scroll, no page zoom on input focus (inputs at least 16px font).
   - Mobile type scale and spacing from the tokens file — replace any hard-coded sizes and colors with tokens.
   - Touch targets ≥ 44px, press states instead of hover states.
   - Onboarding: one question per screen, progress indicator, sticky bottom "Next" button that stays above the keyboard, back navigation.
   - Forms: correct input types / inputMode (email, numeric), autofill hints, keyboard doesn't cover the active field.
   - Remove scroll-driven or heavy website animations; keep only light transitions.
3. Do not invent a new visual style — only change scale, layout and behavior, using existing tokens. The owner handles the visual design.
4. Verify on iPhone SE (375×667) and iPhone Pro Max (430×932) viewports and note any issue in the report.
```

---

## Phase 2c — Onboarding media to Cloudinary

```
Move the onboarding videos out of the app bundle and onto Cloudinary. The videos must never be bundled into the app or committed to git. Read the Phase 0 report (onboarding videos) first.

a) Compression script: compress every onboarding video with ffmpeg for mobile — 720p max, H.264 MP4, no audio track, a reasonable CRF, `-movflags +faststart` — and generate one poster image per video. Print a before/after size report per file and in total. Output goes to a gitignored folder; originals are never modified.
b) Upload script: upload the compressed videos and posters to Cloudinary into a `sistem/onboarding` folder and write a manifest (JSON) mapping each activity/video key to its video URL and poster URL. Re-running must be safe (overwrite / skip unchanged).
c) Onboarding reads video URLs from that manifest/config instead of local imports. Lazy-load each video, show the poster until the video can play, and fall back gracefully (poster only) if the video fails or the network is slow. No video file is imported into the client bundle anymore.
d) Cloudinary credentials only in .env (never in code or the manifest). Add the keys (e.g. CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) to .env.example.

ffmpeg and the Cloudinary SDK are new tools/dependencies: confirm with me before installing. Document how to run both scripts in the phase report.
```

---

## Phase 3 — Data model & roles

```
Implement the data model in docs/PRD.md §10 on the server.

1. Add `role` (trainee|coach), `onboardingStatus`, `onboardingCompletedAt`, `coachId`, `pushTokens`, `timezone` (default 'Asia/Jerusalem') to the User model. Fresh database — no backfill of ATLAS users is needed.
   One coach for now: on sign-up a trainee gets the coach's id automatically (from config/seed). Keep `coachId` per trainee so multiple coaches are possible later — never assume a single coach in queries.
2. Create models: Plan (with embedded workouts), WorkoutLog, BodyMetric, Achievement, Template, and a separate OnboardingResponse collection (PRD §10). Reuse the existing Exercise schema and the existing onboarding answer shape.
   Migrate onboarding storage from User.profile to OnboardingResponse (server + client service), including per-step partial saves used by Phase 4. Plan weeks start on Sunday and are computed in the user's timezone.
3. Middleware: requireAuth (existing JWT), requireRole('coach'). Every trainee-data endpoint must verify ownership server-side.
4. A seed script that creates one coach account and 2 test trainees with onboarding data.
5. Tests for the authorization rules: a trainee cannot read another trainee's data; a trainee cannot hit coach endpoints.

Show me the schemas before writing the routes.
```

---

## Phase 4 — First-launch onboarding & 48h waiting screen

```
Implement PRD §4.1 steps 1–3.

1. After sign-up, route directly into the existing onboarding questionnaire (reuse the ATLAS onboarding logic and questions). Answers are saved to the server after every step, so onboarding resumes where it left off — even on another device.
2. On completion, the server sets onboardingCompletedAt and onboardingStatus=complete.
3. Build the "Your plan is being built" screen: a 48h countdown computed from the server timestamp, the message from the PRD, and placeholder slots for 3D gym/sport icons (I will provide the assets — create an obvious, easy-to-swap icon slot component).
4. Poll or subscribe so that when a plan is published, the user is moved to Home automatically.
5. Fire an internal "trainee.onboarded" event on the server (Phase 5a will hook notifications into it).
```

---

## Phase 5 — Notifications (split into 5a and 5b — owner decision, 2026-10-01)

Phase 5 is split because native push needs Apple / Google developer accounts and a Firebase
project, which are not available yet. In-app notifications come first; push is added later on
top of the same `notify()` service, so nothing built in 5a is thrown away.

### Phase 5a — In-app notifications (now)

```
Read PRD §9. In-app notifications only — no push, no Capacitor, no new dependencies.

1. A Notification collection: every notification is stored per recipient, with read/unread.
2. Server notification service with a single `notify(userId, payload)` function that stores the notification. Phase 5b adds push delivery inside this same function — callers never change.
3. Hook it up: "trainee.onboarded" → notification to the coach (points to that trainee); "plan.published" → notification to the trainee (points to Home).
4. API: list my notifications, mark one / all as read. A user can only ever read or change her own notifications.
5. Tests for the hooks and the authorization rules.

Show me the Notification schema and the payload types before writing the routes.
```

### Phase 5b — Mobile packaging & native push (later, before launch)

Needs Apple + Google developer accounts and a Firebase project — not available yet.

```
Read PRD §9 and §11 (App packaging).

1. Set up Capacitor for the mobile app (iOS + Android). Decision already made — do not propose alternatives. Includes the app icons (logo files in packages/tokens/brand/).
2. Register device push tokens after login and store them on the user (User.pushTokens). Handle denied permission gracefully. The coach uses the same mobile app (coach mode), so her push goes through the same native flow.
3. Add push delivery via FCM inside the existing `notify(userId, payload)` service from Phase 5a: every notification is still stored, and is also pushed to the user's devices. Handle invalid/expired tokens.
4. Tapping a push follows the notification's target: "trainee.onboarded" opens that trainee in the app's coach mode; "plan.published" opens Home. If the plan is published before the 48h timer ends, the waiting screen must switch to Home immediately when the app is open (listen for the event / poll) and on next launch otherwise.
5. Document the required env vars and platform setup steps in docs/SETUP.md.
6. Workout focus / Do Not Disturb (PRD §14):
   - Android: when a workout starts, ask "Turn on Do Not Disturb for this workout?". If yes, request Notification Policy Access once, enable DND during the session, and restore the previous mode on finish / discard / leave.
   - iOS: apps can't toggle Focus. Add a one-time in-app guide showing how to create a Shortcuts automation "When Sistem is opened → Set Focus: Fitness".
   - All platforms: Sistem's own push notifications are suppressed during an active session and delivered after it ends (the notification is still stored at once; only the push waits).
```

### Phase 5c — Social sign-in: Google + Apple (later, after Phase 5b)

Needs Phase 5b (Capacitor), an Apple Developer account, a Google Cloud OAuth client (iOS, Android, web) and a
published privacy policy URL for Google's OAuth consent screen (the legal item in PRD §14) — not available yet.

Design note (applies NOW, before this phase): the login and sign-up screens are designed with "Continue with
Google" and "Continue with Apple" buttons, shown disabled or hidden by a feature flag until this phase.

```
Read PRD §3 (Social sign-in) and §11 (App packaging).

1. Trainees can sign up / log in with Google or Apple in addition to email + password. Both ship together: the App Store requires Sign in with Apple whenever Google sign-in is offered.
2. Mobile app: native flows via Capacitor (the Google Sign-In and Sign in with Apple native sheets). Ask before adding the plugins (new dependencies).
3. Coach dashboard: web OAuth only if the owner wants it (ask first); Google only is fine on the web.
4. Server: verify the provider's ID token, then find or create the user and issue the same JWT session as email login (the server still computes appState).
   - Data model: the password becomes optional; add User.authProviders [{ provider: 'google' | 'apple', providerUserId, email, linkedAt }].
   - Link to an existing account ONLY when the provider's email is verified and matches; otherwise create a new account.
   - Apple "Hide my email" relay addresses are stored as given.
5. Prefill the name from the provider when available; onboarding continues as usual (onboarding is protected — nothing else in it changes).
6. Coaches are never created through social sign-in (same rule as email sign-up): a new account is always a trainee.
7. Turn on the "Continue with Google" / "Continue with Apple" buttons (remove the disabled state / flag). Button wording is a placeholder in Hebrew and English (Phase 15 copy rules); follow each provider's button guidelines.
8. Document the env vars in .env.example and the platform setup steps in docs/SETUP.md.
```

---

## Phase 6 — Coach admin

```
Implement PRD §6 (MVP parts only: trainees list, trainee detail, plan builder, publish) in the **coach web dashboard** (React, desktop-first, responsive). Use the shared API client, types and design tokens.

1. Trainees list with status filter (new / waiting for plan / active / inactive) and remaining time on the 48h window.
2. Trainee detail: onboarding answers, plans, workout logs (with summaries & pump photos), body metrics.
3. Plan builder: create a weekly plan → add workouts → add exercises from the exercise library (search) → set sets, reps, target weight, rest, notes. Reorder exercises. Save draft / publish. Duplicate previous week.
4. Publishing triggers "plan.published" (the event and its notification listener exist since Phase 5a — the publish service only has to emit it).
5. Dashboard routes require role=coach, enforced on the server as well as the client.
```

---

## Phase 6b — Coach mode in the mobile app

```
Implement the coach mode described in PRD §6 inside the mobile app. Reuse the API and, where sensible, components from the dashboard via the shared packages.

- Inbox: notifications list (new trainee, workout completed), read/unread, tap → relevant trainee. Uses the Phase 5a in-app notifications API (no push needed).
- Trainees: list with status filter and 48h time remaining.
- Trainee detail: onboarding answers, current plan (read-only), workout logs with summaries and Daily Pump photos, body metrics.
- Light actions only: publish an existing draft plan; duplicate last week's plan and publish. Full plan editing stays on the web dashboard — show an "Edit on dashboard" hint.
```

---

## Phase 7 — Trainee Home & Workouts

```
Implement PRD §5.1 and §5.4.

- Weeks start on Sunday; "this week" and "missed" are computed in the trainee's stored timezone.
- Home: this week's workouts in order with status (upcoming/done/missed), a primary "Start next workout" action, a recent-achievements strip (empty state for now), current streak placeholder.
- Workouts: current week, past weeks, completed logs; tapping a log opens its details (read-only).
- All data from the API; proper loading, empty and error states.
```

---

## Phase 8 — Active workout session

```
Implement PRD §5.2.

- Exercise list with the exercise name and factual info from the library (body part, equipment, level), target sets × reps × weight, rest, and the coach's per-exercise notes as the instructions. No library descriptions or media for the MVP (owner decision — see Backlog); leave an empty, easy-to-fill slot for them.
- Per-set logging (actual reps & weight, complete toggle), prefilled with targets.
- Optional rest timer between sets.
- Persist in-progress state locally and sync to the server so a session survives app close / offline, then resumes.
- "Finish workout" creates/finalizes the WorkoutLog and navigates to the summary.
- "Workout completed" notification (owner decision, Phase 6b): when a trainee finishes a workout, notify her coach — a new notification type through the existing event → listener → `notify()` path (Phase 5a), pointing to that trainee. Show it in both Inboxes (the dashboard bell and the mobile coach Inbox): the wording and tap target go in `describeCoachNotification` in `@sistem/shared`, which both already use.
```

---

## Phase 9 — Workout summary & Daily Pump

```
Implement PRD §5.3.

- Computed stats: duration, total volume, sets completed, PRs hit (compare to previous logs).
- Rating + free-text notes.
- Daily Pump photo: camera or gallery, compressed client-side, uploaded to Cloudinary (decided) as private/authenticated assets, served only through signed URLs. Credentials from .env only.
- Save to WorkoutLog; visible to the coach in trainee detail.
- Leave a slot for "achievements unlocked" (filled in Phase 11).
- Small item (web, can be done in Phase 9 or later): when starting a workout, show a gentle dismissible tip suggesting Focus / Do Not Disturb, with a "Don't show again" option. Copy is a placeholder (PRD §14 "Workout focus / Do Not Disturb"; the native version is Phase 5b).
```

---

## Phase 10 — Profile & body tracking

```
Implement PRD §5.5.

- Profile details and editable onboarding answers where sensible.
- Body weight log + chart over time.
- Measurements (chest, waist, hips, arms, thighs — configurable list) over time.
- Progress photos gallery (dated, front/side/back), same private storage as Phase 9.
- Settings: notification preferences, log out.
```

---

## Phase 11 — Achievements & streaks

```
Implement PRD §7.

- Data-driven achievement definitions (config file, not hard-coded if/else chains).
- Server-side evaluation after each WorkoutLog and BodyMetric save; idempotent (never award twice).
- Streak calculation (weekly plan completion streak).
- Show unlocked achievements in the Workout Summary and on Home.
- Unit tests for each achievement rule.
```

---

## Phase 12 — AI plan recommendation

Owner decisions (2026-10-07): Google Gemini API, free tier, dev only, behind `features/ai/ai.client.ts`
(model via `AI_MODEL`, fallback model via `AI_FALLBACK_MODEL`, 429 backoff); no Anthropic SDK. Free text sent
trimmed to 500 chars with emails / phones removed; exercise notes stay empty (the AI "why" is coach-only);
beginner + intermediate exercises only; `Plan.aiRecommendationId` added; no "AI draft ready" notification.
PRD §14 holds the two REQUIRED-before-launch items (paid AI tier, legal) and the experience-level question.

```
Implement PRD §8.

- When "trainee.onboarded" fires, run a background job that sends the onboarding answers + retrieved candidate exercises from the exercise library (reuse the existing RAG integration in features/knowledge) to the LLM.
- Note: the ATLAS LLM client (Gemini, @google/genai) lived in the deleted aiCoach feature. Ask me which LLM provider to use before adding one back.
- Require structured JSON output matching our Plan schema, validate it, and reject any exercise IDs not in the library.
- Store as an AIRecommendation (draft). In the coach plan builder, add "Load AI recommendation", which pre-fills an editable draft with the rationale shown alongside.
- The recommendation is never sent to the trainee directly.
```

---

## Phase 13 (later) — Nutrition

Owner decision (2026-10-07; source updated 2026-10-08): nutrition follows the coach's md food lists in
`docs/reference/` — `150-dairy.md`, `protien.md`, `carbohydrates_and_fruits_guide_120_calories.md`,
`fats_spreads_nuts_90_calories.md`, `snacks.md` — the ONLY source (an earlier PDF menu is no longer used) —
an exchange-list ("portions") method: food groups with a calorie cap per portion (protein ≤ 150 kcal, carb
≤ 120, fat ≤ 90, snack ≤ 150 (13a+), vegetables free), each meal = a number of portions per group, any portion swappable for
another item from the same group. Split into 13a (core, open to users), 13b (built behind feature flags,
closed) and 13c (AI draft, after Phase 12). 13a designs the data model for 13b so nothing needs reworking.
Read PRD §5.6 (including the owner decisions) before each sub-phase. The md lists and their review lists
(`docs/reference/nutrition-guide-issues.md`, `nutrition-diet-tags-review.md`) are local only — `docs/reference/` is gitignored.
If Phase 15 (Hebrew & RTL) is already done when 13 starts, all new copy goes into the translation files.

### Phase 13a — Nutrition core (open to users)

Owner decisions (2026-10-08, built in 13a — details in PRD §5.6): seed data in `apps/server/data/nutrition/`
(gitignored) via `npm run seed:nutrition`; default goal % / activity factors approved as starting points;
the 8 tagged allergens +
free text; no trainee inbox — an "unseen update" dot on the Workouts and Nutrition tabs (last seen stored on the
server). 13b flags: `FEATURE_NUTRITION_RECIPES` / `FEATURE_MEAL_LOGGING` / `FEATURE_WATER_TRACKING` (default off).

```
Implement PRD §5.6 (core). Read the coach's md food lists in docs/reference/ and
docs/reference/nutrition-guide-issues.md first (local files, gitignored — never commit or quote them in
committed files beyond what PRD §5.6 says). Propose the schemas (13a AND the 13b models — see Phase 13b),
the onboarding step and the calorie config before writing routes.

1. Food list (coach): FoodItem — coachId, group (protein / carb / fat / vegetable), name, portion
   description, grams (optional), kcal per portion (optional, never above the group cap), "new" tag,
   diet tags (contains: meat / poultry / fish / dairy / eggs / gluten / peanuts / tree nuts / sesame /
   soy — ids in constants), order, archivedAt (items a plan uses are archived, never deleted). Dashboard
   screen to edit and add. Group values (150 / 120 / 90 / 0 kcal per portion) live in the nutrition
   config, coach-tunable.
2. Nutrition preferences — a NEW onboarding step (owner-approved change to the protected onboarding;
   everything else in onboarding stays untouched). Placeholder copy, marked as such. Fields: diet type
   (none / vegetarian / vegan / pescatarian), kosher (yes / no), allergies and intolerances (a common list
   in constants + free text), foods she dislikes (free text). Saved per step to OnboardingResponse like
   every other step (server validation, resume works); same privacy as the other answers (her own + her
   coach's). Place it before Review and show it in Review. Trainees who completed onboarding before this
   step are not sent back — the coach sees "not answered". The coach sees the preferences in the trainee
   profile (both apps, via the shared onboarding answer sections in @sistem/shared) and in the nutrition
   builder, which warns when an option line uses an item that conflicts with them (diet type / allergy
   tags / kosher = meat + dairy in one option).
3. Seed script (idempotent, per coach, DEV + first setup): the coach's food items verbatim from her md lists
   (apps/server/data/nutrition/food-lists.json, gitignored; diet tags proposed for the coach to review). No
   template is seeded (the lists have none). Never invent values the lists don't give: no per-item kcal, no
   vegetable items. *(Updated 2026-10-08: built first from a PDF menu — 44 items + a "1,500" template —
   which the owner then replaced with the md lists as the only source.)*
4. Calorie target (one pure module, reused by 13c): BMR Mifflin-St Jeor (latest weigh-in, else the
   onboarding weight; height; age from birthDate; sex) × an activity factor from her training frequency
   (table in config) → goal adjustment. Goal mapping (owner-approved): "lose weight" → fat-loss deficit;
   "build muscle" without "lose weight" → muscle-gain small surplus; anything else → toning / recomp
   small deficit; maintenance 0 available to the coach. ALL numbers in ONE config: `nutrition.config.ts`
   defaults + per-coach overrides the coach edits in a dashboard settings screen (the four goal
   percentages, the activity factors, the floor, the group values). Sex "other" or missing → no automatic
   estimate: the coach picks the formula (male / female constants) or types the target. The server returns
   the suggestion with its inputs; the coach approves or overrides. Floor: a target below 1,200 kcal
   (config) needs an explicit coach confirmation, stored on the plan and enforced on publish.
   Unit tests for the formula, the factor table, the goal mapping, the no-estimate case and the floor.
5. Nutrition plan (dashboard builder): one current plan per trainee — calorie target (value, source
   suggested / override, suggestion inputs, floor confirmation), meals (stable ids, editable list, default
   breakfast / lunch / snack / dinner) with portions per group in steps of 0.5 (vegetables free), meal kcal
   and day total computed on the server from the group values, options per meal (label + lines: food item +
   portions, or free text), coach tips. Draft autosaves; publish is explicit; editing a published plan
   and publishing again creates a new version (keep a snapshot per published version — 13b logs point
   to it). Publish rules are server-only (like plan.validation.ts → `issues`): ≥ 1 meal, portions in 0.5
   steps, target set, floor confirmed, option food ids exist / not archived / in the right group; an option
   whose portions differ from its meal is a warning, not a block.
6. Templates — decided: REUSE the Phase 3 Template model (PRD §10 "Template: coachId, type, content").
   Add type `nutrition_plan` and a `nutrition` field holding the SAME meals subschema as NutritionPlan
   (target kcal, meals → portions, options, tips — no trainee data, no calorie confirmation), the way
   `workouts` reuses planWorkoutSchema so a template copies into a plan as-is. The pre-validate shape
   check gets one rule per type (a nutrition template has ≥ 1 meal and no workouts; workout / plan
   templates have no `nutrition`). Why: one templates collection and API pattern for the coach, matches
   the PRD, and the existing `{ coachId, type, updatedAt }` index already serves "my templates of type X".
   Save a plan as a template, start a trainee's plan from one, then adjust.
7. Trainee Nutrition tab (mobile, tab bar Home · Workouts · Nutrition · Profile): her meals with portions
   per group, options and tips; tap a portion → bottom sheet with every item of that group (name, portion,
   grams, "new"). No calorie numbers on trainee screens. Loading / empty ("no nutrition plan yet") / error
   states. Mobile-first.
8. Coach mode (mobile): read-only Nutrition tab in trainee detail (`?tab=nutrition`), "Edit on dashboard" hint.
9. Notification: the publish service emits `nutrition_plan.published` (first publish and every update) →
   listener → `notify()` → trainee, type + data only ({ planId, version, isUpdate }), tap → Nutrition tab.
   Wording built by the screen (placeholder until the owner sends copy).
10. Authorization: coach routes under /api/coach via loadCoachTrainee; a trainee reads only her own
    published plan; nutrition preferences only through the existing onboarding access rules. Tests for
    the rules, the calorie module, the preferences step validation and the publish validation.
```

### Phase 13a+ — Nutrition extensions (owner requests, before 13c)

Owner decisions (2026-10-08) — details in PRD §5.6 "Decisions — Phase 13a+". Read
`docs/reference/calorie-formula.md` (the owner's method, gitignored) first.

```
1. Onboarding: ONE step "Nutrition & goal" (step id nutrition_preferences, no new step ids) with accordion
   sections "My goal" (only for lose weight / build muscle goals, open by default), "How I eat",
   "Intolerances & allergies"; chips, a details field only under a selected item, a summary per collapsed
   section, one Skip, sticky Continue above the keyboard, the open section scrolls into view. Data:
   answers.nutritionPreferences v2 (old answers mapped on read) + answers.weightGoal { targetWeightKg,
   timeframe weeks | date, setAt }. Review, Profile and the coach's onboarding sections show them.
2. Diet tags + shellfish, pork, lactose, alcohol, high_fodmap; every option mapped to tags (PRD table);
   keto → carb-portion warning. Seeded dairy items carry lactose (the coach removes it where it doesn't apply).
3. Calorie calculation per the owner's method (calorieTarget.ts, pure): new activity table, fat_loss_aggressive,
   timeline method with safety caps (1%/week loss, 0.5%/week gain, 25% max deficit, floor), raised to the
   floor, recommended portions per group. New config fields (kcalPerKg, maxLossRatePctPerWeek,
   maxGainRatePctPerWeek, maxDeficitPct, portionSplit, ketoMaxCarbPortions) in nutrition.config.ts + Settings.
   Unit tests for every cap, the missing-data cases and the portion split.
4. Dashboard "Calculation summary" card (replaces the target panel): inputs editable (overrides stored on
   the plan: calorieTarget.calculationOverrides), unsafe-pace notice, recommended kcal + portions.
5. Trainee Nutrition tab: day header with per-group totals (buttons → swap list); coach intro message
   (NutritionPlan.introMessage ≤ 1,500, copied into each version; open while unseen, collapsible).
6. Portion tracking (the 13b meal-logging part, opened now; the mealLogging flag is removed): circles per group
   in the day header (tap / undo, ½ button, ≤ planned), last 7 days editable (server-enforced, her zone),
   offline cache + debounced full-day PUT; optional private meal photo per meal per day (privatePhotos,
   folder sistem/meal-photos/<traineeId>). MealLog = one doc per trainee + date (planned snapshot, eaten,
   planId / version, photos [{ mealId, mealName, publicId, uploadedAt }]). API: GET /api/meal-logs?from&to,
   PUT /api/meal-logs/:date, PUT|DELETE /api/meal-logs/:date/photos/:mealId; coach GET
   /api/coach/trainees/:id/meal-logs?weekStart=. Coach adherence: dashboard Nutrition → Tracking and coach
   mode ?tab=tracking (read-only), marked / planned per day and group, no judgment wording, no calories.
7. The coach's md food lists are the ONLY source (owner, 2026-10-08): `apps/server/data/nutrition/food-lists.json`
   (gitignored, 219 items; PDF-derived items and template removed), idempotent seed (items only, appended after hers; a
   re-run adds only missing items); 8 low-protein dairy items seeded archived for the coach to decide. New portion group
   `snack` (150 kcal, Settings; split 0% = never added by the calculation) through the whole stack. The default portion
   split is a placeholder for the coach. Food categories per group (ids in nutrition.constants FOOD_CATEGORY_IDS,
   labels in @sistem/shared), seeded from the md headings (a re-run only fills items without one); dashboard picker with
   group tabs, category chips, typo-tolerant search, "Recently used" (GET builder response `recentFoodIds`) and
   keyboard; food list group / category filters. DEV ONLY `npm run reset:nutrition -- <coachEmail> [--allow-remote] [--yes]`
   (counts; with --yes deletes the coach's food items, nutrition templates, plans, versions and meal logs).
```

### Phase 13b — Recipes, meal logging, water (built behind feature flags, closed)

The models below are designed (and their schemas approved) in Phase 13a. The routes and UI are built in
13b but stay closed until the owner opens each flag.

```
Implement the PRD §5.6 "planned, closed" features behind feature flags. Propose the flag mechanism first
(there is none yet): one server config with a flag per feature (`nutritionRecipes`, `mealLogging`,
`waterTracking`), default OFF; the server enforces them (a closed feature's routes answer 404) and sends
them to the clients (e.g. with the nutrition plan) so the UI stays hidden — never client-only hiding.

1. Recipes & menu suggestions (coach, dashboard): Recipe — coachId, name, ingredients (food item +
   portions, or free text), steps / notes, computed portions per group. A meal option line may point to
   a recipe. Trainee sees recipes inside her meal options.
2. [DONE EARLY in Phase 13a+ as per-day portion tracking — see 13a+ item 6; not behind a flag]
   Meal logging (trainee): MealLog — traineeId, date ('YYYY-MM-DD' in her zone), planId, plan version,
   mealId, portions eaten per group, optional option id, and a snapshot of the planned portions (so an
   edited plan never rewrites history); unique traineeId + date + mealId. The coach sees adherence per day.
3. Water tracking: daily goal on the nutrition plan (ml, set by the coach) + WaterLog — traineeId, date,
   total ml; quick-add buttons (amounts from config). Unique traineeId + date.
4. Tests: flags off → 404 and no UI; flags on → full flow; authorization rules.
```

### Phase 13c — AI nutrition recommendation (after Phase 12)

Owner decisions (2026-10-08) — details in PRD §5.6 "Decisions — Phase 13c": food names / portion descriptions may go to
the Gemini free tier (dev only); `NutritionPlan.aiRecommendationId` (coach-only); the recommendation API type is split by
kind (training | nutrition); the daily portions must match the calculation EXACTLY (replaces the ±5% tolerance in step 5).
Meal count = her meals-per-day answer (else 4); "loves / dislikes" and every free text go to the model as data and are shown
to the coach as "check by hand". Per-trainee food exceptions are a PRD §14 backlog item.

```
Implement the PRD §5.6 AI draft on top of the Phase 12 AI infrastructure (same LLM provider, job runner
and AIRecommendation model with a nutrition kind — do not add a second provider).

1. Trigger: when "trainee.onboarded" fires (next to the Phase 12 plan job) and on demand from the coach
   ("Generate AI draft" in the nutrition plan builder).
2. Calorie target in CODE, never by the model: the Phase 13a calorie module (Mifflin-St Jeor × activity
   factor from training frequency → goal adjustment: fat loss = deficit, toning / recomp = small deficit,
   muscle gain = small surplus; percentages in the coach-tunable config). Below the 1,200 kcal floor the
   draft is raised to the floor and flagged — the coach confirms as in 13a.
3. Nutrition preferences (13a onboarding step) are enforced IN CODE before the model sees anything:
   filter the coach's food list by her diet type, allergies (diet tags) and kosher — a filtered-out item
   is never sent, so the model cannot pick it. Kosher also = no meat + dairy in the same option (checked
   on the output, step 5). Free-text allergies / dislikes cannot be filtered by code: they are sent to
   the model as text and shown to the coach next to the draft. If the filtered list leaves a group empty,
   do not call the model — tell the coach.
4. Model input: the computed target, the group values, the meal list (from the coach's default template),
   relevant onboarding answers, and the FILTERED food list as ids grouped by group (active items only — archived items,
   e.g. the 8 low-protein dairy items, are never sent).
   Snack group (13a+): the model NEVER adds snack portions. Snack items are sent only when the meal structure it is given
   already has snack portions (the coach's template / settings), and it may only fill those portions with snack items;
   a meal's snack count in the output must equal the input's (validated in code, step 5).
   Model output (structured JSON): portions per group per meal, options per meal (lines = food item id +
   portions), a short rationale for the coach. Nothing else — no calorie numbers from the model.
5. Validation in code: schema; every food id exists, belongs to the coach, is not archived, was in the
   filtered list sent and is in the group the line claims; kosher → no meat + dairy in one option; every
   meal present and non-empty; portions in 0.5 steps; each option's portions
   per group equal its meal's; day total (computed from the group values) within a tolerance of the target
   (config, e.g. ±5%). Invalid → retry with the errors (max retries in config) → else mark failed; the coach
   sees "couldn't generate" and builds manually. Store the inputs with the recommendation.
6. Coach UX: "Load AI draft" pre-fills an editable draft nutrition plan with the rationale and her
   preferences shown alongside. Never visible to the trainee; only the coach's publish reaches her.
7. Tests: the preference filter (each diet type, allergy tags, kosher), the validator (good output, bad
   ids, filtered-out id, wrong group, meat + dairy for kosher, missing meal, off-target totals), retry and
   reject paths, and that nothing is sent to the trainee before publish. The LLM is mocked in tests.
```

---

## Phase 14 (later) — Cardio & running

Owner decision (2026-10-07): the long-term goal is **smartwatch integration**; manual logging is the
fallback for trainees without a watch. Split into 14a (web, no native needed), 14b (watch import via
the phone, after Phase 5b) and 14c (direct integrations, optional). The achievement metrics
(`achievementMetrics.ts`) and the PersonalRecord types (`PERSONAL_RECORD_TYPE_IDS`) are extensible
since Phase 11, so cardio metrics are added without reworking the engine.

### Phase 14a — Cardio foundation (web, no native needed)

```
Implement the cardio foundation. Propose the schema first.

1. Plan builder: cardio exercises with target distance / time / pace, run intervals (e.g. 6 × 400 m,
   rest 60 s), and an optional target HR zone (e.g. "40 min, Zone 2").
2. Personal HR zones: the coach sets max HR (optional resting HR); otherwise it is estimated from age
   (onboarding birth date). Zones 1–5 as a configurable % table. The trainee sees her own bpm range.
3. Manual logging: distance + time (pace computed), optional average HR; marks whether the average
   was on target.
4. Data model ready for imported workouts from day one: source (manual / apple_health /
   health_connect / strava / garmin), external id (dedupe), optional HR samples or precomputed
   time-in-zone, splits per km.
5. PRs: longest distance, fastest 1K / 5K / 10K, longest run. Heart rate itself is never a PR.
6. Achievements: first 5K, first 10K, lifetime km; Zone 2 runs on target (5 / 10 / 25); lifetime
   Zone 2 minutes (300 / 1,000); "aerobic progress" (same pace at lower average HR than earlier runs).
```

### Phase 14b — Smartwatch import via the phone (after Phase 5b, native)

```
Implement smartwatch import through the phone's health platforms. Needs Phase 5b (Capacitor).

1. Apple HealthKit (iOS) and Google Health Connect (Android): read workouts, distance and HR samples,
   with explicit trainee permission. These cover Apple Watch and most watches that sync to them
   (Garmin, Polar, Coros, Samsung, Fitbit).
2. Match an imported workout to the planned cardio exercise (same day, similar type / duration) or
   keep it as an extra activity; exact time-in-zone from HR samples.
3. The coach sees imported runs with HR zones, pace and splits.
```

### Phase 14c — Direct integrations (optional, later)

```
Strava and/or Garmin Connect APIs. Before building: verify their current API terms (especially
showing a user's data to a coach) and developer program approval. Decision deferred — ask first.
```

---

## Phase 15 — Hebrew & RTL (before any design work)

Owner decision (2026-10-07): the app launches in Israel first. **Hebrew is the default language** of the
mobile app and the dashboard, right-to-left everywhere; English is an option. Numbered 15 but it is NOT
"later": it runs before any design work (PRD §12) — the design is made for the Hebrew RTL app. It can run
before Phases 12–14; whichever of them comes after it writes its copy straight into the translation files.

Owner answers (2026-10-08, before coding): own small i18n helper (no new dependency); charts keep the time axis left →
right; neutral forms for buttons / labels, feminine for sentences to the user; AI summaries / rationales in the coach's
language. Fonts: no font decision now — per-language font tokens with a Hebrew system-font placeholder, the current Latin
fonts for English, no new font files; `packages/tokens` becomes the single file for every design value (moved hard-coded
values listed in the phase report); font suggestions go into the report for the design phase. The logo stays in English,
never translated or mirrored.

```
Implement PRD §11 "Language". Read PRD §11 and §12 first. Propose the approach before changing code:
the i18n library (e.g. i18next + react-i18next) or a small in-house helper — a new dependency needs my
OK — the key naming, the file layout, and the list of screens / components affected.

1. Language setting: `User.preferences.language` 'he' | 'en', default 'he', in AuthUser like the units;
   changed in Settings (mobile Profile → Settings, and the dashboard), PATCH /api/users/preferences,
   remembered on the server. Before login (auth screens): Hebrew, or the language last used on this
   device. Both apps switch immediately, without a reload.
2. i18n setup: ALL UI copy moves out of components into translation files. The existing *Copy.ts files
   (homeCopy, workoutCopy, waitingCopy, bodyCopy, profileCopy, achievementCopy, ...) are the source; also
   every inline string in components, onboarding (the step texts and option labels — onboarding logic,
   ids and data stay untouched), the dashboard, and the display helpers in @sistem/shared
   (describeTargets, achievement names, status labels, describeCoachNotification, ...). Keys shared by
   both apps live in @sistem/shared. Hebrew is the primary, complete locale; English must stay complete
   too — add a check (script in `npm test` or lint) that both locales have exactly the same keys and
   the same {placeholders}. Plurals via the library / Intl.PluralRules, never string concatenation.
3. Hebrew copy: the owner writes product copy. Draft the Hebrew strings as faithful translations of the
   current English and list every one in the phase report for owner review (mark them as drafts); copy
   already marked "placeholder" stays a placeholder in both languages. Never invent new wording.
4. RTL layout: `<html dir lang>` follows the language. All CSS moves to logical properties
   (margin-inline-start, padding-inline-end, inset-inline-start, text-align: start, border-start-*, ...);
   no physical left / right properties remain in the CSS except where physical direction is meant (comment why). Direction-
   aware: back / forward chevrons and arrows flip; icons that show real-world direction (clock, play,
   checkmark) do not. The sharp-cut clip-paths and notch / bracket shapes mirror. GSAP x-transforms and
   page transitions flip their direction. Swipe gestures follow the reading direction. Charts (body
   trend, achievements): propose the time-axis direction for RTL and ask before changing it.
5. Numbers and units inside RTL text: numbers, units, times and mixed Hebrew / Latin strings render in
   the right order (Unicode isolation / <bdi>, `dir="ltr"` on numeric inputs where needed): "80 ק״ג",
   "3 × 10", "12:30", "-2.5 kg", rest timers, set rows, pace. Check every screen with numbers.
6. Dates, weekdays, numbers: Intl (DateTimeFormat, NumberFormat, RelativeTimeFormat, PluralRules) in the
   selected locale everywhere — no hand-written month / day names (DAY_NAMES in @sistem/shared becomes
   Intl-based). Weeks still start on Sunday. Israel defaults stay: Asia/Jerusalem, kg, cm.
7. Fonts: check the typography tokens render Hebrew well (glyph support, weights). If the current fonts
   have no Hebrew, stop and ask me — choosing a font is design.
8. Server-built texts follow the user's language: validation / error messages (send a stable code AND
   a localized message; clients may show their own text by code), emails (Resend), and the push texts
   Phase 5b will build (notifications keep storing type + data only — the text is built per recipient's
   language at send time). Server messages live in their own translation files with the same key check.
9. Coach content is stored and shown exactly as written — exercise notes, plan / workout names, food
   list, tips, nutrition notes, summaries. No auto-translation. User-written text renders with
   `dir="auto"` so Hebrew in an English UI (and English in a Hebrew UI) displays correctly.
   The imported exercise names (Kaggle facts) stay in English for now — note it as a known issue.
10. Verify in both languages on iPhone SE (375×667) and Pro Max (430×932) and the dashboard at desktop
    width: every screen, onboarding end to end, an active workout session (timers, interval mode), body
    charts, coach mode. List remaining issues in the report.
```

---

## Phase 12b — AI-assisted plan builder v2 (later, after Phase 15)

Owner request (2026-10-08): planned for later, scheduled after Phase 15 (Hebrew & RTL) — the numbering only says it
builds on Phase 12. Details in PRD §8 "AI-assisted plan builder v2". Same rules as Phase 12: nothing AI-generated reaches
the trainee without the coach publishing; every AI output is validated against the plan rules (plan.validation.ts);
Gemini free tier, dev data only, until the PRD §14 "paid AI tier" item is done. Propose the config shape, the slot
taxonomy and the exercise tagging before writing routes.

Owner answers (2026-10-09, before coding) — details in PRD §8 "Decisions — Phase 12b":
- Two library steps came FIRST: 0a clean exercise names (the dataset's "30 …" / "30 Day …" prefix with its body-part
  word, a stray trailing dash; ids / slugs unchanged) and 0b group equipment variants into exercise families (by
  normalized name + movement pattern, one primary per family + variant, copies kept for old references).
- ABC = A chest + back / B legs / C shoulders + arms as the default, marked "coach to confirm"; a "Lower – glute focus"
  workout type; a note for the coach in docs/reference/abc-split-question.md.
- Split defaults + TrainingSettings overrides + API now; the settings SCREEN later (backlog). The exercise review screen
  (patterns + families) now.
- The experience question: yes, optional, on the frequency step.
- One AI call for analysis + split options + the plan of option 1; a plan for another split on demand.
- A manual path too: "+ Add workout" with a workout type (or Free); changing a workout's type re-matches its exercises.

```
Implement PRD §8 "AI-assisted plan builder v2": turn the Phase 12 single AI draft into a guided, coach-controlled flow.

1. Analysis & split recommendation: when "trainee.onboarded" fires (and on demand), the AI analyzes her answers and
   recommends a weekly split (Full body, Upper / Lower, Push / Pull / Legs, ABC, …) with its reasoning (days per week,
   experience, goals, recovery flags, equipment). When more than one split fits, it returns 2–3 options with pros / cons.
   Splits come from the config (item 3) by id — the model never invents one. Stored with the AiRecommendation pipeline
   (structured output → validation in code → retry). The coach sees it as a "Training summary" in the trainee's Plans
   tab (dashboard).
   Experience: onboarding has no experience question yet (PRD §14 backlog) — ask me whether to add it first or to keep
   beginner + intermediate only, as Phase 12.
2. The coach chooses the path:
   a. Accept the full AI plan as-is → an editable draft in the plan builder (as Phase 12 "Use in a new plan").
   b. Accept only the split → a new plan with one empty workout per split day, built from the split templates (item 3);
      she fills the slots herself (item 4).
   c. Regenerate, or pick a different split (one of the options or any split in the config) and regenerate for it.
3. Split templates with exercise slots: each workout type has a template of slots by muscle group / movement pattern,
   e.g. Full body: legs, back, chest, shoulders, core · Lower: squat / leg press, hip hinge, glutes, hamstrings, calves ·
   Upper / Push / Pull: matching slots. Splits, workout types, slots and their match rules live in ONE config
   (defaults in code + per-coach overrides, like nutrition.config.ts + NutritionSettings) the coach can edit later in a
   dashboard settings screen. A slot keeps its id on the plan exercise, so the picker and the AI know what it is for.
4. Slot-filtered exercise picker (plan builder): each slot offers only exercises that match it — muscle group /
   movement pattern, equipment she has (the Phase 12 equipment map), level — with search (typo-tolerant, the shared
   textSearch), "Recently used" and keyboard use, like the nutrition FoodPicker. A lower-body workout offers only
   lower-body exercises, and so on; "show all" stays available to the coach. The AI may pre-fill each slot with a
   suggestion (from the filtered candidates only) that the coach accepts or swaps in one click.
5. Exercise library tagging: map every imported exercise to slot categories (muscle group + movement pattern), derived
   in code from the factual fields only (body part, primary muscles, equipment, level, type — no copied Kaggle text),
   stored on the Exercise; a script lists unclear / unmapped ones for the coach to review, and the coach can change an
   exercise's slot categories in the dashboard.
6. Rules: the AI never sets weights or notes (as Phase 12); its "why" stays coach-only; everything it returns is checked
   in code (split ids from the config, exercise ids from the slot's filtered candidates, the plan publish rules); the
   trainee sees nothing until the coach publishes. No mobile UI (coach mode keeps its light actions).
7. Tests: split recommendation validation (unknown split, 2–3 options), the slot filter (muscle / pattern / equipment /
   level), the tagging rules, the three coach paths, the pre-fill only from allowed candidates, and that nothing reaches
   the trainee before publish. The LLM is mocked in tests.
```

---

## Phase 16 (later, not scheduled) — Coach Community

Owner vision (2026-10-11): each coach's trainees are her **community**, and the product grows toward a social network
per coach. **Not scheduled — nothing is built and no order is decided.** Details in PRD §15. Split into 16a (coach
profile & feed) and 16b (community branding, after 16a). Before either one starts, the PRD §15.4 open questions are
answered by the owner — never guessed.

Rules for every phase built BEFORE this one (PRD §15.3), so current work does not block it:

- Every trainee-facing entity stays scoped by `coachId` (directly or through `User.coachId`).
- Assume multiple coaches can exist — never rely on a single global coach in a query, config value or screen.
- Media uses private storage with signed URLs, like Daily Pump (`features/privatePhotos`).
- Theming must be possible at runtime through tokens / CSS variables: design values only from `packages/tokens`,
  never hard-coded in a component, an inline SVG or an image.

### Phase 16a — Coach profile & feed (later, not scheduled)

```
Implement PRD §15.1 "Coach profile & feed". Propose the schema, the API and the screens first, and ask me the
PRD §15.4 open questions that touch this step before writing code.

1. Coach profile: profile photo, cover image and bio. The coach edits them; her trainees see them in the mobile app.
2. Feed: the coach publishes posts — text only, images only, or text + images.
3. Visibility: all of the coach's trainees (her community), inside the mobile app. A trainee reads only her own
   coach's profile and posts; every read is checked on the server by coachId.
4. Media: profile photo, cover and post images go through the private-photo flow (features/privatePhotos:
   authenticated upload, only the asset id stored, expiring links made per request). No public URLs.
5. All texts in the copy folders (he + en); the coach's own content is shown as written, never translated.
6. Tests: a trainee cannot read another coach's profile or posts; a trainee cannot post; image links expire;
   the three post kinds.
```

### Phase 16b — Community branding (later, not scheduled — after 16a)

```
Implement PRD §15.2 "Community branding". Propose the schema, the theme model and how the app applies it first.

1. Each coach defines her community: name, color / theme, vision statement and cover.
2. The trainee app reflects it: the theme is applied at runtime by overriding the design-token CSS variables
   (packages/tokens) — no rebuild, no per-coach CSS files. Ask me what stays Sistem's own (logo, cuts, fonts)
   and whether the color is free or picked from a fixed set of themes.
3. Any coach color must meet the PRD §12 contrast rules (derive or validate the deep / soft shades).
4. First step of this phase: audit both apps for hard-coded colors and other values that would not follow a theme.
```

---

## Backlog (not scheduled)

- **Training settings screen** — the coach edits her splits, workout types and slots (add / remove / reorder slots, patterns per slot, which splits are offered) in the dashboard. The config, the per-coach overrides (`TrainingSettings`) and the API (`GET /api/coach/training/config`, `PUT /api/coach/training/settings`) exist since Phase 12b; only the screen is missing.

- **Password reset** — not in the MVP. The ATLAS forgot/reset-password flow (server routes + Resend email + client pages) exists; before enabling it in the app it needs a deep link / universal link or a small web reset page, and a Sistem email sender.
- **Write original exercise descriptions** — AI draft reviewed and approved by the coach. Until then, the coach's per-exercise notes in the plan builder are the instructions trainees see.
- **Multiple coaches at once** — the model, API and authorization support it since accounts & relationships (Coaching per coach, `MULTI_COACH_ENABLED`); the trainee UI that groups workouts by coach / discipline is not planned yet (see docs/phase-reports/accounts-relationships.md).
- **Community follow-ups** — everything in PRD §15.4 (open questions) that is left out of Phase 16: trainee reactions / comments / posts, moderation, new-post notifications.

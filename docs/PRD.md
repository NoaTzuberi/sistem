# Sistem — Product Requirements Document

> Status: Draft v0.1 · Source codebase: fork of ATLAS (React + Vite + TypeScript, Node.js + Express, MongoDB)

## 1. Overview

Sistem is a mobile coaching app that connects a personal coach with her trainees. A trainee signs up, completes an onboarding questionnaire, and within 48 hours receives a personalized weekly training plan built by the coach. The trainee then follows workouts in the app, logs sets/reps/weights, submits a post-workout summary with a "Daily Pump" photo, tracks body progress, and earns achievements.

Sistem is an **app, not a website**. There is no marketing homepage. The app opens directly into authentication.

### 1.1 Terminology

To avoid confusion in code and docs, use these names consistently:

| Term | Meaning |
|---|---|
| **Coach** | The trainer who owns the business. Admin role. (The product owner's client.) |
| **Trainee** | An end user who trains with the coach. |
| **Plan** | A weekly training program assigned by the coach to one trainee. |
| **Workout** | A single training session inside a plan (e.g. "Monday — Lower Body"). |
| **Exercise** | An entry from the exercise library (reused from ATLAS). |
| **Workout Log** | A trainee's actual performance of a workout: sets, reps, weights, summary, photo. |

## 2. Goals

1. Get a new trainee from install to "plan requested" in a single, frictionless flow.
2. Give the coach one place to see every trainee's data and build personalized weekly plans.
3. Make training in the app feel rewarding: clear instructions, fast logging, visible progress, achievements.
4. Lay foundations for AI-assisted plan recommendations and nutrition plans (later phases).
5. Long term (not scheduled): each coach's trainees become her **community** — a coach profile and feed, then her own community branding (§15).

## 3. Roles & Access

| Role | Can do |
|---|---|
| Trainee | Sign up / log in, complete onboarding, view own plans & workouts, log workouts, upload photos, track body metrics, view achievements. |
| Coach | Uses the web dashboard (full) and coach mode in the mobile app (on the go) to: view all trainees and their onboarding data, receive new-trainee notifications, build workouts and weekly plans, assign/publish plans per trainee, view trainee logs, photos and body metrics. |

- Authentication: **JWT, reused from ATLAS** as-is. `User.roles` = `admin` | `coach` | `trainee` (an array — one person may hold several; accounts & relationships, 2026-10-22).
- Coach accounts are never created via public sign-up. The platform **admin** creates them in the dashboard (name + email → a one-time "set password" link), and can suspend / reactivate them.
- **Accounts & relationships (owner, 2026-10-22).** A trainee joins a coach through the coach's invite link (`/join/<code>`: permanent link + QR, or a personal single-use link) → sign-up → onboarding → waiting. Sign-up without a link is allowed: after onboarding she enters a coach code ("no coach yet"). The trainee ↔ coach relationship is a **Coaching** (waiting / active / ended); coach-owned data (plans, workouts incl. cardio, nutrition, logs, coach notes, AI drafts) belongs to one coaching, trainee-owned data (questionnaire, body, photos, profile) to the trainee and is visible to every coach with a live coaching. One live coaching per trainee for now (`MULTI_COACH_ENABLED`, off); the model supports several (e.g. pilates + gym). Each coach has a primary **community**; membership never grants private access. Details: docs/phase-reports/accounts-relationships.md.
- All API routes enforce role-based authorization server-side. A trainee can only ever read/write their own data.

### Social sign-in — Google + Apple (later — Phase 5c, after Phase 5b)

- Trainees can sign up / log in with **Google** or **Apple** in addition to email + password. Apple's App Store rules require Sign in with Apple whenever Google sign-in is offered, so both ship together.
- **Mobile app**: native flows via Capacitor (the Google Sign-In and Sign in with Apple native sheets). **Coach dashboard**: web OAuth if wanted (Google only is fine on the web).
- **Server**: verifies the provider's ID token, then finds or creates the user and issues the same JWT session as email login.
- **Data model**: the password becomes optional; `User.authProviders [{ provider: 'google' | 'apple', providerUserId, email, linkedAt }]`.
- **Linking**: a provider is linked to an existing account only when the provider's email is verified and matches; otherwise a new account is created. Apple "Hide my email" relay addresses are stored as given.
- The name is prefilled from the provider when available; onboarding continues as usual.
- Coaches are never created through social sign-in (same rule as email sign-up).
- **Requirements**: an Apple Developer account, a Google Cloud OAuth client (iOS, Android, web), and a published privacy policy URL for Google's OAuth consent screen (ties to the legal item in §14).
- **Design note**: the login and sign-up screens are designed now with "Continue with Google" and "Continue with Apple" buttons, shown disabled or hidden by a feature flag until this phase.

## 4. Core User Flows

### 4.1 First launch (Trainee)

1. App opens → **Sign Up / Log In** screen (no homepage).
2. After sign-up, the trainee is routed directly into the **Onboarding Questionnaire** (same questions and logic as ATLAS onboarding).
3. On completion → **"Your Plan Is Being Built" screen**:
   - Playful, polished design with 3D-style gym & sports icons.
   - A **48-hour countdown** timer computed from `onboardingCompletedAt` on the server (not device time).
   - Message: the trainee's personalized workouts will be ready within 48 hours.
   - If the coach publishes the plan before the timer ends, the trainee receives a push notification ("Your plan is ready") and the app moves straight to Home — immediately if the app is open, or on the next open / notification tap.
4. At the same moment, the **coach receives a push notification** on her phone: "New trainee: {name}", deep-linking to that trainee's profile with full onboarding answers.

### 4.2 Routing rules (Trainee)

| State | Lands on |
|---|---|
| Not authenticated | Sign Up / Log In |
| Authenticated, onboarding incomplete | Onboarding (resumes where left off) |
| Onboarding complete, no published plan | 48h Waiting screen |
| Has a published plan | Home |

### 4.3 Coach flow

1. Receives push notification for a new trainee.
2. Opens trainee profile → reviews onboarding answers.
3. Builds a weekly plan: workouts → exercises (from the exercise library) with sets, reps, target weight, rest, notes.
4. Publishes the plan → trainee gets a push notification "Your plan is ready" and the app moves to Home.
5. Updates / creates the next week's plan on an ongoing basis. Plans can be duplicated from a previous week or from a template.

## 5. Trainee App — Screens

Bottom tab navigation: **Home · Workouts · Profile** (Nutrition added later).

### 5.1 Home
- **This week's upcoming workouts**, in order, with status (upcoming / done / missed).
- A clear "Start next workout" call to action.
- **Recent achievements** strip (see §7).
- Current streak.

### 5.2 Workout (active session)
- List of exercises in the workout. For each exercise:
  - Name and media (image/GIF/video) if available from the exercise library.
  - Target **sets × reps × weight** and rest time.
  - The **coach's notes** for this exercise — these are the instructions the trainee sees. (Library descriptions are not shown for now; original exercise descriptions are a backlog item — see §14.)
  - Per-set logging: actual reps and weight, mark set complete.
  - Optional rest timer between sets.
- Progress through the workout is saved continuously so the session survives app close.
- "Finish workout" → Workout Summary.

### 5.3 Workout Summary
- Auto-generated stats: duration, total volume, sets completed, personal records hit.
- "How was it?" — rating (e.g. 1–5 or emoji scale) + free-text notes.
- **"Daily Pump" photo upload** (camera or gallery).
- Any achievements unlocked by this workout are revealed here.
- Saved as a Workout Log, visible to the coach.

### 5.4 Workouts
- All of the trainee's workouts: current week, past weeks (history), and completed logs.
- Tap a past log to see what was performed, the summary, and the Daily Pump photo.

### 5.5 Profile
- Personal details and onboarding answers (editable where it makes sense).
- **Body weight tracking**: log entries over time + chart.
- **Body measurements** (circumferences): e.g. chest, waist, hips, arms, thighs — logged over time.
- **Progress photos**: dated gallery (front / side / back).
- Settings, notifications, log out.

### 5.6 Nutrition (later phase — Phase 13a / 13b / 13c)

Source (owner decision, 2026-10-08 — the ONLY source): the coach's md food lists in `docs/reference/` — `150-dairy.md`, `protien.md`, `carbohydrates_and_fruits_guide_120_calories.md`, `fats_spreads_nuts_90_calories.md`, `snacks.md` — and the review lists `docs/reference/nutrition-guide-issues.md` and `nutrition-diet-tags-review.md`. `docs/reference/` is the coach's own content: local only, gitignored. (An earlier PDF menu is no longer used for anything.)

**Method — exchange lists ("portions").** Food is grouped, and every group has a calorie cap per portion:

| Group | Cap per portion | Notes |
|---|---|---|
| Protein | ≤ 150 kcal | e.g. 150 g cottage 5%, 2 L eggs, 130 g chicken breast |
| Carb | ≤ 120 kcal | e.g. 30 g dry oats, 3 slices light bread, 1 medium banana |
| Fat | ≤ 90 kcal | e.g. 2 tsp olive oil, ¼ large avocado, 10 almonds |
| Vegetable | free | not counted |

A meal is defined as **a number of portions per group** (halves allowed, e.g. 1.5 protein). Any portion can be swapped for any other item **from the same group**. Meal calories are computed from the portions × the group value (1 protein + 1 carb + 1 fat = 360 kcal), never from individual foods.

**Food list (coach).** Food items: group (protein / carb / fat / vegetable), name, portion description (e.g. "3 slices", "1 heaping tsp"), grams (optional — eggs, slices and spoons have none), kcal per portion (optional; the lists give only the group caps, so it is empty unless the coach fills it, and it may never exceed the group cap), an optional "new" tag, and diet tags (what it contains — e.g. meat, poultry, fish, dairy, eggs, gluten, peanuts, tree nuts, sesame, soy — so the list can be filtered by her nutrition preferences). Seeded from the coach's md lists (219 items, names and amounts as written; open points are listed for the coach in the issues file); the coach edits and adds, and reviews the seeded tags. No vegetable items are invented. Items used by a plan are archived, never deleted.

**Nutrition preferences (new onboarding step, Phase 13a).** A "Nutrition preferences" step (placeholder copy until the owner sends wording): diet type (none / vegetarian / vegan / pescatarian), kosher (yes / no), allergies and intolerances (a common list + free text), foods she dislikes (free text). Stored in OnboardingResponse with the other answers. Allergies are health data and get the same privacy as the rest of onboarding (her own and her coach's eyes only). The coach sees them in the trainee profile and in the nutrition builder (with a warning when an option uses an item that conflicts with them).

**Nutrition plan (coach, dashboard).** One current plan per trainee (not weekly), built in the dashboard:
- **Calorie target**: the server suggests an estimate — BMR (Mifflin-St Jeor, from her latest weight, height, age from birth date, and sex) × an activity factor from her training frequency, then a goal adjustment (deficit / surplus %). The coach approves the suggestion or overrides it. The inputs used are shown next to the number.
  - Goal mapping (onboarding goals, which stay unchanged): "lose weight" → fat-loss deficit; "build muscle" without "lose weight" → small surplus (muscle gain); anything else → small deficit (toning / recomp). Maintenance (0%) is available to the coach.
  - All percentages (fat-loss deficit, toning / recomp small deficit, muscle-gain small surplus, maintenance 0), the activity factors and the floor live in **one config the coach can tune**.
  - Sex "other" or missing: **no automatic estimate** — the coach picks the formula (male / female constants) or types the target.
- **Safety floor**: a target below **1,200 kcal** needs an explicit coach confirmation (stored with the plan).
- **Meals**: an editable list (default: breakfast, lunch, snack, dinner), each with portions per group (steps of 0.5), vegetables free, kcal per meal computed; the day total is shown against the target.
- **Meal options**: each meal has options (e.g. "Option A / Option B") — lines that point to food-list items with a portion count, or free text (e.g. "cut vegetables — free").
- **Coach tips**: free notes on the plan (e.g. a protein tip, the swap rule).
- **Templates**: the coach saves a plan as a template, starts a trainee's plan from one and adjusts it. No template is seeded (the md lists have none).
- Draft → publish. Editing a published plan and publishing again creates a new version; the trainee always sees the latest published version.

**Trainee — Nutrition tab.** Her meals for the day, each with its portions per group (e.g. "1 protein · 1 carb · 1 fat · vegetables free"), the coach's options and tips. Tapping a portion opens **all swaps from that group** (name, portion description, grams, "new" tag). Portions are the focus: calorie numbers are not on the trainee screens.

**Coach mode (mobile).** Read-only view of a trainee's nutrition plan (Trainee detail → Nutrition). Building and editing happen on the web dashboard.

**Notifications.** The trainee is notified when a nutrition plan is published and when a published plan is updated (tap → Nutrition tab).

**Planned, closed behind feature flags (13b).** Data model designed in 13a, UI hidden:
- Recipes and menu suggestions built by the coach (ingredients mapped to food items and portions).
- Meal logging: the trainee marks the portions eaten per meal. *(Opened in Phase 13a+ as simple per-day portion tracking — see the 13a+ decisions below.)*
- Water tracking: daily goal and quick-add.

**AI nutrition draft (13c — uses the Phase 12 AI infrastructure).** Same rule as §8: nothing AI-generated reaches the trainee without the coach publishing it.
- Runs when onboarding completes and on demand from the coach.
- The calorie target is computed **in code, never by the model** (the same calculation as the suggestion above; percentages in one coach-tunable config; same 1,200 kcal floor).
- The model only chooses the meal structure (portions per group per meal) and the meal options, using **only** the coach's food list (sent as ids), plus a short rationale for the coach.
- Her nutrition preferences are respected **in code first**: the food list is filtered (diet type, allergies, kosher) before it is sent to the model; kosher also means no meat and dairy in the same option (checked on the output). Dislikes are free text: sent to the model and shown to the coach, who reviews.
- Code validates the output (food ids exist, are allowed for her and match their group, every meal complete, portion totals match the target within a tolerance); invalid output is retried, then rejected.
- The coach sees it as an editable draft in the nutrition plan builder, with the rationale.

**Decisions (owner, 2026-10-07).** Goal mapping, sex "other" / missing, and the nutrition preferences step: as above. Open points in the coach's lists are listed in `docs/reference/nutrition-guide-issues.md` for the coach. Food names and all coach content are stored and shown as written (Hebrew) — no auto-translation; the app becomes Hebrew-first in Phase 15 (§11).

**Decisions (owner, 2026-10-08 — Phase 13a).**
- The seed data lives in `apps/server/data/nutrition/food-lists.json` (gitignored, generated once from the coach's md lists) and is loaded by `npm run seed:nutrition`; committed code holds no coach content, tests use a fake fixture. *(Updated 2026-10-08: the md lists replaced the earlier PDF as the only source.)*
- Default numbers (starting points, all coach-tunable): fat loss −20%, toning / recomp −10%, muscle gain +10%, maintenance 0; activity factor by training days (the rounded middle of her min–max answer): 1–2 → 1.375, 3–4 → 1.55, 5–6 → 1.725, 7 → 1.9; floor 1,200.
- `vegetablesFree` per meal: the coach sets it per meal (a new plan's default meals have it off).
- Allergy list: the 8 allergens that have a diet tag (dairy / lactose, eggs, gluten, peanuts, tree nuts, sesame, soy, fish); everything else is free text.
- No trainee inbox. Instead an **"unseen update" dot** on the trainee's tab bar: Nutrition when a new nutrition version was published since she last opened the tab, Workouts when a training plan was published or a published one changed. "Last seen" is stored on the server (works across devices). The stored notifications stay for Phase 5b push.
- The proposed diet tags of the seeded items are a starting point for the coach to review.

**Decisions (owner, 2026-10-08 — Phase 13a+, extensions before 13c).** These refine the 13a text above where they differ.
- **One onboarding step "Nutrition & goal"** (step id `nutrition_preferences` — onboarding still grows by one step only, no new step ids). Accordion sections on one screen: "My goal" (only when her goals include lose weight or build muscle; open by default when shown), "How I eat", "Intolerances & allergies" (collapsed by default, each shows a short summary when collapsed). Mostly chips; a details text field (≤ 300 chars) appears only under a selected item; "Other" needs its text. The whole step is optional (one Skip), saved per step and resumable. Placeholder copy.
- **Nutrition preferences (v2)**: diet type (none / vegetarian / vegan / pescatarian — one of them) + diet styles (keto / low-carb, intermittent fasting, other — combinable); religious (kosher, halal); intolerances / medical (lactose-free, gluten-free, celiac, low-FODMAP, other); allergies (dairy, eggs, peanuts, tree nuts, sesame, soy, gluten / wheat, fish, shellfish, other); a details text per selected item; foods she loves, foods she dislikes; preferred meals per day (2–6 or no preference — information for the coach and 13c only; new plans still start with 4 meals). Answers saved before v2 are mapped on read.
- **Diet tags** added: shellfish, pork, lactose, alcohol, high_fodmap. Rules out: vegetarian → meat, poultry, fish, shellfish; pescatarian → meat, poultry; vegan → also dairy, eggs; kosher → pork, shellfish (+ no meat and dairy in one option); halal → pork, alcohol (halal slaughter is not checkable — the coach reads the details); lactose-free → lactose; gluten-free / celiac → gluten; low-FODMAP → high_fodmap (works once the coach tags items); each allergy → its tag (gluten / wheat → gluten). Keto / low-carb → a warning when the plan has more carb portions per day than the config allows (default 1). Intermittent fasting, meals per day, loves / dislikes and every "other" are text for the coach (and 13c). The seeded dairy items carry `lactose`; the coach removes it where it doesn't apply (hard cheeses, butter).
- **Weight goal** (in the "My goal" section): target weight (her unit, stored in kg, 20–400) and a timeframe (weeks 1–104, or a target date ≤ 2 years ahead).
- **Calorie calculation** (the owner's method; pure server code, never the AI; every number in the coach-tunable config):
  - BMR Mifflin-St Jeor (unchanged) × activity factor by training days: 1–2 → 1.375, 3–5 → 1.55, 6–7 → 1.725 (sedentary 1.2 only by the coach's choice — onboarding has no "0 days"). Replaces the 13a table (5 days was 1.725, 7 days 1.9).
  - Goal %: fat loss −20% (moderate), **fat loss aggressive −25%** (new, coach-selected only), recomp −10%, muscle gain +10%, maintenance 0.
  - Timeline method (target weight + timeframe, goal fat loss / muscle gain): required daily delta = |target − current| × 7,700 kcal/kg ÷ days. Safe maximum for loss = the smallest of 1% of body weight per week, 25% of TDEE, and TDEE − floor; for gain 0.5% of body weight per week. A requested pace above the safe maximum is not followed: the coach sees "Requested pace is unsafe; recommended timeline: N weeks" with the safe numbers (the trainee is not told). Without a timeline the expected timeline is computed from the goal %.
  - The recommendation is **raised to the floor** (1,200) and flagged, never below it; the coach may still type a lower target with the explicit confirmation.
  - Missing data: no weight / height / birth date / frequency → no estimate until the coach fills the value in; sex other / missing → the coach picks the formula; no target or timeframe → goal %; a target in the wrong direction, a passed date or a target within 0.5 kg of her weight → timeline ignored with a note.
  - Recommended portions per group: the kcal split by a tunable share, ÷ the group values, rounded to 0.5 and adjusted to the closest total. The default share (protein 45% / carb 32% / fat 23% / snack 0%) is a **placeholder for the coach to set** (it came from the old PDF menu; owner, 2026-10-08).
- **Calculation summary card** (dashboard builder): her data (weight, height, age, sex, activity, goal, target weight, timeframe), BMR, TDEE, the deficit / surplus, the safe weekly rate and expected timeline, the recommended kcal and portions per group. The coach can override every input (stored on the plan), the target and the meals' portions.
- **Trainee day header**: daily totals per group ("4 protein · 4 carbs · 4 fat · vegetables free"), each a button that opens that group's swap list. No calorie numbers.
- **Coach intro message**: a plain-text paragraph (≤ 1,500 chars, line breaks kept) on the nutrition plan, saved with each published version, shown at the top of the trainee's Nutrition tab — open while that version is unseen, collapsed after (collapsible either way).
- **Portion tracking (the meal-logging part of 13b, opened now in a simple form; the `mealLogging` flag is removed — recipes and water stay behind their flags)**:
  - The day header is the tracker: per group one circle per planned daily portion (a planned half = a half circle). Tap = one portion marked, tap a filled one = undo; a "½" button per group adds / takes back half a portion. Never more than planned. She never says what she ate or when.
  - Today and the previous 6 days (her zone) can be viewed and corrected; older / future days are refused by the server. A past day uses the plan version live that day; today follows the newest version.
  - Offline like the workout session: every tap goes into a phone cache, then a debounced full-day save (last write wins), retried on reconnect / foreground.
  - Optional meal photo per meal per day ("show off your meal"): private, the same privatePhotos flow as Daily Pump (authenticated asset, 1-hour signed links), visible only to her and her coach, with the line "Visible only to you and your coach". Needs a connection.
  - Coach: per trainee a weekly adherence view (Sunday weeks; per day and group "marked / planned", week totals, meal photos) in the dashboard and read-only in coach mode. No judgment wording, no percentages, no calories; only neutral token colors.
  - MealLog is one document per trainee + day (planned day totals snapshot, eaten per group, planId / version, photos per meal with the meal name snapshot) — replaces the per-meal 13a design.
- **The coach's md food lists are the ONLY source (owner, 2026-10-08)** — dairy (150), protein incl. fish & seafood, poultry, meat and vegetarian substitutes (150), carbs & fruits (120), fats / spreads / nuts (90), snacks — 219 items seeded from `apps/server/data/nutrition/food-lists.json` (gitignored; committed code holds no coach content). The PDF-derived items and the "1,500" template were removed; the dev database was reset and reseeded (`npm run reset:nutrition`, DEV ONLY). Open points are listed for the coach in `docs/reference/nutrition-guide-issues.md`; tags in `docs/reference/nutrition-diet-tags-review.md`. Re-running the seed adds only missing items.
  - Dairy goes into the Protein group, except 8 low-protein items (sour cream 9%, oat milk, almond milk, labaneh, Hemed, Greek yogurt 7–10%, cow's milk 3%, plain yogurt 3%): seeded **archived** (not in the builder or swap lists) until the coach decides their group (carb / fat / snack / remove).
  - **Food categories** (owner, 2026-10-08): every item has a category of its group (protein: dairy, poultry, meat, fish & seafood, eggs, plant-based, supplements · carb: grains & cereals, bread & crackers, fruits, legumes, starchy vegetables · fat: oils, nuts & seeds, spreads, other · snack: sweet cereals, chocolate, cookies & pastries, ice cream & popsicles, candy, salty, fast food & frozen), derived from the md section headings; labels are placeholders; the coach changes it in the food list. The builder's "+ Food item" picker opens on the group the option still needs, with group tabs, category chips, a typo-tolerant search inside the selection, her recently used items (≤ 8 per group, across her plans) and keyboard use; archived items never appear. The food list filters by group and category.
  - **New group "Snack"** (treats): 150 kcal per portion (tunable in Settings), default portion share **0%** — the calculation never adds snack portions; only the coach adds them to a meal. Everywhere a group appears: food list, plan builder (a 4th portion stepper), kcal, the trainee's day header / tracker (a snack row only when planned), its own swap list, the coach's tracking. Keto / low-carb counts carb + snack portions. Data saved before snacks existed reads as 0 snack.

**Decisions (owner, 2026-10-08 — Phase 13c, AI nutrition draft).**
- Sent to the model (Gemini free tier, dev only — the same rule as §8 and §14): her age in years, rounded height / weight (the calculation's), sex, goal ids, training days, her weight goal (target rounded to 0.5 kg + weeks left), her restriction answers as option ids, meals per day, and her own words (details under each answer, "other" texts, foods she loves / dislikes) cleaned like Phase 12 (emails / phones removed, ≤ 500 chars). Never her name, email, ids, birth date, photos, logs or body history.
- The coach's food items (name and portion description as written, group, category, diet tags) are sent under aliases — owner-approved for the free tier, dev only; moves to the paid tier before launch with the rest.
- Every number is computed in code (the 13a+ calculation with the coach's goal / formula / overrides from her working copy; her own typed target when she set one) and the model is told it is final. The model returns only the meal structure (portions per group per meal), 1–3 options per meal (food alias + portions), a summary of her for the coach, points to check, and a coach-only "why" per meal / option. Meal names (from her meals-per-day answer, else the builder's 4) and option labels are set in code (placeholders).
- Validation: the daily portions per group must match the computed ones **exactly**; every option adds up to its meal; no snack portions unless the calculation gave some; only foods that were sent (active, hers, allowed by her tags), re-checked against the list after the reply; kosher = no meat / poultry + dairy in one option; plus the builder's own publish rules. Invalid → sent back (3 attempts) → failed. A missing calculation or a group left empty by her restrictions → no model call; the coach is told why.
- The coach sees the draft in the nutrition builder (summary, "check by hand — not checked by code" with her own words, points to check, the rationale and what was sent) and loads it into the editable working copy (`NutritionPlan.aiRecommendationId`, coach-only). Only her publish reaches the trainee.

**Decisions (owner, 2026-10-20 — plan mode and the builder's target).**
- **Daily protein goal (owner, 2026-10-28)**: in portions mode the coach may set an optional daily protein goal in whole grams (1–400, `proteinGramsTarget` on the plan and each version; counts as a change). The trainee sees "~X g protein a day" under the protein row with an (i) sheet. There is no computed value: the food data has no protein per portion (the coach's md lists have per-item protein grams that were never imported — open decision). No goal = nothing shown.
- **Workout names (owner, 2026-10-28)**: every workout's name (`title`) is edited inline in the builder — at most 40 characters, saved on blur / Enter, Esc cancels, empty = the default name; a new workout's name field takes the focus. The letter (A, B, C …) marks the tab and card; the name is the title everywhere in the trainee app.
- **Plan mode — "what she gets"**: a nutrition plan is either **portions only** (she gets a number of portions per group per day and picks what to eat from the coach's food lists) or a **full menu** (meals with options, as above). The mode, the daily portions and a day-level "vegetables free" switch are stored on the plan and each version, next to the meals: switching never deletes the meals or the daily portions. New plans start in portions mode; a plan saved before modes reads as a menu when an option has lines, else as portions with its meals summed. In portions mode the trainee gets no meals (her tracker counts the daily portions); the version keeps the meals for the meal-photo slots. Publishing in portions mode needs a target and some daily portions; the meal and option rules apply in menu mode only. Applying a template or an AI draft makes the plan a menu.
- **The daily target starts as the recommendation** (marked "as suggested"; the coach changes it or returns to it with one press), so the portion budget works from the start. Publishing is still her explicit action.
- **Daily portions start from the calculation's split**; snack stays 0 (as in 13a+ — only the coach adds snack portions).

**Decisions — food bank (owner, 2026-10-28).** The food list is one app-wide **food bank** (system items, no
coach) + each coach's own items. Every coach (a new one too) and every trainee sees the bank at once. A coach
never changes a system item: editing one saves her own copy (copy-on-write, `basedOn`), which replaces it in her
lists and plans; "restore to original" deletes the copy. She can hide a system item from her lists (unhide from
the "hidden" filter). Her trainees see her merged lists; a trainee without a coach sees the bank. Only the admin
adds, edits and removes system items (admin page, "Food bank"). The coach's seeded list became the bank in place
(`migrate:food-bank`, same ids); `seed:nutrition` fills the bank of a fresh database (no coach needed).

## 6. Coach Admin — Screens

**Decision:** the coach has **both**:
- **Web dashboard** (desktop-first, responsive) — the main workspace for heavy work: plan building, templates, and later AI recommendations and nutrition.
- **Coach mode in the mobile app** — same app, role-based UI when she logs in with role=coach. For on-the-go work: push notifications and an in-app notifications inbox, trainees list, trainee detail (onboarding answers, logs, Daily Pump photos, body metrics), and light actions (e.g. publish a ready draft plan, duplicate last week and publish). Full plan editing happens on the web.

Both use the same backend, auth and data. Tapping a "new trainee" push opens that trainee in the app's coach mode.

- **Trainees list**: search, filter by status (new / waiting for plan / active / inactive), time remaining on the 48h window, last activity.
- **Trainee detail**: onboarding answers, current & past plans, workout logs with summaries and Daily Pump photos, body weight / measurements / progress photos, achievements.
- **Plan builder**: create a weekly plan from scratch, from a template, or by duplicating a previous week. Add workouts → add exercises from library → set sets, reps, weight, rest, notes. Save as draft or publish.
- **Templates**: reusable workouts and plans.
- **Notifications**: new trainee, workout completed (optional), plan due soon.
- *(Later)* **AI recommendation panel** inside the plan builder (see §8).
- *(Later)* **Nutrition builder** — food list, per-trainee nutrition plans, templates, AI draft (see §5.6).

## 7. Achievements & Streaks

Achievements are computed server-side from workout logs and body metrics, and shown on Home and in the Workout Summary.

Initial set (extensible, data-driven definitions):
- First workout completed
- 5 / 10 / 25 / 50 / 100 workouts completed
- New personal record (heaviest weight on an exercise)
- Rep milestone (e.g. most reps at a given weight)
- Total volume milestones
- Streaks: consecutive weeks where all planned workouts were completed (and/or consecutive training days)
- First Daily Pump photo, first body-measurement entry

No achievements are based on body weight gain or loss — trainees have different goals and weight-based rewards can be harmful.

## 8. AI Plan Recommendation (later phase)

- When a trainee completes onboarding, an AI job analyzes the answers and generates a **draft plan recommendation** for the coach.
- Grounded in the ATLAS **exercise library** (RAG), so it only suggests exercises that exist in the library.
- Output is a structured draft (workouts, exercises, sets/reps, rationale) that pre-fills the plan builder. **The coach always reviews and edits before publishing.** Nothing AI-generated reaches a trainee directly.
- **Built in Phase 12 (owner decisions, 2026-10-07):** provider = Google Gemini API, **free tier, dev only** (default `gemini-3.8-flash`, fallback `gemini-3.5-flash-lite`, switchable via `AI_MODEL` / `AI_FALLBACK_MODEL`), behind one provider client so a paid provider is a contained change. Sent to the model: her onboarding answers by option id, age in years (not the birth date), rounded height / weight, her three free-text answers trimmed to 500 characters with emails and phone numbers removed — never her name, email, ids, photos, logs or body history. The AI never sets weights and never writes the exercise notes (those are what the trainee sees); its "why" per exercise is coach-only. Only beginner and intermediate exercises are offered (no experience question in onboarding yet). The AI is off in production until a paid tier is configured (see §14).

### AI-assisted plan builder v2 (later — Phase 12b, after Phase 15)

Owner request (2026-10-08), planned for later: turn the Phase 12 single AI draft into a guided, coach-controlled flow.
- **Training summary & split recommendation**: after onboarding, the AI analyzes her answers and recommends a weekly split (Full body, Upper / Lower, Push / Pull / Legs, ABC, …) with reasoning (days per week, experience, goals, recovery flags, equipment). When more than one split fits, it shows 2–3 options with pros and cons. The coach sees this as a "Training summary" for the trainee.
- **The coach chooses the path**: accept the full AI plan as-is (an editable draft, as today); accept only the split and build the workouts herself from the split templates; or regenerate — also for a different split she picks.
- **Split templates with exercise slots**: each workout type has a template of slots by muscle group / movement pattern (e.g. Full body: legs, back, chest, shoulders, core · Lower: squat / press, hip hinge, glutes, hamstrings, calves · Upper / Push / Pull: matching slots). Templates and slot definitions live in one config the coach can edit later.
- **Slot-filtered exercise picker**: each slot offers only matching exercises (muscle group / movement pattern / the equipment she has / level), with search and "recently used", like the nutrition food picker; a lower-body workout offers only lower-body exercises. The AI can pre-fill each slot with a suggestion the coach swaps in one click.
- **Exercise library tagging**: every exercise is mapped to slot categories (muscle group + movement pattern) from its factual fields only; unclear ones are listed for the coach to review.
- Same rules as Phase 12: nothing AI-generated reaches the trainee without the coach publishing; every AI output is validated against the plan rules; free tier / dev data only until the paid AI tier (§14) is in place. Experience level depends on the §14 onboarding experience-question item.

**Decisions (owner, 2026-10-09 — Phase 12b, built).**
- **Exercise names cleaned**: the dataset's program prefix is removed from the name shown ("30 Arms Hammer Curl" → "Hammer Curl", "30 Day Back …"), and a stray trailing dash; numbers that belong to the name stay ("3/4 Sit-Up", "90/90 …", "6 Way …"). 198 of 2,893 names; ids and slugs unchanged, the original title is kept.
- **Exercise families (equipment variants)**: the same movement with different equipment (barbell / dumbbell / kettlebell / Smith machine / cable / band / machine / EZ-bar / trap bar / plate / bodyweight …) is one family. Grouping = normalized name (source prefixes, equipment words and spelling differences removed) + movement pattern + type — not the body part, which is inconsistent in the dataset; a family keeps all its members' body parts. Every exercise stays its own record with its own id (plans, logs, PRs and "last time" stay per variant — 40 kg barbell ≠ 40 kg dumbbells) and gets a family + variant. One **primary** exercise per family + variant (the coach's own picks first, then the plainest name): only primaries are offered in the picker, the slots and to the AI; the other copies stay for old references and under "Show all" / the family's card. 2,893 exercises → 2,181 families (192 with 2+ variants, 2,481 primaries).
- **Movement patterns** (26: squat, lunge, hinge, glute bridge, glute isolation, hip abduction, hip adduction, hamstring curl, leg extension, calf raise, horizontal / vertical push, chest fly, shoulder raise, rear delts, horizontal / vertical pull, shrug, biceps, triceps, forearms, core, carry, power, conditioning, mobility) are derived in code from the name first, then the body part and the type; stored on the family. No pattern, or a combo of 3+, = unclear.
- **Coach review list** (dashboard → Exercises, and `apps/server/data/processed/`): unclear patterns, the same name with different patterns, ambiguous name matches, and a variant with more than 4 copies (197 families). The coach renames a family, sets its patterns, chooses the primary, merges and splits families; her edits are never overwritten by re-running the grouping. An unchecked unclear family is never offered in a slot or to the AI.
- **Splits (config, coach overrides stored; settings screen later)**: full body (1–4 days), upper / lower (2, 4), upper / lower / full body (3), upper / lower + glute focus (3, 4), push / pull / legs (3, 6), push / pull / legs + upper / lower (5), ABC (3, 6), ABC + glute focus (3, 6). 7 days is planned as 6. **ABC = A chest + back, B legs, C shoulders + arms — a default the coach still confirms.** Workout types: full body, upper, lower, lower – glute focus, push, pull, legs, ABC A / B / C, each with a template of suggested slots (a slot = the patterns that fit it; max 2 exercises guides the AI only). **Slots are suggestions, never rules (owner, 2026-10-28)**: no slot is required; the coach adds, removes (× on an empty one, stored per workout as `hiddenSlotIds`, coach-only), fills and reorders freely, any number of exercises per slot; a workout publishes with ≥ 1 exercise. The old `required` field is kept for old data and no longer read.
- **One AI call**: her summary, how the AI reads her experience, points to check, 1–3 split options from the config (as many as fit her days, at most 3; each with why / pros / cons), and the full plan for option 1 — every exercise fills a slot with a family + a variant she has the equipment and level for. Checked in code: split ids and day counts, the option count, the day pattern of option 1, slot membership, pattern fit, the variant, plus every Phase 12 rule (no required-slot check since 2026-10-28). The coach's paths: use the full plan; use the split only (typed workouts with empty slots, the AI's picks offered per slot); regenerate — also for an option or any split of her config (a split outside her days uses its nearest day count).
- **Manual path**: "+ Add workout" with a workout type (or Free = no slots); changing a workout's type re-matches its exercises to the new slots, the rest go to "Other". Works with or without an AI draft. Workout types, slots and the split are coach-only — the trainee's app never receives them.
- **Experience question** (onboarding, frequency step, optional, placeholder copy): less than 6 months / 6 months–2 years / more than 2 years. Used by the AI (split choice, volume) and for levels: only "more than 2 years" adds advanced exercises (the library has just 13) — otherwise beginner + intermediate as before.
- "Prefers low impact" removes plyometric / Olympic (power) families from the AI's list in code.

## 9. Notifications

| Event | Recipient | Channel |
|---|---|---|
| New trainee completed onboarding | Coach | Push |
| Plan published | Trainee | Push |
| Nutrition plan published / updated | Trainee | Push |
| Workout reminder (scheduled day) | Trainee | Push (configurable) |
| Achievement unlocked | Trainee | In-app (push optional) |

Store device push tokens per user. Fail gracefully when push permission is denied.

## 10. Data Model (initial sketch)

- **User**: name, email, passwordHash (empty until an admin-created coach sets it), roles[], onboardingStatus, onboardingCompletedAt, pushTokens[]
- **CoachProfile**: userId, displayName, slug, status (active / suspended), createdBy · **Coaching**: traineeId, coachId, status (waiting / active / ended), discipline?, startedAt, endedAt · **Community**: coachId, name, slug, visibility, isPrimary · **Membership**: communityId, userId, role, status · **Invite**: code, coachId, type (coaching / community), communityId?, targetEmail?, maxUses?, uses, expiresAt?, revokedAt. Coach-owned records carry `coachingId`.
- **OnboardingResponse**: userId, answers (reuse ATLAS schema; Phase 13a adds nutrition preferences), completedAt
- **Exercise**: reused from ATLAS exercise library
- **Plan**: traineeId, coachId, weekStartDate, status (draft/published), workouts[]
- **Workout** (embedded in Plan or own collection): title, dayOfWeek/order, exercises[{ exerciseId, sets, reps, targetWeight, restSec, notes }]
- **WorkoutLog**: traineeId, planId, workoutId, startedAt, finishedAt, sets[{ exerciseId, setIndex, reps, weight, completed }], rating, notes, pumpPhotoUrl
- **BodyMetric**: traineeId, date, weight?, measurements{...}?, photos[]
- **Achievement**: traineeId, type, value, unlockedAt, sourceLogId
- **Template**: coachId, type (workout/plan), content
- **ExerciseFamily** (Phase 12b): name, body parts, movement patterns, levels, review reasons; Exercise.familyId / variant / isPrimaryVariant. **TrainingSettings**: a coach's overrides of the split / slot config. Plan.splitId, workout.workoutType, exercise.slotId (coach-only).
- **AIRecommendation** (Phase 12): traineeId, coachId, type (training_plan; nutrition_plan in 13c), status, trigger, the input sent, the validated output, attempts. Plan.aiRecommendationId and NutritionPlan.aiRecommendationId (13c) link a plan to the draft it was loaded from (coach-only).
- *(Later, §5.6)* **FoodItem** (coach food list), **NutritionPlan** (calorie target, meals → portions per group, options, tips, versions), nutrition templates; 13b: **Recipe**, **MealLog**, **WaterLog**
- *(Later, §15 — not scheduled, sketch only)* **CoachProfile** (coachId, photo, cover, bio), **Post** (coachId, text?, images[]), community branding (coachId, name, theme, vision statement, cover). All scoped by coachId; images are private assets with signed links.

## 11. Technical Notes & Open Decisions

- **Keep from ATLAS**: auth (JWT), user model, onboarding questionnaire & its schema, exercise library + import pipeline, API structure.
- **Remove from ATLAS**: marketing homepage, hero/scroll video, landing sections, any website-only navigation and SEO pages.
- **App packaging (decided)**: **Capacitor** wrapping the existing React + Vite app. Reuses the codebase and gives native push notifications, camera access and app-store builds.
- **Coach UI (decided)**: a **web dashboard** built in React for full management, plus a **coach mode inside the mobile app** (role-based tabs). All share the backend, auth, API types, API client and design tokens.
- **Coach notifications (decided)**: native push to the coach's phone via the mobile app. No web push needed.
- **Photo storage**: private object storage (e.g. S3 / Cloudinary) with signed URLs. Photos are personal data — never public URLs.
- **Timer source of truth**: always the server timestamp.
- **Offline resilience**: active workout state persisted locally and synced on reconnect.
- **Language (decided, 2026-10-07)**: **Hebrew is the default language** of the mobile app and the dashboard, right-to-left everywhere. English is an option in Settings (per user, stored on the server). Launch is in Israel first; other markets later. Israel defaults: `Asia/Jerusalem`, kg, cm, week starts Sunday. Server-built texts follow the user's language. Coach content (food list, tips, notes) is shown as written — never auto-translated. Built in Phase 15.
  - **Decisions (owner, 2026-10-08 — Phase 15).** Own small i18n helper (no library): typed copy files per feature (`copy/he.ts` + `copy/en.ts`), keys shared by both apps in `@sistem/shared`; plurals via Intl.PluralRules; dates / numbers / weekdays via Intl. Charts keep the time axis left → right in both languages. Hebrew wording: neutral forms for buttons and labels, feminine forms for sentences addressing the user. AI summaries and rationales are written in the coach's language. Fonts are chosen in the design phase: per-language font tokens (`--font-heading-he` / `--font-body-he` / `-en`), Hebrew on a system-font placeholder until then. `packages/tokens` is the single file for every design value of both apps. The logo stays in English exactly as it is — never translated or mirrored. The Hebrew copy is a DRAFT translation for the owner's review.

## 12. Design Direction

The owner leads visual design. These are the ground rules for implementation.

**Design work happens after Phase 15 (Hebrew & RTL)** — the final design is made for the Hebrew, right-to-left app (English is the mirrored variant), not the other way round.

**Feel**: modern, alive, bold. **Sharp cuts** — angled corners and diagonal clip-path shapes rather than soft rounded cards. Pink and white dominate the app.

**Palette** (implement as design tokens / CSS variables, never hard-coded):

| Token | Name | Hex | Use |
|---|---|---|---|
| `--color-primary` | Neon Pink | `#FF006E` | Primary actions, highlights, active states, progress |
| `--color-primary-deep` | Cherry Rose | `#A50047` | Pressed states, pink text on light backgrounds, depth/gradients |
| `--color-bg` | Bright Snow | `#FCFCFC` | App background |
| `--color-surface` | Platinum | `#EEEEEE` | Cards, inputs, sections |
| `--color-border` | Alabaster Grey | `#E2E2E2` | Dividers, borders, disabled |

Accessibility notes:
- Neon Pink on white is ~3.7:1 contrast — fine for large/bold text, icons and buttons, **not** for small body text. Use Cherry Rose (~7.6:1) for small pink text.
- A dark text color token is needed for body copy (e.g. near-black `#111111`).

Design system notes:
- Reuse the ATLAS notch-cutout / bracket button pattern as a basis for the "sharp cuts" language.
- 3D gym & sports icons on the 48h waiting screen (and optionally achievements).
- Motion via GSAP where it adds energy (achievement reveals, countdown, transitions), kept subtle during active workouts.

## 13. Phasing

| Phase | Scope |
|---|---|
| MVP | Auth, onboarding on first launch, 48h waiting screen, coach push notification, coach trainee list + detail, plan builder + publish, trainee Home, Workout, Summary + Daily Pump, Workouts history |
| v1.1 | Profile: body weight, measurements, progress photos; achievements & streaks; templates |
| v1.2 | AI plan recommendation for the coach |
| v1.3 | Nutrition plans |
| Before design work | Hebrew (default) & RTL, English as an option (Phase 15) |
| Later — not scheduled | Coach Community (Phase 16, §15): 16a coach profile & feed · 16b community branding per coach |

## 14. Backlog

- **Original exercise descriptions** — AI draft, reviewed and approved by the coach, because the imported exercise dataset is not cleared for commercial use (facts only). Until then, the coach's per-exercise notes are the instructions trainees see.
- **Coach custom exercises with her own demo video** — the coach can add her own exercises with a demo video she records (hosted on Cloudinary), since the imported library is text-only (facts only, no media).
- **"plan.updated" notification** — when the coach edits an already-published plan, the trainee should be told her plan changed. (Today only the first publish of a plan notifies.)
- **Notification retention / cleanup** — notifications are kept forever for now; decide how long to keep old ones and add a cleanup.
- **Plan builder: last logged performance** — next to each exercise row, show the trainee's last logged performance for that exercise (weight × reps), to support progressive overload. Needs the workout logs from Phase 8.
- **Coach private notes per trainee** — free notes about a trainee (injuries, preferences), visible only to the coach, never to the trainee.
- **Swap an exercise mid-workout** — the trainee can replace an exercise during a session (e.g. the machine is busy) and note the substitution, so the coach sees what was done instead.
- **"+ Add set"** — extra sets beyond the plan during a session (not in Phase 8: the trainee logs what the coach planned).
- **Workout focus / Do Not Disturb** — fewer interruptions during a workout (native parts scheduled in Phase 5b, the web tip in Phase 9):
  - *Android (native)*: when a workout starts, ask "Turn on Do Not Disturb for this workout?". If yes, request Notification Policy Access once, enable DND during the session, and restore the previous mode on finish / discard / leave.
  - *iOS (native)*: apps can't toggle Focus. A one-time in-app guide shows how to create a Shortcuts automation "When Sistem is opened → Set Focus: Fitness".
  - *All platforms*: Sistem's own push notifications are suppressed during an active session and delivered after it ends.
  - *Web (now)*: when starting a workout, a gentle dismissible tip suggests Focus / Do Not Disturb, with a "Don't show again" option. Copy is a placeholder.
- **Delete a trainee's photos with her account** — account deletion must also delete all her photos from Cloudinary (Daily Pump and progress photos), for privacy compliance.
- **"Summary added" notification (optional)** — tell the coach when a trainee adds or changes her workout summary / Daily Pump photo after finishing. Only if the coach wants it.
- **Split the mobile bundle by role** — lazy-load the coach screens (and other role-only code) so a trainee never downloads coach mode, and the other way round. The mobile bundle was 507 kB after Phase 6b, over Vite's 500 kB warning line.
- **lb for workouts** — workout sets, targets and the session's weight steps are kg only. Phase 10 added kg/lb (and cm/in) for body tracking only (owner decision); extend the same unit setting to workout weights.
- **Progress photo slider** — a before/after slider overlay in Compare (Phase 10 compares side by side).
- **REQUIRED BEFORE LAUNCH — AI provider terms.** Switch AI to a paid tier / provider whose terms exclude training on our data before any real trainee data is sent. The Gemini free tier may use submitted data to improve Google's products; until then, the AI only runs on dev / seed data (the server refuses to run it in production unless `AI_PAID_TIER=true`).
- **REQUIRED BEFORE LAUNCH — Legal.** Privacy policy, terms of use and an in-app consent screen covering health-related onboarding answers, body and Daily Pump photos, and processing by an AI provider. Review with a lawyer (Israeli Privacy Protection Law, Amendment 13) before launch.
- **Training settings screen** — the coach edits her splits, workout types and slots in the dashboard (the config, her stored overrides and the API exist since Phase 12b).
- **Confirm ABC with the coach** — the ABC split is a default (A chest + back, B legs, C shoulders + arms); see `docs/reference/abc-split-question.md`.
- **Per-trainee food exceptions** — the coach can allow specific items for a trainee despite a tag rule (e.g. "yogurt OK" for a lactose-intolerant trainee). Allowed items return to her builder list, warnings and the AI food list.
- **Extra portions** — optional neutral "+ extra portion" marking beyond the plan, shown to the coach as a plain number (ask the coach whether she wants it).
- **Before making the repo public** — audit the full git history for secrets, coach content, personal data and seed data; rotate any exposed secret; rewrite history if needed. (The repo is private now; `docs/reference/` is gitignored for this reason.)

## 15. Coach Community (later — Phase 16, not scheduled)

> Status: **vision only — later / not scheduled.** Nothing here is built and no phase is approved. It is written down now so that current work does not block it. Scope, screens and wording are decided with the owner before any of it is built.

Every coach has her own **community**: her trainees. Sistem grows from a coaching tool toward a small social network per coach, in two steps.

### 15.1 Coach profile & feed (Phase 16a)

- **Coach profile**: profile photo, cover image and bio.
- **Feed**: the coach publishes posts. A post is **text only**, **images only**, or **text + images**.
- **Who sees it**: all of the coach's trainees (her community), inside the mobile app. A trainee sees only her own coach's profile and posts — never another coach's.
- The coach is the only author in this step. Anything trainees do with a post (reactions, comments, their own posts) is not part of it — see the open questions.

### 15.2 Community branding (Phase 16b — after 16a)

- Each coach defines her own community: **name**, **color / theme**, **vision statement** and **cover**.
- The trainee app reflects that branding: a trainee sees her coach's community name, colors and cover.
- From here the product grows toward a social network per coach.

### 15.3 Architecture notes (apply to current work, from now on)

These are rules for every phase built before the Community phase, so nothing has to be reworked later.

1. **Everything a trainee sees stays scoped by `coachId`.** Every trainee-facing entity carries the coach it belongs to, directly or through its trainee (`User.coachId`). Coach routes keep checking `trainee.coachId === coach`. Community entities (profile, posts, branding) belong to one coach and are read only by that coach and her trainees.
2. **Assume more than one coach can exist.** There is one coach today, but no query, config value or screen may rely on "the coach" being a single global record. (Same rule as the Phase 0 owner decision and the "Multiple coaches" backlog item.)
3. **Media uses private storage with signed URLs, like Daily Pump.** Profile photo, cover and post images go through the same private-photo flow (authenticated upload, only the asset id stored, an expiring link made per request after the access check). No public image URLs, even though a community is a wider audience than one trainee.
4. **Theming must be possible at runtime through tokens / CSS variables.** Colors, fonts and other design values come only from the tokens in `packages/tokens` — never hard-coded in a component, an inline SVG or an image. A coach's theme can then be applied by overriding those variables when the app loads. Any coach-chosen color must still meet the contrast rules in §12.

### 15.4 Open questions (decide before building)

- Trainee interaction: reactions, comments, trainee posts — which of them, and in which step?
- Where the feed lives in the mobile app (a new tab, part of Home, the coach's profile screen) and where the coach writes posts (dashboard, coach mode in the app, or both).
- Notifications: does a new post send a notification / push to the community?
- Post rules: how many images per post, editing and deleting, drafts, pinned posts.
- Branding limits: a free color or a fixed set of themes; what stays Sistem's own (the logo, the sharp-cut language, fonts).
- Does a trainee see who else is in the community? (Today trainees never see each other.)
- Moderation, reporting and the legal side of user content (ties to the legal item in §14).
- When multiple coaches actually arrive: coach sign-up, and how a trainee is matched to a coach (see the "Multiple coaches" backlog item).

# Trainee Profile screen — redesign, direction B (2026-10-22)

References: `docs/design/trainee-profile.html` (latest) and the coach dashboard's "הישגים" tab.

There were two rounds:

- **Round 1** is committed (`5a1c2c8` + `0a809cc` + `9ba166b`): tabs, Body, Photos, the achievements tab, the coach card,
  settings and the color script. See `docs/phase-reports/profile-achievements-tab.txt` for the achievements part.
- **Round 2 (this report)** adds the new hero and the profile photo (upload, crop, remove), and changes these places to
  show the photo too: the coach dashboard, mobile Home and the trainee's account. It also moves the page onto the soft
  surface with white cards, splits settings into two groups and finishes the color cleanup.

Existing logic is kept: auth, the language switch, logout, the questionnaire, photos, measurements and achievements.

## Audit (before coding)

| Data | Source | Status |
|---|---|---|
| Name, join date, time zone | `AuthUser` (`/auth/me`) | ✅ |
| Coach name | `GET /plans/week` → `coach.name` | ✅ |
| Workouts, week streak, PR count | `GET /achievements` | ✅ |
| Weight + chest / waist / hips / arms / thighs history | `GET /body-metrics` | ✅ |
| Starting photo, progress photos, Daily Pump | `/body-metrics`, `/workout-logs` (signed links) | ✅ |
| Achievements (definitions, progress, unlock dates) | `GET /achievements` | ✅ |
| App version | `__APP_VERSION__` (mobile `package.json`) | ✅ |
| **Avatar** | — | ❌ → **built this round** (owner: private, signed URLs) |
| **Communities** | — | ❌ Don't exist (no model, route or type). "הקהילות שלי" is **not rendered**. |
| **Edit-details flow** | — | ❌ No screen exists. The API can't rename either (only `PATCH /users/preferences`). Owner's choice: "עריכת פרופיל" **opens the photo sheet**. |
| **Coach chat / "הודעה"** | — | ❌ No chat. The only message flow is Home's 👍 thanks to a coach note. Button hidden. |
| **Coach response time** | — | ❌ No data. Line hidden; the subtitle stays "המאמנת שלך". |
| **Notifications / reminder switches** | — | ❌ No settings (push = Phase 5b). Hidden. |
| **Privacy / personal-details rows** | — | ❌ No screens. Hidden; privacy is stated on the Photos tab and in the photo sheet. |
| **Coach's own photo** (coach card) | — | ❌ Coaches have no upload UI. The coach card shows initials. |

## What changed (round 2)

**Hero (`ProfileHero`)**
- The pink stage: 200 px + safe area, radius 0 0 40 40.
  - Gradient 160° from `--color-profile-stage-from` (#FF2E86) through `--color-primary` to `--color-profile-stage-to`
    (#E0005F).
  - A film grain on top (SVG noise, 25 %, multiply).
  - No glows, circles or stripes.
- "פרופיל" is a visually hidden `h1`. The stage shows only a bare white gear: 44 px, no circle, white 18 % on hover
  for fine pointers. It scrolls to Settings.
- The white profile card: radius 30, the purple-tinted shadow, starts 56 px below the header row.
  - Avatar: 96 px, overlapping the card's top edge, with a 4 px white + 2 px pink ring and a pink glow. It shows the
    photo or ink initials, plus a 32 px pink camera badge. The whole avatar is one button that opens the photo sheet.
    While a photo uploads, a spinner covers it.
  - Karantina name (42 px; English 34 px).
  - Meta line: "מתאמנת אצל" + the coach's name, as an underlined link to the coach card, then "· SINCE MM.YYYY"
    (mono, `aria-hidden`).
  - The pink "עריכת פרופיל" pill with a pencil icon. It opens the photo sheet (see the audit).
  - The scoreboard is full-bleed at the card's bottom with hairline dividers: אימונים / שבועות ברצף / שיאים
    (Barlow 32 px).

**Profile photo**
- `ProfilePhotoSheet` (the existing `BottomSheet`: radius 32, grabber, 300 / 200 ms, Esc / scrim, focus returns).
  - Step 1, "תמונת פרופיל":
    - A helper line matching the real rule: "you and your coach" only. Communities are left out.
    - A grouped card: "צילום תמונה" (`<input type=file accept="image/*" capture="user">`), "בחירה מהגלריה", and
      "הסרת התמונה" in Cherry, shown only when she has a photo.
  - Step 2, "התאמה":
    - A 280 px ink square with a 236 px circular mask and a white ring.
    - Drag to pan (pointer capture, `touch-action: none`). Arrow keys pan 8 px when the frame is focused.
    - Zoom slider 1–3× (pink accent; the zoom-out / zoom-in icons follow the reading direction).
    - The pan is always clamped so the circle stays filled.
    - "ביטול" closes; the ink "שמירה" saves.
- Save:
  - The phone crops to a **400×400 JPEG** on a canvas, which drops EXIF / GPS.
  - The sheet closes and the avatar shows a spinner.
  - Success → toast "תמונת הפרופיל עודכנה". Failure → toast + the old photo stays.
- Remove → initials + toast "התמונה הוסרה".
- Validation:
  - Phone: images only, ≤ 10 MB, plus a friendly line for a file it can't decode (e.g. HEIC).
  - Server: magic-byte check (JPEG / PNG / WebP), a 3 MB raw-body limit, and 415 for the wrong type.
- Capacitor later: swap the two file inputs for `@capacitor/camera`. The crop / save flow stays the same.
- Logic lives in `hooks/useImageCrop.ts`, `hooks/useAvatarUpload.ts`, the app-level `hooks/useMyAvatar.ts`, and pure
  math in `data/avatarCrop.ts`.

**Server (owner-approved schema change)**
- `User.avatar { publicId, uploadedAt } | null`.
- Stored through the existing `privatePhotos` flow: an authenticated Cloudinary asset in
  `sistem/avatars/<userId>/`. A replaced or removed photo is deleted.
- Routes:
  - `PUT /api/users/me/avatar` (raw image body, `readPhotoBody`)
  - `DELETE /api/users/me/avatar`
  - `GET /api/users/me/avatar` (a fresh signed link)
  - The PUT and DELETE answer `{ user: AuthUser }`.
- `AuthUser.avatar` and `CoachTraineeSummary.avatar` (list + detail) are `PrivatePhoto | null`: a 1-hour signed link,
  never the storage id.
  - Another coach still gets 404 for the trainee and an empty list.
  - If the photo store isn't configured, the avatar is null; login and `/auth/me` never fail because of it.
- Test: `users/__tests__/avatar.test.ts` (4 tests) covers upload, replace, remove, refusals, and coach vs another coach.

**Avatar everywhere**
- **Mobile:** Profile hero and Home (`HomeStage`), through the common `AvatarPhoto`. A link that fails shows the
  initials and fetches a fresh link, at most once a minute.
- **Dashboard:** the new `components/common/AvatarImage` sits over the initials in:
  - `Avatar`: the trainees list, overview waiting list, ending plans and week board;
  - `TraineeHeader` (profile page);
  - `QuickViewHero` (drawer).

  A failed or expired link falls back to the initials until the next data refresh.
- No chat exists, so there is no chat avatar.

**Page surface + cards**
- The screen uses `--color-profile-surface` (#F6F4F7). The sticky tabs bar is that surface at 92 % + blur, and the
  segment track is #ECE8EE.
- White cards:
  - the measurements list (radius 22, dividers between rows only);
  - the coach card;
  - the photo tiles;
  - locked badge cards (`--ach-badge-bg`) and unselected filter chips (scoped to `.pf-screen`, so Home and the
    achievements screen are unchanged).
- Settings: two white grouped cards (radius 22, 10 px apart):
  - (1) שפה (עב / EN), using the existing language switch;
  - (2) השאלון שלי › / יחידות ›.

  "התנתקות" is a white pill with Cherry text and the existing confirm. The mono version line follows.

**Shared achievements:** kept as 1:1 `MIRROR` copies in both apps (owner's earlier choice, re-confirmed). Board logic
is in `@sistem/shared` (`achievementBoard.ts`). Nothing in them changed this round, so the dashboard looks the same.

## Color check (`node scripts/check-colors.mjs`, DEV ONLY)

| | Off-palette hex | Brown / gold / amber tokens |
|---|---|---|
| Round 1 start | 8 | 14 |
| Round 1 end | 4 (server password email) | 0 |
| **Round 2 end** | **0** | **0** |

Round 2 fix: the password-reset email (`auth/email.service.ts`) had ATLAS leftovers: #1a1a1a, an orange button
#ff7a1a with navy text #0b1929, and #666. They are now the exact token values: #26222a (`--color-text`), #ff006e
(`--color-primary`) with #ffffff (`--color-on-primary`), and #6b6b6b (`--color-text-muted`). Email clients can't read
CSS variables. The new profile colors are tokens: #f6f4f7, #ff2e86, #e0005f.

## Files (round 2)

- **Server**
  - Added: `users/avatar.ts`, `users/avatar.service.ts`, `users/__tests__/avatar.test.ts`
  - Modified: `users/user.model.ts`, `users.controller.ts`, `users.routes.ts`, `auth/auth.service.ts`,
    `coach/coach.service.ts`, `privatePhotos/privatePhoto.constants.ts`, `auth/email.service.ts` (colors)
- **Packages** (modified): `types/src/index.ts`, `api-client/src/authApi.ts`, `tokens/tokens.css` (group 13)
- **Mobile**
  - Added: `components/common/AvatarPhoto/`, `hooks/useMyAvatar.ts`, `features/profile/components/ProfilePhotoSheet/`,
    `features/profile/data/avatarCrop.ts`, `features/profile/hooks/{useImageCrop,useAvatarUpload}.ts`
  - Modified: `ProfileHero` (rewritten), `ProfilePage.{tsx,css}`, `ProfileSettings.{tsx,css}`, `MeasurementList.css`,
    `CoachCard.css`, `PhotoGrid.css`, `profile/copy/{he,en}.ts`, `services/users/usersService.ts`,
    `home/components/HomeStage/HomeStage.{tsx,css}`
- **Dashboard**
  - Added: `components/common/AvatarImage/`
  - Modified: `components/common/Avatar/Avatar.{tsx,css}`, `TraineesPage.tsx`, overview
    `EndingPlans` / `WaitingList` / `WeekBoard`, `TraineeHeader.{tsx,css}`, `QuickViewHero.{tsx,css}`,
    `TraineeQuickView.tsx`

**Not mine:** the working tree also holds the questionnaire / settings rework. Its files:
- `QuestionnairePage`, `SettingsPage`, `LogoutSheet`, `QuestionnaireCard`, `QuestionnaireSheet`, `SegmentedControl`,
  `SubScreenHeader`, `ValueScoreboard`, `AnswerChips`, `ClampText`, `FrequencyPips`, `QnStepper`;
- `useQuestionnaire`, `useLineClamp`, `useUnitPreferences`, `questionnaireSections.ts`;
- `onboarding/data/formState.ts`, `OnboardingPage.tsx`;
- the deleted `UnitToggle` / `icons.tsx`;
- `docs/phase-reports/questionnaire-settings/`.

Two files mix both pieces of work: **`packages/tokens/tokens.css`** (its group 14) and **`profile/copy/{he,en}.ts`**
(the `questionnaire` keys). Either commit them with whichever piece goes first, or stage with `git add -p`.

## Dependencies

None. Playwright was used only from the session's scratch folder, for screenshots.

## How to test

```bash
npm run lint                     # oxlint + i18n audit + contrast audit — clean
npm test                         # 626 server tests (incl. 4 avatar) + 33 copy parity — all pass
npm run build                    # mobile + dashboard + server
node scripts/check-colors.mjs    # 0 / 0
npm run dev:all                  # /profile as trainee2@sistem.dev, the dashboard as coach@sistem.dev (sistem-dev-1234)
```

Checks marked [x] ran in headless Chrome at 390 × 844 (plus 375 × 667) against the dev seed and real Cloudinary. The
test photo was removed afterwards.

- [x] **Hero:** no visible title (the `h1` is 1 px, screen readers only); the gear is the only thing on the stage and
      scrolls to Settings. The card, avatar, meta line, pill and scoreboard follow the design.
- [x] **Photo, gallery:** pick → crop → save. `PUT` returns 200; the stored photo is 400×400; toast "תמונת הפרופיל
      עודכנה"; the avatar shows the photo (the spinner shows while it saves).
- [ ] **Photo, camera:** the input has `capture="user"`. Opening the front camera needs a real phone.
- [x] **Crop pan + zoom:** a big drag clamps exactly at the edge (1200×900 photo → ±39.3 px); zoom 2× widens the
      range; arrow keys move it 8 px.
- [x] **Remove:** `DELETE` 200 → initials + "התמונה הוסרה"; the remove row shows only when a photo exists.
- [x] **Error:** a text file → "אפשר לבחור רק קובץ תמונה." Server refusals (not an image / wrong type / too large /
      no login) are covered by tests.
- [ ] **Error, upload fails:** stop the server and save → toast "לא הצלחנו לשמור את התמונה", the old photo stays.
- [x] **The coach sees the new avatar:** the `/coach/trainees` list + detail carry a signed link. The dashboard
      trainees list and the trainee header show the photo, and so does mobile Home.
- [x] **Tabs + URL**, **weight range**, **measurement save → coach**, **photo compare drag + keyboard**, **photo
      privacy:** unchanged from round 1 and re-checked visually.
- [x] **Achievements:** the same tab as round 1. Locked cards and filter chips are now white on the surface. The
      dashboard look is unchanged (no shared file edited).
- [x] **Language switch:** EN mirrors the hero (gear on the right, camera badge at the start); switching back to עב
      works.
- [x] **Logout:** the existing confirm.
- [x] **iPhone SE (375):** no sideways scroll.
- [x] **Reduced motion:** round 1 behavior holds; nothing new animates beyond the press scale and the sheet's fade.

## Screenshots (`docs/phase-reports/trainee-profile/`)

- **Before:**
  - `before-1-top.jpg`, `before-2-full.jpg` (pre-redesign)
  - `after-1…7` (round 1)
- **After round 2:**
  - `v2-1-hero.jpg`
  - `v2-2-photo-sheet.jpg`
  - `v2-3-crop.jpg`
  - `v2-4a-avatar-uploading.jpg`, `v2-4-avatar-saved.jpg`
  - `v2-5-dashboard-header.jpg` (the coach sees it)
  - `v2-6-body-full.jpg`
  - `v2-7-achievements-full.jpg`
  - `v2-8-settings.jpg`
  - `v2-9-en.jpg`

## Known issues / TODOs

- **Copy:** new lines are marked PLACEHOLDER in `profile/copy/he.ts`:
  - the photo sheet's helper line (it doesn't mention communities);
  - the file errors;
  - screen-reader labels.

  English is placeholder.
- **Communities, chat, notification / reminder settings, privacy / personal-details screens, coach reply time:** these
  features need to exist first. The UI stays hidden.
- **Name editing:** there is no API. "עריכת פרופיל" opens the photo sheet until an edit-details screen exists.
- **Dashboard links:** a link expires after 1 hour. A dashboard left open longer shows initials until its trainee data
  refreshes.
- **Capacitor:** swap the file inputs for `@capacitor/camera` in Phase 5b.

## Suggested commits

Shared achievements: no changes this round (mirrors kept). Run these after, or together with, the questionnaire /
settings commits. `tokens.css` and `profile/copy/{he,en}.ts` hold both pieces of work (see Files).

```bash
git add -A -- apps/server/src/features/users/avatar.ts apps/server/src/features/users/avatar.service.ts apps/server/src/features/users/__tests__/avatar.test.ts apps/server/src/features/users/user.model.ts apps/server/src/features/users/users.controller.ts apps/server/src/features/users/users.routes.ts apps/server/src/features/auth/auth.service.ts apps/server/src/features/coach/coach.service.ts apps/server/src/features/privatePhotos/privatePhoto.constants.ts packages/types/src/index.ts packages/api-client/src/authApi.ts
git commit -m "feat(server): private profile photo for trainees (upload, remove, signed links to her coach)"
```

```bash
git add -A -- apps/dashboard/src/components/common/AvatarImage apps/dashboard/src/components/common/Avatar apps/dashboard/src/features/trainees/pages/TraineesPage/TraineesPage.tsx apps/dashboard/src/features/overview/components/EndingPlans/EndingPlans.tsx apps/dashboard/src/features/overview/components/WaitingList/WaitingList.tsx apps/dashboard/src/features/overview/components/WeekBoard/WeekBoard.tsx apps/dashboard/src/features/trainees/components/TraineeHeader apps/dashboard/src/features/trainees/components/QuickViewHero apps/dashboard/src/features/trainees/components/TraineeQuickView/TraineeQuickView.tsx
git commit -m "feat(dashboard): show the trainee's profile photo over her initials"
```

```bash
git add -A -- packages/tokens/tokens.css apps/mobile/src/components/common/AvatarPhoto apps/mobile/src/hooks/useMyAvatar.ts apps/mobile/src/services/users/usersService.ts apps/mobile/src/features/profile/components/ProfileHero apps/mobile/src/features/profile/components/ProfilePhotoSheet apps/mobile/src/features/profile/data/avatarCrop.ts apps/mobile/src/features/profile/hooks/useImageCrop.ts apps/mobile/src/features/profile/hooks/useAvatarUpload.ts apps/mobile/src/features/profile/pages/ProfilePage apps/mobile/src/features/profile/copy/he.ts apps/mobile/src/features/profile/copy/en.ts apps/mobile/src/features/home/components/HomeStage
git commit -m "feat(mobile): Profile hero on the pink stage with profile photo upload and crop"
```

```bash
git add -A -- apps/mobile/src/features/profile/components/ProfileSettings apps/mobile/src/features/profile/components/MeasurementList/MeasurementList.css apps/mobile/src/features/profile/components/CoachCard/CoachCard.css apps/mobile/src/features/profile/components/PhotoGrid/PhotoGrid.css
git commit -m "feat(mobile): Profile white cards on the page surface and grouped settings"
```

```bash
git add -A -- apps/server/src/features/auth/email.service.ts
git commit -m "fix(server): password email uses the exact palette colors"
```

```bash
git add -A -- docs/design/trainee-profile.html docs/phase-reports/trainee-profile.md docs/phase-reports/trainee-profile docs/phase-reports/profile-achievements-tab.txt
git commit -m "docs: trainee Profile redesign report, screenshots and reference design"
```

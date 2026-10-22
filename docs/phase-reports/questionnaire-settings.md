# "השאלון שלי" + "הגדרות" — redesign, direction B (2026-10-22)

Both Profile sub-screens now match the Profile's look:
- the soft page surface `#F6F4F7`;
- white rounded cards (radius 22, no borders, hairlines only between rows);
- Karantina titles;
- tokens only.

The questionnaire can be edited in place, one section at a time, in a bottom sheet. Settings uses a new segmented
control. **There are no server, API or schema changes.**

## What changed

### Shared shell
- **`SubScreenHeader`**: a sticky bar on the surface at 92% with blur. It has:
  - a round 40px white back button at the start (44px hit area). The chevron points right in Hebrew and left in
    English;
  - the 44px Karantina title (36px in English);
  - an optional 13px muted subtitle.
- The screen behind the dock is the page surface too (`.app-shell:has(.ssh)`).
- **Section labels:** a mono Latin eyebrow (aria-hidden) + a 13px / 600 Hebrew label.
- **No letter-spaced Hebrew.** A browser check walked every element with Hebrew text on both screens and found no
  `letter-spacing` other than `normal` / 0. The fix was needed in two places:
  - the global `h2` rule added −0.26px to the Settings labels;
  - the onboarding's `.text-label` letter-spaces and uppercases. It is reset inside the nutrition sheet only; the
    onboarding itself is unchanged.
- **Motion:**
  - presses use `scale(0.97)` on transform only;
  - hover only under `(hover: hover) and (pointer: fine)`;
  - no `transition: all`;
  - the sheets are the existing `BottomSheet` (300 ms in / 200 ms out on the drawer curve);
  - the segmented thumb uses a 320 ms spring;
  - everything is turned off under reduced motion.

### Screen 1: "השאלון שלי" (`/profile/questionnaire`)
- **Data:** it now reads `GET /onboarding`, the same answers the coach sees, instead of `GET /users/profile`. That
  brings in the sections the old screen never showed: basic details, exercise preferences, recovery, and the training
  experience.
- **Cards:** one per real section, in the onboarding's order. Each has:
  - a 36px tinted icon tile;
  - the mono eyebrow;
  - the 26px Karantina title (the coach's section names from `sharedCopy.onboardingSections`);
  - a 36px round soft pencil button (aria-label "עריכת <section>").

  The colored side bars and the outlined boxes are gone.

| Section | Tint | Shows |
|---|---|---|
| פרטים בסיסיים | ink on soft | Scoreboard: weight (her unit) · height (cm) · age (from her birth date). Gender chip. |
| מטרות | pink `#FFE3EE` / `#C80058` | Chips with emoji |
| תדירות אימונים | purple `#EFE7FF` / `#5B2FD6` | 7 pips (28×8, radius 4): low end solid, up to the high end half-tint. "2–3 ימים בשבוע" with the number in Barlow. Training experience chip. |
| פעילויות | orange `#FFEBD6` / `#C75A00` (text only) | Chips with emoji |
| העדפות תרגילים | purple | Muscle-focus chips, 2 free texts |
| התאוששות | ink on soft | Flag chips, notes (free text) |
| ציוד | blue `#E1F1FF` / `#0070C9` | Chips with emoji |
| תזונה ומטרה | cherry `#FBE3EC` / `#A50047` | Scoreboard: target weight + timeframe. Preference rows with hairlines. |

- **Tints for unlisted sections:** the brief gave no tint for "basic details" and "exercise preferences". They use
  ink-on-soft and purple. No green, brown or gold is used.
- **Free text:** 15px, at most 4 lines, then a "עוד" button (it becomes "פחות" when open). The cut-off is measured
  with a `ResizeObserver` (`useLineClamp`).
- **Unanswered section:** a muted "לא ענית" and a pink "הוספה" text button, which opens the same sheet.
- **Editing:** the pencil opens a bottom sheet for that section only. Its inputs:
  - tinted toggle chips;
  - min / max day steppers (min ≤ max kept automatically);
  - weight steppers (±0.5, can also be typed) and height steppers (±1 cm);
  - a date field for the birth date;
  - textareas.

  "Nutrition & goal" reuses the onboarding's own `NutritionPreferencesStep` inside the sheet, styled to match there
  only. The footer has "ביטול" and an ink "שמירה" button. Save is disabled until the same rules as the onboarding's
  Continue pass.
- **Saving** goes through the existing `saveOnboardingStep` → `PATCH /onboarding` (that step's fields only), the
  same call the old "edit step" screen made. The card updates in place and the toast "התשובות עודכנו" appears.
- **The coach sees the change at once:** tested via `GET /api/coach/trainees/:id`. **The coach is not notified.** A
  step save never emitted an event, and none was added.
- **Empty state** (`answers` is null or the status is `not_started`): a white card with a short explanation and a
  pink "מילוי השאלון" button that opens `/onboarding`.
- The old "מילוי השאלון מחדש" link stays as a quiet underlined link under the cards.
- **One refactor in onboarding:** `mapOnboardingToFormState` was moved unchanged from `OnboardingPage.tsx` to
  `onboarding/data/formState.ts`, so the sheets start from exactly the form state the onboarding uses.

### Screen 2: "הגדרות" (`/profile/settings`)
- **Units** (UNITS · יחידות): rows with a 36px soft icon tile, with segmented controls for "משקל ק״ג / ליב׳" and
  "מידות ס״מ / אינץ׳". The existing helper line sits under the card.
- **Language** (LANGUAGE · שפה): a full-width "עברית / English" segmented control, wired to the existing
  `useLanguagePreference`. It switches RTL ↔ LTR at once, saves, and switches back if the save fails. The existing
  helper line sits under it.
- **Account** (ACCOUNT · חשבון): the "אזור זמן" row, with the value in muted LTR text. It has no chevron because it
  can't be edited.
- **"התנתקות":** a full-width white pill with Cherry text. It opens a confirm sheet ("להתנתק מהחשבון?" /
  "התנתקות" in Cherry / "ביטול").
- The mono app version is at the bottom.
- **`SegmentedControl`:**
  - the track is `#ECE8EE`, radius 14, with 3px padding;
  - options are 36px tall;
  - the selected option is a white thumb with a soft shadow and ink text; unselected options are muted;
  - semantics: `role=radiogroup` / `radio`, `aria-checked`, a single tab stop;
  - keys: the arrow keys move the way they point (RTL aware), plus Up / Down / Home / End.

  The square cherry toggles (`UnitToggle`) are deleted.

### Unit switch: what it does
`PATCH /users/preferences { units }` saves her display units only. Body values are stored in kg / cm, and only the
display converts. The test showed 68 kg as 149.9 lb on the questionnaire, then back.
- The **questionnaire height** stays in cm in both view and edit, as onboarding stores and asks it.
- **Workouts** stay in kg (existing rule).

## Missing data (hidden, not invented)

| Element in the brief | Status |
|---|---|
| "עודכן ב-<date>" | Hidden. The API sends no update time. `OnboardingResponse` has `timestamps: true`, so adding `updatedAt` to `MyOnboarding` is one line in `toMyOnboarding` + the type. That is an API change: owner's call. |
| Notification toggles | Hidden. No notification settings exist (push is Phase 5b). |
| "פרטים אישיים ›", "פרטיות ›" rows | Hidden. No such screens. |
| Time zone chevron | None. The time zone isn't editable. |
| Coach notified on a questionnaire change | Not today (see above). Not added. |

## Copy

These lines are new and marked PLACEHOLDER in `features/profile/copy/he.ts`:
- "פחות";
- the save error;
- the empty-state explanation;
- "גיל";
- four screen-reader-only labels.

These come from the brief: the intro, "לא ענית", "הוספה", "עוד", "התשובות עודכנו", "מילוי השאלון".

These are reused as they are:
- the section names and option labels (shared copy, the same words the coach reads);
- the sheet field labels (onboarding copy);
- all the Settings lines.

The eyebrows are Latin and the same in both languages (BODY, GOALS, SCHEDULE, …).

All English is placeholder. The seven old Profile copy keys that are no longer used were removed.

## Files

**Added (`apps/mobile/src/features/`)**
- `onboarding/data/formState.ts`
- `profile/data/questionnaireSections.ts`
- `profile/hooks/`: `useQuestionnaire.ts`, `useLineClamp.ts`, `useUnitPreferences.ts`
- `profile/components/` (each `.tsx` + `.css`): `SubScreenHeader`, `QuestionnaireCard`, `AnswerChips`, `FrequencyPips`,
  `ValueScoreboard`, `ClampText`, `QnStepper`, `QuestionnaireSheet`, `SegmentedControl`, `LogoutSheet`

**Modified**
- `apps/mobile/src/features/profile/pages/QuestionnairePage/QuestionnairePage.tsx` + `.css` (rewritten)
- `apps/mobile/src/features/profile/pages/SettingsPage/SettingsPage.tsx` + `.css` (rewritten)
- `apps/mobile/src/features/onboarding/pages/OnboardingPage/OnboardingPage.tsx` (the mapping moved out; no behavior
  change)
- `apps/mobile/src/features/profile/copy/he.ts`, `en.ts`:
  - `questionnaire` block;
  - `eyebrow.questionnaire / units / language / account`;
  - 7 unused keys removed.
- `packages/tokens/tokens.css`:
  - new group "14. Questionnaire + Settings";
  - `--text-subscreen-title` and `--text-qn-section` in `:root:lang(en)`.

**Deleted**
- `apps/mobile/src/features/profile/components/UnitToggle/` (`.tsx` + `.css`)
- `apps/mobile/src/features/profile/components/icons.tsx` (only the old questionnaire used them)

**Not mine:** the working tree also holds the in-progress profile-photo / avatar work. That includes:
- server `users/avatar*`;
- `AvatarPhoto`, `ProfilePhotoSheet`, `ProfileHero`, `ProfilePage`;
- `usersService`, `authApi`, types;
- its own hunks in `copy/he.ts`, `copy/en.ts` and `tokens.css`.

These are left out of the commits below. For the three shared files, stage only this task's hunks with `git add -p`:
- the `questionnaire` block;
- the new eyebrow keys;
- the 7 removed keys;
- token group 14 + the two `:lang(en)` lines.

## Dependencies

None. Playwright ran only from the session's scratch folder, for screenshots.

## How to test

```bash
npm run lint      # oxlint + i18n audit + contrast audit: clean (only old warnings in other files)
npm test          # 626 server tests + 33 copy parity tests: all pass
npm run build     # passes
npm run dev:all   # then open http://localhost:5173/profile/questionnaire as trainee2@sistem.dev (sistem-dev-1234)
```

The checks marked [x] ran in a headless browser at 390 × 844 (and 375 × 667) against the dev seed. Her goals were
changed and then restored. Her units and language were switched and then restored.

### Checklist
- [x] **Every questionnaire section in view:** all 8 cards render with the seed answers (screenshots).
- [x] **Edit sheets:** goals, frequency, basic details and nutrition opened (screenshots).
  - Goals edit: added "הגברת כוח" → "שמירה" → the toast "התשובות עודכנו" → the card shows 3 chips → the coach API
    returns `increase_strength` → removed it again → the coach API is back to 2 goals.
  - Esc closes the sheet and focus returns to its pencil.
- [ ] **Edit:** activities, exercise preferences, recovery and equipment saved by hand. They use the same chip /
      textarea code as goals.
- [x] **Empty state:** a mocked `GET /onboarding` with no answers shows the card and "מילוי השאלון".
- [x] **Unit switch:** ArrowLeft on "ק״ג" selects "ליב׳" (RTL) and saves. The questionnaire shows 149.9 ליב׳.
      Switched back to kg.
- [x] **Language switch:** "English" → `<html dir="ltr">`, and both screens mirror (EN screenshots). "עברית" → back to
      `rtl`.
- [x] **Notification toggles:** none exist, so the section is hidden (see Missing data).
- [x] **Logout confirm:** "ביטול" stays on Settings; "התנתקות" goes to `/login`.
- [x] **No letter-spaced Hebrew anywhere** on either screen (computed-style scan, both screens).
- [x] **EN / LTR:** the layout mirrors and the eyebrows hide in English (they would repeat the label).
- [x] **Reduced motion:** the segmented thumb's transition is ~0. The sheet and the press states are turned off by
      their media queries.
- [x] **iPhone SE width (375):** no sideways scroll.
- [ ] **On a phone:** the sticky bar under the notch, the date picker in the basic-details sheet, the keyboard over
      the textareas.

## Screenshots (`docs/phase-reports/questionnaire-settings/`)

- **Before:** `before-questionnaire.jpg`, `before-settings.jpg`
- **After (questionnaire):** `after-questionnaire-top.jpg`, `after-questionnaire-full.jpg`, `after-saved-toast.jpg`,
  `after-empty-state.jpg` (375 px, reduced motion), `after-questionnaire-en.jpg`
- **After (edit sheets):** `after-sheet-goals.jpg`, `after-sheet-frequency.jpg`, `after-sheet-body.jpg`,
  `after-sheet-nutrition.jpg`
- **After (settings):** `after-settings.jpg`, `after-settings-en.jpg`, `after-logout-sheet.jpg`

The full-page shots show the dock in mid-page; that is how full-page capture draws fixed elements.

## Known issues / TODOs

- **Owner decisions:**
  - "עודכן ב-" needs `updatedAt` in the API;
  - whether a questionnaire edit should notify the coach;
  - the tints for "basic details" and "exercise preferences".
- **`lastStep`:** a section save also sets the onboarding's `lastStep` to that step. This is existing behavior of the
  old edit screen and is harmless after completion.
- **Nutrition sheet:** the reused onboarding step keeps its accordion layout (softened in the sheet only).

## Suggested commits

1. `refactor(onboarding): move the answers-to-form mapping into data/formState`
   - `apps/mobile/src/features/onboarding/data/formState.ts`
   - `apps/mobile/src/features/onboarding/pages/OnboardingPage/OnboardingPage.tsx`
2. `feat(mobile): questionnaire and settings screens in the profile look (direction B)`
   - the new profile components / hooks / data above
   - both pages
   - the deleted `UnitToggle` and `icons.tsx`
   - this task's hunks of `copy/he.ts`, `copy/en.ts` and `tokens.css` (`git add -p`)
3. `docs: questionnaire and settings redesign report`
   - `docs/phase-reports/questionnaire-settings.md`
   - `docs/phase-reports/questionnaire-settings/`

```bash
git add -A -- apps/mobile/src/features/onboarding/data/formState.ts apps/mobile/src/features/onboarding/pages/OnboardingPage/OnboardingPage.tsx
git commit -m "refactor(onboarding): move the answers-to-form mapping into data/formState"
```

```bash
git add -A -- apps/mobile/src/features/profile/pages/QuestionnairePage apps/mobile/src/features/profile/pages/SettingsPage apps/mobile/src/features/profile/components/SubScreenHeader apps/mobile/src/features/profile/components/QuestionnaireCard apps/mobile/src/features/profile/components/AnswerChips apps/mobile/src/features/profile/components/FrequencyPips apps/mobile/src/features/profile/components/ValueScoreboard apps/mobile/src/features/profile/components/ClampText apps/mobile/src/features/profile/components/QnStepper apps/mobile/src/features/profile/components/QuestionnaireSheet apps/mobile/src/features/profile/components/SegmentedControl apps/mobile/src/features/profile/components/LogoutSheet apps/mobile/src/features/profile/components/UnitToggle apps/mobile/src/features/profile/components/icons.tsx apps/mobile/src/features/profile/data/questionnaireSections.ts apps/mobile/src/features/profile/hooks/useQuestionnaire.ts apps/mobile/src/features/profile/hooks/useLineClamp.ts apps/mobile/src/features/profile/hooks/useUnitPreferences.ts
git add -p -- apps/mobile/src/features/profile/copy/he.ts apps/mobile/src/features/profile/copy/en.ts packages/tokens/tokens.css
git commit -m "feat(mobile): questionnaire and settings screens in the profile look (direction B)"
```

```bash
git add -A -- docs/phase-reports/questionnaire-settings.md docs/phase-reports/questionnaire-settings
git commit -m "docs: questionnaire and settings redesign report"
```

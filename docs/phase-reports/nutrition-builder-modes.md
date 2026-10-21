# Nutrition builder — plan mode, menu gaps, side column, usability (2026-10-20)

Reference: `docs/design/coach-dashboard.html` → a trainee → the nutrition builder (`#p-nutrition`).

**The reference in the repo has no mode cards** ("מנות בלבד" / "תפריט מלא" / "מה היא מקבלת" don't appear in it). The
mode parts were built from the brief's text; the menu-mode parts match the reference ("מה היא אוכלת", "שורת טקסט").

## Owner decisions (asked during this task)

- **Snack: keep the PRD.** New plans' daily portions start from the calculation's split; snack starts at 0.
- **The daily target is pre-filled with the recommendation** (PRD updated).

Both are recorded in PRD §5.6, "Decisions (owner, 2026-10-20)".

## What changed

### 1. Plan mode (data + server)

- **Stored on the plan and each version:** `mode` ('portions' | 'menu'), `dailyPortions` and a day-level
  `vegetablesFree`, next to the meals. **Switching never deletes** the meals or the daily portions.
- **One pure module, `nutrition/nutritionPlanMode.ts`,** resolves the mode, the daily portions, the vegetables flag and
  the day's portions. An older plan with no mode reads as **menu** when an option has lines, else **portions** with its
  meals summed.
- **Coach API:** `mode`, `dailyPortions`, `vegetablesFree`. `dayPortions` and `kcal.day` follow the mode; in portions
  mode they are the daily portions × the group kcal.
- **Save payload:** `mode`, `dailyPortions` (½ steps, ≤ 30 per group) and `vegetablesFree`; omitted = keep.
- **Publish:**
  - Portions mode needs a target and some daily portions (new error `no_portions`); keto is checked on the daily
    portions. The meal and option rules apply in menu mode only.
  - The version stores the mode, the daily portions and the flag.
  - "Changed since publish" now includes them.
- **Trainee view:** `mode`, plus `vegetablesFree` for the day. **No meals in portions mode.** The version keeps the
  meals for the meal-photo slots.
- **Meal tracking:** the day's planned portions come from `dayPortionsOf(version)`.
- **Templates and AI drafts:** applying a template, or loading an AI draft, sets `mode: 'menu'`.
- **Trainee app:** `planMode()` / `hasFreeVegetables()` now read the server's fields, falling back for plans cached
  before this change.
- **New tests** (`nutritionApi.test.ts` → "plan mode"):
  - the defaults for older plans;
  - portions mode end to end (coach → publish → her view → meal-log planned);
  - the empty-portions rule;
  - switching back keeps both;
  - a template makes the plan a menu.

### 2. Step 2 "מה היא מקבלת"

- **Title:** renamed in the section and the steps nav. The nav shows "מנות יומיות · 18½ מנות" in portions mode and
  "תפריט · 4 ארוחות" in menu mode.
- **`ModeCards`** (`role="radiogroup"`, arrow keys):
  - selected = white card, 2px pink ring, pink icon tile, filled dot;
  - unselected = soft grey.
- **Portions mode — `DailyPortions`:**
  - Four tiles in the group tints: a big value, −/+ in ½ steps, "≈ X קק״ל", and either "לפי היעד" or a
    "מומלץ N · החזרה" button.
  - The "ירקות חופשי, בכל ארוחה" switch.
  - **`AppPreview`** ("מה היא תראה באפליקציה"): per group a dot, the name, the count, her first 4 items with their
    portion, "ועוד N", and "עריכת רשימת המזון" → the food list.
- **Menu mode:** the meals as before. The template picker shows only in this mode.

### 3. Menu mode gaps

- **Option tabs** are a real `role="tablist"`: `role="tab"`, `aria-selected`, arrow keys. "+ אפשרות" sits outside the
  list.
- **"שכפול אפשרות":** a copy button in the option header; the copy gets the next letter.
- **"מה היא אוכלת"** (food rows, vegetables row, text rows, "+ פריט מזון", "+ שורת טקסט") already existed; kept.

### 4. Side column

- **Sticky with its own scroll:** it starts under the header and steps nav. Previously it was sticky but taller than
  the screen, so its end was out of reach until the page bottom.
- **Budget card:**
  - titled "מנות ביום" (portions) or "חלוקת המנות" (menu);
  - in portions mode it compares the daily portions to the target ("X / Y קק״ל ביום"; "המנות היומיות תואמות את היעד"
    when exact);
  - with the target pre-filled, the ring shows a value from the start.
- **"לפני פרסום" by mode**, and each item scrolls to its section:
  - portions: target, daily portions per group, message (optional);
  - menu: target, all portions given out to meals, at least 3 meals (advice; one is required), message (optional).
    A meals-errors item appears only when there is an error.
- **AI:** the blurred cloud behind the main-column banner and the side card is gone (clean white, gradient icon tile).
  The draft still shows as the banner at the top of the main column.
- **"שמירה כתבנית":**
  - a white card instead of see-through glass;
  - a white input with a hairline;
  - the button is grey with readable muted text until a name is typed, then pink-soft with Cherry text.

### 5. Visual fixes

- **Sticky header:** solid white, so the page's color clouds no longer show through.
- **Step numbers:** pink-soft circles with Cherry text; done = Cherry with a white ✓. Same in the steps nav and the
  section headers (`StepNumber`).
- **Switch:** Cherry when on (as before). The off track was 22%-transparent grey (barely visible) and is now about 3:1
  on white. This applies to every switch in the dashboard.

### 6. Usability

- **Target pre-fill:** the recommendation fills the target ("✓ לפי ההצעה"); "חזרה ל־X" brings it back after a change.
  The daily portions fill from the target's split when empty.
- **Steps nav:** sticky under the header (a white strip). Scrollspy (`useActiveSection`) highlights the step in view.
  A press scrolls smoothly, or instantly with reduced motion.
- **Step 1 folds** into one line ("2,240 קק״ל · עלייה במסת שריר +10% · 6½ / 6 / 6 מנות") with "עריכה" / "כיווץ".
  - A plan whose target was already set opens folded.
  - A new plan opens expanded.
- **Undo instead of silent deletes:**
  - deleting a meal, an option or a row shows "ביטול";
  - options and rows restore into their meal by key (`useBuilderUndo` context).
- **Already in place:** autosave with "שומר… / נשמר", the unsaved-changes guard, Esc closing the food picker and the
  template menu, and Enter blurring a number field.

## Verified in the browser (Playwright, the dev coach)

- **New plan (seed `trainee1`, no plan before):**
  - portions mode selected; target 2,240 marked "✓ לפי ההצעה";
  - tiles 6½ / 6 / 6 / 0, each "לפי היעד";
  - the steps nav shows ✓ on steps 1 and 2 and "מנות יומיות · 18½ מנות";
  - checklist: target ✓, daily portions ✓, message optional;
  - budget 100%;
  - the preview lists the first items of each group with "ועוד N".
- **Scrolling:** the steps nav stays at 87px, the side column stays in view, and the scrollspy moves to "מה היא מקבלת".
- **Older plan (`trainee2`):**
  - reads as "תפריט מלא"; step 1 opens folded with its summary;
  - option tabs are tablists; "שכפול אפשרות" is there;
  - deleting a row → toast "השורה נמחקה. · ביטול" → undo restores it (5 → 4 → 5).
- **No page errors.** One "useAuth" error appeared once during a hot reload while another session was editing files,
  and did not repeat.

Screenshots: `docs/phase-reports/fidelity/after-nb-*.png` (`ref-nb-full.png` = the reference, `before-nb-full-*.png` =
before).

**Tests and checks**
- `npx vitest run` (server): 615 pass.
- `npm run test:i18n`: 33 pass.
- `npm run lint`: no findings in this work, i18n and contrast audits clean. One warning is in the other session's
  cardio code.
- **Typecheck:** clean for this work. The dashboard, server and mobile also show errors in the other session's
  in-progress cardio change (`packages/types/src/cardio.ts` adds `WorkoutKind`; `index.ts` doesn't import it yet).
  Not touched.

## Missing data / left as is

- **The preview isn't filtered by her preferences.** The trainee's own swap lists show all the coach's active items,
  so the preview shows what she really sees. Filtering both would be a product decision.
- **Portions mode and meal photos:** the photo slots use the version's meals. A portions plan with no meals at all
  has no photo slot.
- **Templates hold meals only:** saving a template from a portions plan saves its meals (a template is a menu).
- **Dev data:** opening the builder for seed `trainee1` autosaved a working copy (portions mode, target 2,240), never
  published. `npm run seed:dev` resets it. `trainee2`'s working copy now also stores its resolved mode / daily
  portions (same values).
- **Copy:** the mode and step texts are the brief's wording. The PLACEHOLDER texts are the undo lines, the budget's
  portions-mode lines, the preview's empty line and "כיווץ"; all English texts are placeholders too.

## Manual test checklist

- [ ] A trainee with no plan: the builder opens in "מנות בלבד", the target is filled and marked "✓ לפי ההצעה", the
      tiles follow the split, and snack is 0.
- [ ] Change a tile → the budget, the steps nav count and the preview count follow; "מומלץ N · החזרה" resets it.
- [ ] Switch to "תפריט מלא" and back → the meals and the daily portions are both still there.
- [ ] Publish in portions mode → her app shows no meals, the tracker counts the daily portions, vegetables follow the
      switch.
- [ ] Publish in menu mode → as before.
- [ ] Menu mode: the option tabs answer the arrow keys; duplicating an option gives the next letter; deleting a meal /
      option / row → "ביטול" restores it.
- [ ] Apply a template or an AI draft → the mode becomes "תפריט מלא".
- [ ] Scroll: the steps nav and the side column stay in view; the highlighted step follows; a checklist item scrolls to
      its section.
- [ ] Step 1: "כיווץ" / "עריכה"; an existing plan opens folded.
- [ ] "שמירה כתבנית": the button is grey until a name is typed, then pink-soft.
- [ ] English: Settings → EN → the builder mirrors; the texts are English placeholders.
- [ ] 390 px: the mode cards and tiles stack (2 columns), no sideways scroll.

## Suggested commits

**Order matters:** earlier reports' commits haven't been run (`trainee-nutrition-screen.md`, then
`dashboard-fidelity.md`). They share files with this work (`packages/types/src/index.ts`, `packages/tokens/tokens.css`,
the dashboard nutrition copy, `MealCard`, `MealsSection`, mobile `data/nutritionDay.ts`). Run those first. A
`git add` takes a file as it is now, so the later commits simply pick up what is left. `tokens.css` also holds another
session's slide / cardio tokens; use `git add -p` there as those reports say. The other session's cardio files are not
in any list.

```bash
git add -A -- apps/server/src/features/nutrition/nutritionPlanMode.ts apps/server/src/features/nutrition/nutrition.constants.ts apps/server/src/features/nutrition/nutritionMeal.schema.ts apps/server/src/features/nutrition/nutritionPlan.model.ts apps/server/src/features/nutrition/nutrition.types.ts apps/server/src/features/nutrition/nutrition.validation.ts apps/server/src/features/nutrition/nutritionPlan.service.ts apps/server/src/features/nutrition/__tests__/nutritionApi.test.ts apps/server/src/features/mealLogs/mealLog.service.ts apps/server/src/i18n/locales/he.ts apps/server/src/i18n/locales/en.ts packages/types/src/index.ts apps/mobile/src/features/nutrition/data/nutritionDay.ts docs/PRD.md
git commit -m "feat(nutrition): plan mode — daily portions or a full menu, stored side by side"
```

```bash
git add -A -- apps/dashboard/src/features/nutrition/nutritionDraft.ts apps/dashboard/src/features/nutrition/hooks/usePortionBudget.ts apps/dashboard/src/features/nutrition/hooks/usePublishChecklist.ts apps/dashboard/src/features/nutrition/components/ModeCards apps/dashboard/src/features/nutrition/components/DailyPortions apps/dashboard/src/features/nutrition/components/AppPreview apps/dashboard/src/features/nutrition/components/MealsSection apps/dashboard/src/features/nutrition/components/PublishChecklist apps/dashboard/src/features/nutrition/components/PortionBudgetCard apps/dashboard/src/features/nutrition/components/CurrentNutritionPlanCard apps/dashboard/src/features/nutrition/copy/he.ts apps/dashboard/src/features/nutrition/copy/en.ts
git commit -m "feat(dashboard): nutrition builder step 2 \"what she gets\" — portions only or full menu"
```

```bash
git add -A -- apps/dashboard/src/features/nutrition/hooks/useBuilderUndo.ts apps/dashboard/src/features/nutrition/components/MealCard apps/dashboard/src/features/nutrition/components/OptionPanel apps/dashboard/src/features/nutrition/components/MealOptionTabs
git commit -m "feat(dashboard): option tabs as a tablist, duplicate option, undo for option and row delete"
```

```bash
git add -A -- apps/dashboard/src/features/nutrition/components/NutritionEditor apps/dashboard/src/features/nutrition/components/StepNav apps/dashboard/src/features/nutrition/components/StepNumber apps/dashboard/src/features/nutrition/components/CalorieTargetSection apps/dashboard/src/features/nutrition/components/MessageTipsSection apps/dashboard/src/features/nutrition/components/DailyTarget apps/dashboard/src/features/nutrition/hooks/useActiveSection.ts apps/dashboard/src/features/nutrition/components/BuilderHeader/BuilderHeader.css apps/dashboard/src/features/nutrition/components/AiDraftBanner/AiDraftBanner.css apps/dashboard/src/features/nutrition/components/AiDraftCompact/AiDraftCompact.css apps/dashboard/src/features/nutrition/components/SaveTemplateCard
git add -p packages/tokens/tokens.css
git commit -m "feat(dashboard): nutrition builder — target pre-fill, sticky steps with scrollspy, foldable step 1, sticky side column, visual fixes"
```

```bash
git add -A -- docs/phase-reports/nutrition-builder-modes.md docs/phase-reports/fidelity/after-nb-portions-full-desk.png docs/phase-reports/fidelity/after-nb-portions-scrolled-desk.png docs/phase-reports/fidelity/after-nb-menu-desk.png docs/phase-reports/fidelity/after-nb-menu-full-desk.png docs/phase-reports/fidelity/ref-nb-full.png docs/phase-reports/fidelity/before-nb-full-desk.png docs/phase-reports/fidelity/before-nb-full-mob.png
git commit -m "docs: nutrition builder modes report"
```

For the `tokens.css` hunks in the fourth commit, answer **y** to the `--nb-header-offset` / `--nb-steps-top` /
`--nb-side-top` lines and the `--color-nb-switch-off` change; **n** to everything else unless an earlier report's
commit has already taken it.

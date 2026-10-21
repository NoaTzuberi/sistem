# Trainee Nutrition screen — redesign (2026-10-20)

Reference: `docs/design/trainee-nutrition.html` (direction B, "training OS"). Its "לבדיקה" mode toggle is
review-only and was not built: the mode comes from the plan.

## Summary

The trainee Nutrition tab is rebuilt top to bottom on a plain white, full-bleed screen:

- **Header:** a sticky frosted header with the "תזונה" title, the selected day's date and an ink "תמונת ארוחה" pill.
- **Week strip:** this Sunday week. Past days open their log; future days are disabled.
- **Coach card:** the coach's message as a soft, expandable card.
- **Day total:** "eaten / total" with the MIX bar.
- **Fuel-cell rows:** one per group.
- **Free vegetables:** a dashed row.
- **Menu (menu mode only):** meal cards with "אכלתי".
- **Photos:** today's meal photos strip.
- **Food sheet:** a bottom sheet with group tabs, search, categories and "אכלתי".
- **Toasts:** ink pills above the dock.

The server now also sends the coach's name and each food's category.

## Owner decisions applied (this task)

- **"אכלתי" saves counts only (PRD 13a+: she never says what she ate).** A food's "אכלתי" adds one portion to its group,
  never past the plan. "סומן" lasts only while the sheet is open, and no foodId is stored. A meal's "אכלתי" adds the
  meal's portions, again only up to the plan. The phone remembers, for that day, exactly what each meal added, so
  unmarking takes back the same amounts. No database change.
- **Two additive API fields** on `GET /api/nutrition-plan`: `coach: { name } | null`, and `category` on every food.

## What changed

**Plan mode.** The plan has no mode field. It is derived in `data/nutritionDay.ts` `planMode()`: any meal option with
a line means `menu`, otherwise `portions`. Plans built in the dashboard always have options, so in practice the dev
plans show as `menu`.

**Bug fixes in the group rows.**
- A planned half portion is a half capsule (flex 1 : 0.5) labeled "½". Protein 4½ = 4 full capsules + one half, never "5".
- Bidi: every portion count is drawn by ONE component, `components/PortionNumber` (`<bdi dir="ltr">`, built on
  `formatPortionCount`). That covers "1/4½", the day total, "נשארו 3½ מנות" (via `TextWithNumber`), "+X מעבר",
  the sheet line and the menu badges.

**Logic lives in hooks.**
- `hooks/useNutritionDay.ts`: selected day, week strip, cell / food / meal marking. Each change returns the groups it
  completed, which drives the badge pop and the toast.
- `hooks/useFoodsByGroup.ts`: search plus category sections.
- `hooks/useNutritionSheet.ts`: which group is open, the search, and the foods marked during this visit.
- Pure helpers are in `data/nutritionDay.ts`. Meal marks are a new `mealMarks` field in `data/nutritionCache.ts`
  (phone only, pruned to the 7-day window).

**Colors.** Fills (cells, badges, the MIX bar) use the bright group colors from the brief. Text on a tint or on white
keeps the existing `--color-portion-*-text` inks. The brief's fat (#C75A00, 3.7:1) and snack (#0070C9, 4.4:1) text
colors miss 4.5:1 on their tints. Selected tabs and "סומן" use the dark ink under white text. The white glyph and
number on the bright fills are decorative (aria-hidden) and are marked `contrast-ignore` with that reason.

**Coach message.** It opens while unread, as PRD 13a+ says ("open while that version is unseen, collapsed after").
It keeps the pink dot until it is read. The reference shows it collapsed.

## Removed

- `components/PortionTracker` (the old day navigator: arrows, square day boxes, the gray panel).
- `pages/NutritionPage/NutritionPage.css` (the old title / "עודכן" header).
- Copy keys `dayTitle`, `today`, `previousDay`, `nextDay` (the earlier `trackerHint`, `circleLabel`, `halfAdd`,
  `halfRemove`, `circleMarked` and `circleUnmarked` were removed in the fuel-bar change).
- Tokens `--color-portion-*-solid`.
- **Coach mode** still uses `NutritionPlanView`, `CoachIntro`, `MealCard`, `DayTotals` and `SwapSheet` (read-only). They are unchanged and kept.

## Missing data (not invented)

- **Meal times:** the plan has none, so meal cards show no time.
- **Items hidden by her preferences:** the trainee's swap lists are not filtered by her preferences today, so the
  amber "לא מוצגים X פריטים…" note is never shown. Filtering would be a server change and a product decision.
- **Over-goal chip:** it is built but never appears, because the server caps marks at the plan (`clampEaten`).
- **Coach name:** shown only after a fresh load. A plan cached before this change shows "הודעה מהמאמנת שלך" with no
  initials until it reloads.

## Files

**Added (mobile, `apps/mobile/src/`)**
- `components/common/Toast/` + `hooks/useToast.ts`
- `features/nutrition/components/`: `NutritionScreen`, `NutritionHeader`, `WeekStrip`, `CoachCard`, `PortionSummary`,
  `PortionGroupRow`, `FuelBar`, `GroupBadge`, `PortionNumber`, `FreeVegetables`, `MenuSection`, `MenuMealCard`,
  `MealPhotoStrip`, `MealPhotoSheet`, `FoodSheet`, `groupIcons.tsx`
- `features/nutrition/groupColors.css`
- `features/nutrition/data/nutritionDay.ts`
- `features/nutrition/hooks/`: `useNutritionDay.ts`, `useFoodsByGroup.ts`, `useNutritionSheet.ts`

**Modified**
- `apps/mobile/src/features/nutrition/`: `pages/NutritionPage/NutritionPage.tsx`, `copy/he.ts`, `copy/en.ts`,
  `data/nutritionCache.ts`, `data/portionCircles.ts`, `components/SwapSheet/*` (group badge in the title)
- `apps/mobile/src/components/common/Modal/Modal.tsx` (the title may be an element)
- `apps/mobile/src/copy/he.ts`, `en.ts` (eyebrows MENU / PHOTOS / MIX)
- `packages/tokens/tokens.css` (Trainee Nutrition tokens, fuel-cell motion tokens)
- `packages/types/src/index.ts` (`NutritionFoodFacts.category`, `TraineeNutritionPlanResponse.coach`)
- `apps/server/src/features/nutrition/`: `nutritionMapping.ts`, `nutritionPlan.service.ts`,
  `nutrition.controller.ts`, `__tests__/nutritionApi.test.ts`

**Deleted**
- `apps/mobile/src/features/nutrition/components/PortionTracker/*`
- `apps/mobile/src/features/nutrition/pages/NutritionPage/NutritionPage.css`

**Not mine, left out of the commits below:** the SlideToStart move, `HomeStage`, the home copy, the cardio / home
design HTML files, the earlier common CSS edits (Autocomplete, BottomSheet, Button, Input, Select, AppDock,
PlaceholderPage), and the slide / cardio tokens inside `tokens.css`.

## Dependencies

None added or removed.

## How to test

```bash
npm run lint      # oxlint + i18n audit + contrast audit — clean
npm test          # 603 server tests + 31 copy parity tests — all pass
npm run build     # all apps build
npm run dev       # then open http://localhost:5173/nutrition as trainee2@sistem.dev
```

Checked in the browser (393 px, Hebrew): no sideways scroll. Protein 4½ = four capsules + one half "½" capsule. A tap
completes a group → badge pop + "השלמת את מנות החלבון להיום". Tapping the last filled cell takes back half a portion.
A meal's "אכלתי" adds only what is left; tapping "נאכל" takes it back. The food sheet works:
`role=dialog`, 82% tall, categories, "סומן", search-empty line, group tabs, Esc closes, focus returns to "מה אפשר?".
Monday opens its own log. The meal photo sheet lists the four meals. The dev data was set back to 0 afterwards.
Screenshots were not possible (the tab was in DevTools device mode), so these checks read the page's DOM.

### Manual checklist

- [ ] **Portions mode:** a plan whose options are empty → no "התפריט שלך" section; the line reads "בחרי מה שבא לך מכל קבוצה".
- [ ] **Menu mode:** meal cards; option tabs only when there are 2+ options; "אכלתי" ↔ "✓ נאכל" adds and takes back portions; "החלפה" opens the sheet on that group.
- [ ] **Half portion:** a group planned at 4½ shows four capsules + one narrow "½" capsule.
- [ ] **Bidi:** "1/4½", "נשארו 3½ מנות" and "0 / 13½" read left to right as one unit inside Hebrew.
- [ ] **Past days:** tap an earlier day this week → its log, date line and eyebrow change; future days are faded and disabled.
- [ ] **Sheet on every group:** protein / carbs / fat / snack, and vegetables when the coach has vegetable items. Check tabs, search, categories, "אכלתי" → "סומן", drag the grabber down to close, Esc, scrim tap.
- [ ] **Photo upload:** "תמונת ארוחה" / the + tile → pick a meal → camera / gallery → the photo shows in the strip with the meal's name; tap opens it full screen.
- [ ] **Coach card:** unread → open with a dot; tap collapses / expands; no message → no card.
- [ ] **English / LTR:** Settings → English → the layout mirrors and all texts are English (placeholders).
- [ ] **Reduced motion:** cells, the badge pop, the sheet and the toast don't animate.
- [ ] **iPhone SE (320–375 px):** the header pill does not wrap; the rows fit.

## Known issues / TODOs

- **Copy:** Hebrew wording from the design is used where the design has it. The singular forms, aria labels and all
  English texts are PLACEHOLDER.
- **Fuel-cell size:** with 6+ portions in one group, each half-cell is narrower than 44 px (the cells are still 44 px
  tall, and dragging works).
- **Week strip and the 7-day window:** the strip shows only this Sunday week, so earlier days in the 7-day window
  (e.g. last Friday) can't be opened from the screen any more.

## Suggested commits

1. `feat(server): send the coach's name and food categories with the trainee nutrition plan`
2. `feat(mobile): trainee Nutrition screen redesign (training OS)`
3. `docs: trainee Nutrition screen report`

`packages/tokens/tokens.css` also holds another change (the slide / cardio tokens). Stage only the nutrition hunks in
commit 2 with `git add -p packages/tokens/tokens.css`: answer **y** to the hunks under "Trainee Nutrition" and the
`--transition-fuel-cell` / `--fuel-cell-step` / `--transition-badge-pop` lines, and **n** to the "Slide to start +
cardio" hunks and the `--ease-spring` / `--loop-nudge` comment edits.

```bash
git add -A -- packages/types/src/index.ts apps/server/src/features/nutrition/nutritionMapping.ts apps/server/src/features/nutrition/nutritionPlan.service.ts apps/server/src/features/nutrition/nutrition.controller.ts apps/server/src/features/nutrition/__tests__/nutritionApi.test.ts
git commit -m "feat(server): send the coach's name and food categories with the trainee nutrition plan"
```

```bash
git add -p packages/tokens/tokens.css
git add -A -- apps/mobile/src/features/nutrition apps/mobile/src/components/common/Toast apps/mobile/src/hooks/useToast.ts apps/mobile/src/components/common/Modal/Modal.tsx apps/mobile/src/copy/he.ts apps/mobile/src/copy/en.ts
git commit -m "feat(mobile): trainee Nutrition screen redesign (training OS)"
```

```bash
git add -A -- docs/phase-reports/trainee-nutrition-screen.md docs/design/trainee-nutrition.html
git commit -m "docs: trainee Nutrition screen report"
```

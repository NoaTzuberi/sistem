# Commit plan — 2026-10-17

Base: `013776c design updates` on `main`. **107 changed paths**: 52 tracked (modified or deleted) + 55 untracked.
Made with read-only git only (`git status --porcelain -uall`, `git diff --stat`, `git diff`). Nothing is staged.

## Safety check — passed

| Check | Result |
|---|---|
| `.env*`, keys, tokens | No `.env*` file changed or untracked. I read every diff that could hold one; no keys or connection strings. |
| `docs/reference/` | Not changed; ignored and untracked. |
| `CLAUDE.md` | Ignored (`git check-ignore` confirms), not tracked, not in any commit below. |
| Photos / user data | No image, video, PDF, CSV or JSON file among the changes. |
| Build output | No `dist/` or `node_modules/` path. |

## Which of your groups apply

Only **b, l, m and q** have changes. Two more commits don't fit a group: the side sheet blur (shared
by the food library) and the "counts as" dropdown fix.

The other groups (a, c–k, n, o) have no uncommitted changes; they are already in earlier commits
(`2ee61a1`, `adefb04`, `013776c`, …). For **p**, only the design reference
`docs/design/trainee-home-b.html` exists; no trainee-app code was started, so it goes with the docs.

## Files that mix two groups — use `git add -p`

**1. `apps/dashboard/src/features/nutrition/components/NutritionEditor/NutritionEditor.tsx`** — l (template handoff) + m (publish modal). Stage it in commit 3 with:

```bash
git add -p apps/dashboard/src/features/nutrition/components/NutritionEditor/NutritionEditor.tsx
# y  the hunk that adds   import { useTemplateHandoff } from '../../hooks/useTemplateHandoff';
# y  the hunk that adds   useTemplateHandoff(handleApplyTemplate);
# n  every other hunk (PublishModal / usePublishFlow / appCopy / useNavigate imports, publishFlow,
#    publishSummary, the new handlePublish, the <PublishModal> at the end)
```

Commit 4 then takes the rest of the file with a plain `git add`.

**2. `packages/tokens/tokens.css`** — l (one token for the split bar) + m (the publish modal's tokens). Stage it in commit 3 with:

```bash
git add -p packages/tokens/tokens.css
# y  only the hunk that adds   --gradient-split-gap: …
# n  the hunks that add --color-modal-scrim / --surface-modal / --color-confetti-*, --blur-modal-scrim,
#    --transition-modal-in
```

Commit 4 takes the rest.

Order matters: **b comes before l**, because the food library uses the shared Switch and Select.

## Commits, in order

### 1. refactor(ui) — old raw inputs → shared components (26 files)

```bash
git add apps/dashboard/src/components/common/NumberField/NumberField.css apps/dashboard/src/components/common/NumberField/NumberField.tsx apps/dashboard/src/components/common/Select/Select.css apps/dashboard/src/components/common/Select/Select.tsx apps/dashboard/src/components/common/Switch/Switch.css apps/dashboard/src/components/common/Switch/Switch.tsx apps/dashboard/src/features/aiDraft/components/AiDraftSheet/AiDraftSheet.css apps/dashboard/src/features/aiDraft/components/AiDraftSheet/AiDraftSheet.tsx apps/dashboard/src/features/auth/pages/Login/Login.css apps/dashboard/src/features/auth/pages/Login/Login.tsx apps/dashboard/src/features/exerciseLibrary/components/FamilyTools/FamilyTools.css apps/dashboard/src/features/exerciseLibrary/components/FamilyTools/FamilyTools.tsx apps/dashboard/src/features/nutrition/components/DailyTarget/DailyTarget.css apps/dashboard/src/features/nutrition/components/DailyTarget/DailyTarget.tsx apps/dashboard/src/features/nutrition/components/HerDataFields/HerDataFields.css apps/dashboard/src/features/nutrition/components/HerDataFields/HerDataFields.tsx apps/dashboard/src/features/nutrition/components/VegToggle/VegToggle.css apps/dashboard/src/features/nutrition/components/VegToggle/VegToggle.tsx apps/dashboard/src/features/nutritionLibrary/components/FoodToolbar/FoodToolbar.css apps/dashboard/src/features/nutritionLibrary/components/FoodToolbar/FoodToolbar.tsx apps/dashboard/src/features/planBuilder/components/ExerciseRow/ExerciseRow.css apps/dashboard/src/features/planBuilder/components/ExerciseRow/ExerciseRow.tsx apps/dashboard/src/features/planBuilder/components/LibrarySheet/LibrarySheet.css apps/dashboard/src/features/planBuilder/components/LibrarySheet/LibrarySheet.tsx apps/dashboard/src/features/planBuilder/components/SetTargetsTable/SetTargetsTable.css apps/dashboard/src/features/planBuilder/components/SetTargetsTable/SetTargetsTable.tsx
git commit -m "refactor(ui): replace old raw inputs with shared field/select/switch" -m "- New shared Switch (iOS, Cherry Rose on) and Select (pill + own chevron)" -m "- NumberField: soft rounded field instead of the square bordered box" -m "- Checkboxes → Switch: remember me, below-floor confirm, interval, equipment" -m "- Native selects → Select: regenerate-for, formula, activity, superset, set type, level" -m "- Family split-off members → toggle rows; VegToggle and show-archive use Switch"
```

### 2. feat(dashboard) — side sheet scrim blur (2 files)

```bash
git add apps/dashboard/src/components/common/SideSheet/SideSheet.css apps/dashboard/src/components/common/SideSheet/SideSheet.tsx
git commit -m "feat(dashboard): side sheet can blur the page behind its scrim" -m "- Optional blurScrim prop; the blur fades in with the scrim" -m "- Used by the nutrition library's food and template sheets"
```

### 3. feat(nutrition) — food library, templates and settings (incl. card 5) (63 files + 2 partial)

First run the two `git add -p` steps above (only the l hunks), then:

```bash
git add apps/dashboard/src/app/router/AppRouter.tsx apps/dashboard/src/components/common/ConfirmDialog/ConfirmDialog.css apps/dashboard/src/components/common/ConfirmDialog/ConfirmDialog.tsx apps/dashboard/src/components/layout/PagePanel/PagePanel.css apps/dashboard/src/components/layout/PagePanel/PagePanel.tsx apps/dashboard/src/features/nutrition/components/FoodForm/FoodForm.css apps/dashboard/src/features/nutrition/components/FoodForm/FoodForm.tsx apps/dashboard/src/features/nutrition/components/NutritionSubnav/NutritionSubnav.css apps/dashboard/src/features/nutrition/components/NutritionSubnav/NutritionSubnav.tsx apps/dashboard/src/features/nutrition/copy/en.ts apps/dashboard/src/features/nutrition/copy/he.ts apps/dashboard/src/features/nutrition/hooks/useTemplateHandoff.ts apps/dashboard/src/features/nutrition/pages/FoodListPage/FoodListPage.css apps/dashboard/src/features/nutrition/pages/FoodListPage/FoodListPage.tsx apps/dashboard/src/features/nutrition/pages/NutritionSettingsPage/NutritionSettingsPage.css apps/dashboard/src/features/nutrition/pages/NutritionSettingsPage/NutritionSettingsPage.tsx apps/dashboard/src/features/nutrition/pages/NutritionTemplatesPage/NutritionTemplatesPage.css apps/dashboard/src/features/nutrition/pages/NutritionTemplatesPage/NutritionTemplatesPage.tsx apps/dashboard/src/features/nutritionLibrary/components/ContainsPicker/ContainsPicker.css apps/dashboard/src/features/nutritionLibrary/components/ContainsPicker/ContainsPicker.tsx apps/dashboard/src/features/nutritionLibrary/components/FieldMessage/FieldMessage.css apps/dashboard/src/features/nutritionLibrary/components/FieldMessage/FieldMessage.tsx apps/dashboard/src/features/nutritionLibrary/components/FoodSheet/FoodSheet.css apps/dashboard/src/features/nutritionLibrary/components/FoodSheet/FoodSheet.tsx apps/dashboard/src/features/nutritionLibrary/components/LibraryTabs/LibraryTabs.tsx apps/dashboard/src/features/nutritionLibrary/components/PortionSplitBar/PortionSplitBar.css apps/dashboard/src/features/nutritionLibrary/components/PortionSplitBar/PortionSplitBar.tsx apps/dashboard/src/features/nutritionLibrary/components/SettingsActivityMultipliers/SettingsActivityMultipliers.css apps/dashboard/src/features/nutritionLibrary/components/SettingsActivityMultipliers/SettingsActivityMultipliers.tsx apps/dashboard/src/features/nutritionLibrary/components/SettingsCard/SettingsCard.css apps/dashboard/src/features/nutritionLibrary/components/SettingsCard/SettingsCard.tsx apps/dashboard/src/features/nutritionLibrary/components/SettingsGoalAdjustments/SettingsGoalAdjustments.css apps/dashboard/src/features/nutritionLibrary/components/SettingsGoalAdjustments/SettingsGoalAdjustments.tsx apps/dashboard/src/features/nutritionLibrary/components/SettingsKcalPerPortion/SettingsKcalPerPortion.css apps/dashboard/src/features/nutritionLibrary/components/SettingsKcalPerPortion/SettingsKcalPerPortion.tsx apps/dashboard/src/features/nutritionLibrary/components/SettingsLivePreview/SettingsLivePreview.css apps/dashboard/src/features/nutritionLibrary/components/SettingsLivePreview/SettingsLivePreview.tsx apps/dashboard/src/features/nutritionLibrary/components/SettingsMore/SettingsMore.css apps/dashboard/src/features/nutritionLibrary/components/SettingsMore/SettingsMore.tsx apps/dashboard/src/features/nutritionLibrary/components/SettingsSafetyFloor/SettingsSafetyFloor.css apps/dashboard/src/features/nutritionLibrary/components/SettingsSafetyFloor/SettingsSafetyFloor.tsx apps/dashboard/src/features/nutritionLibrary/components/SettingsStepper/SettingsStepper.css apps/dashboard/src/features/nutritionLibrary/components/SettingsStepper/SettingsStepper.tsx apps/dashboard/src/features/nutritionLibrary/components/SettingsTile/SettingsTile.css apps/dashboard/src/features/nutritionLibrary/components/SettingsTile/SettingsTile.tsx apps/dashboard/src/features/nutritionLibrary/components/TemplateCard/TemplateCard.css apps/dashboard/src/features/nutritionLibrary/components/TemplateCard/TemplateCard.tsx apps/dashboard/src/features/nutritionLibrary/components/TemplateRenameSheet/TemplateRenameSheet.css apps/dashboard/src/features/nutritionLibrary/components/TemplateRenameSheet/TemplateRenameSheet.tsx apps/dashboard/src/features/nutritionLibrary/components/TemplatesGrid/TemplatesGrid.css apps/dashboard/src/features/nutritionLibrary/components/TemplatesGrid/TemplatesGrid.tsx apps/dashboard/src/features/nutritionLibrary/components/TraineePickerSheet/TraineePickerSheet.css apps/dashboard/src/features/nutritionLibrary/components/TraineePickerSheet/TraineePickerSheet.tsx apps/dashboard/src/features/nutritionLibrary/components/UnsavedChangesBar/UnsavedChangesBar.css apps/dashboard/src/features/nutritionLibrary/components/UnsavedChangesBar/UnsavedChangesBar.tsx apps/dashboard/src/features/nutritionLibrary/copy/en.ts apps/dashboard/src/features/nutritionLibrary/copy/he.ts apps/dashboard/src/features/nutritionLibrary/data/libraryTabs.ts apps/dashboard/src/features/nutritionLibrary/data/settingsForm.ts apps/dashboard/src/features/nutritionLibrary/data/templateHandoff.ts apps/dashboard/src/features/nutritionLibrary/hooks/usePortionSplit.ts apps/dashboard/src/features/nutritionLibrary/pages/FoodLibraryPage/FoodLibraryPage.css apps/dashboard/src/features/nutritionLibrary/pages/FoodLibraryPage/FoodLibraryPage.tsx
git commit -m "feat(nutrition): food library, templates and settings redesign" -m "- One page for foods, templates and settings; the tab lives in the path" -m "- Food sheet with a contains picker and field messages; templates grid and rename" -m "- Settings cards with shared steppers / tiles, live preview, unsaved-changes bar" -m "- Card 5: pace tiles, live portion-split bar (save blocked until 100), keto tile" -m "- Reset to defaults asks first in a ConfirmDialog instead of window.confirm" -m "- Template handoff into the builder; old pages, FoodForm, subnav, PagePanel removed"
```

The deleted files are in the list on purpose: `git add <path>` of a deleted file stages its removal.

### 4. feat(publish) — designed publish modal (7 files + the rest of 2 partial)

```bash
git add apps/dashboard/src/components/common/Icon/iconPaths.ts apps/dashboard/src/components/common/PublishModal/PublishModal.css apps/dashboard/src/components/common/PublishModal/PublishModal.tsx apps/dashboard/src/copy/en.ts apps/dashboard/src/copy/he.ts apps/dashboard/src/features/nutrition/components/NutritionEditor/NutritionEditor.tsx apps/dashboard/src/features/planBuilder/components/PlanEditor/PlanEditor.tsx apps/dashboard/src/hooks/usePublishFlow.ts packages/tokens/tokens.css
git commit -m "feat(publish): designed publish modal replaces window.confirm" -m "- PublishModal + usePublishFlow: confirm, existing publish call, celebration" -m "- Plan and nutrition builders publish through it, with a summary of the plan" -m "- Spinner, no double submit; confetti off under reduced motion" -m "- Modal tokens, send icon, app copy"
```

### 5. fix(nutrition) — the "counts as" dropdown (1 file)

This change doesn't fit a group: it is a CSS fix to the builder's existing dropdown, not a move to the shared Select.

```bash
git add apps/dashboard/src/features/nutrition/components/OptionPanel/OptionPanel.css
git commit -m "fix(nutrition): keep the counts-as dropdown arrow off its edge" -m "- Own chevron 12px in from the end; the native arrow ignored the padding" -m "- Mirrored for right-to-left; keyboard focus ring added"
```

### 6. docs — design references + phase reports (6 files)

```bash
git add docs/design/coach-dashboard.html docs/design/trainee-home-b.html docs/phase-reports/commit-plan.md docs/phase-reports/design-nutrition-library.md docs/phase-reports/design-publish-modal.md docs/phase-reports/design-settings-card5-and-fields.md
git commit -m "docs: design references and phase reports" -m "- coach-dashboard.html: settings card 5 and the publish modal" -m "- trainee-home-b.html: home screen direction B (reference only, no code yet)" -m "- Reports: nutrition library, publish modal, card 5 + fields sweep, this plan"
```

## Verify, then push

```bash
git status   # expected: nothing to commit, working tree clean
git push
```

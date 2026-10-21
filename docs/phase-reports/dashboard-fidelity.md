# Coach dashboard — fidelity pass (2026-10-20)

Reference: `docs/design/coach-dashboard.html`. App: `apps/dashboard` (dev, seed coach, trainee "Dev Trainee Two").

## How it was compared

Playwright was not in the repo. I installed it in a scratch folder outside the repo (no `package.json` / lockfile
change) and used the Chromium already cached on this machine. A script opened the reference and the running app at
**1440×1000** and **390×844**. It clicked through the reference with its own nav buttons (`.nav[data-go]`,
`[data-tab]`) and loaded the matching app routes. The screenshots are in `docs/phase-reports/fidelity/`:

- `ref-*` — the reference; `ref-trainee-active-*` = an active trainee (its first trainee is a "waiting" one).
- `before-*` — the app before this pass; `after-*` — after.
- `*-full-desk.png` — full-page captures.

Automatic checks on every page and at both widths:

- **No sideways scroll** at 390 or 1440px (the only element off screen is the closed mobile sidebar, as intended).
- **No page errors.**
- **No icon-only button without a name** (the flagged ones carry text or an `alt`).
- **No `transition: all`.**
- **No hard-coded hex / rgba color** in dashboard CSS (all tokens).
- **Hover outside `(hover:hover)`:** the only hits are reduced-motion overrides, which is fine.

**Overall:** the app already follows the reference closely on every page: layout, widgets, colors, type, the drawer,
the builders, the nutrition builder, food lists, statistics and the library. The gaps below are specific items, not
a redesign.

Status: **OK** = matches · **different** · **missing** · **broken** · **fixed** (fixed in this pass) · **data** = the
reference shows data the app doesn't have (kept as a proper empty state, not invented).

## Global shell

| Item | Reference | App (before) | Status | Fix |
|---|---|---|---|---|
| Canvas, widgets, shadows, ink / pink / Cherry | tokens | the same tokens | OK | — |
| Sidebar: logo tile, groups, white active pill with pink icon, count badges, collapse | yes | yes | OK | — |
| Sidebar entries | + התראות, בונה תוכניות, תבניות (training), תפריטים, הגדרות | no such pages in the app (builders open per trainee) | different (by design) | keep the app's routes; the reference's inbox page is itself a placeholder ("המסך הזה בסבב העיצוב הבא") |
| HE / EN switch | soft rail, **white** thumb, ink text | **pink** thumb, white text | **fixed** | sidebar variant: white thumb + shadow, ink text (the login keeps its pink one) |
| Breadcrumb | "Sistem / מתאמנות / **נועה ברק**" | "Sistem / כל המתאמנות" (no trainee) | **fixed** | the shell reads her id from the URL and her name from the coach data: "Sistem / כל המתאמנות / Dev Trainee Two" on her profile and builders; the section links back |
| Notifications panel | from the bell (the sidebar "התראות" page is a placeholder) | from the bell, grouped, read / unread | OK | — |
| Fonts / tabular numbers | Rubik, mono eyebrows | same | OK | — |
| Duplicate class names | — | `.nb-option-add` used by two components (the tabs' pink leaks into the option panel's add row) | **fixed** | the tabs' one is `.nb-option-tab-add`; the other repeats (`.switch.x`, `.side-sheet .x`) are scoped compound selectors |
| `confirm()` | never | 9 `window.confirm` calls | **partly fixed** | meal / food / template delete → undo toast. Still a confirm: plan delete, cardio session delete, "back to simple sets", replacing meals with an AI draft / a template, leaving unsaved settings (see Known issues) |

## סקירה (overview)

| Item | Reference | App | Status | Fix |
|---|---|---|---|---|
| Greeting, KPIs, three hero cards, recent activity, week board | yes | yes | OK | — |
| Week board day labels | "ב׳" | "יום ד׳" | **fixed** | Hebrew: the letter; English keeps "Wed" (single letters repeat) |
| "Plans ending this week" row | 3 cards | not shown | data | the seed has no plan ending with workouts left; the app shows the row only with data |

## מתאמנות (trainees) + quick view

| Item | Reference | App | Status | Fix |
|---|---|---|---|---|
| Filter chips with counts, search, rows | yes | yes (+ "needs next week's plan" chip) | OK | — |
| Subtitle | "24 פעילות • 2 מחכות לתוכנית" | "… מחכות לתוכניתמתאמנות ש" | **fixed** | copy typo |
| Quick-view drawer: hero, 48h card, AI strip, tiles, questionnaire, links, footer | yes | yes | OK | — |
| Drawer "message" button | yes | — | data | no messaging feature (not in the PRD) |
| "/" focuses the search | — | no | **fixed** | added (Convenience) |

## Trainee profile

| Item | Reference | App | Status | Fix |
|---|---|---|---|---|
| Header: avatar, name, status, chips, contact | yes | yes | OK | — |
| Header: this week's progress ("3 מתוך 4 · אימוני השבוע" + ring) for an active trainee | yes | exists (`PlanWindowPill`) | OK / data | shown when she has a **published** plan this week; the dev trainee's week is a draft |
| Tab counts | תוכניות 6 · תיעודים 21 · הישגים 4 | plans only | different | logs / achievements counts need two extra requests per page open → left as is (listed) |
| תוכניות: week rail, week calendar hero, consistency, "+ new plan" popover (scratch / duplicate / AI) | yes | yes | OK | — |
| תזונה: summary card, portion tracking day cards | yes | yes (the redesigned day cards) | OK | — |
| תזונה: "4½" in the group bars and meal lines | LTR fractions | **"½4"**, "½1 חלבון" | **fixed** | ONE helper, `formatPortionCountLtr` (@sistem/shared): the count as one left-to-right unit; `describePortion` / `describeMealPortions` use it, so both apps get it |
| תזונה: "previous plans" list | yes | not shown | data | dev trainee has one version |
| תיעודי אימונים: stats, filters, week-grouped rows, tags, rating | compact tiles with colored icon squares | larger gradient tiles | different | kept (same data; the gradient tiles are the app's design system elsewhere) |
| גוף: tiles, weight chart, measurements in their colors, records, photos | yes | yes | OK | — |
| הישגים: medals, filter, modal with confetti | yes | yes | OK | — |

## Builders

| Item | Reference | App | Status | Fix |
|---|---|---|---|---|
| Plan builder: header, workout tabs, hero band, slots, hover on top buttons | yes | yes | OK | — |
| Nutrition builder: header status + publish, steps, calorie step, side column, AI banner | yes | yes | OK | — |
| Goal buttons | selected = its goal color | the same rule (blue for loss, pink for gain) | OK | — |
| Publish flow | celebration modal | `PublishModal` (summary → confirm → check + confetti) | OK | — |
| Steps nav at 390px | scrolls | scrolls | OK | — |

## Library · stats · foods

| Item | Reference | App | Status | Fix |
|---|---|---|---|---|
| Library: KPIs | משפחות · גרסאות · לבדיקה | משפחות · לבדיקה | data | no library-wide variants total in the API (per family only) — needs a server count; listed |
| Library: variant card badges | "3×" and "ראשית" in opposite corners | "×5" sits on top of "ראשית" | **fixed** | the badge had `dir="ltr"`, which flips its own `inset-inline-end` onto the same corner; only its text is LTR now |
| Library: family list, filters, detail | yes | yes | OK | — |
| Stats: KPIs, charts, retention, goals | yes | yes | OK (fewer delta chips: little dev data) | — |
| Foods: tabs, cards, sheet, templates, settings with steppers + sticky save bar | yes | yes | OK | — |

## Mobile (390px)

Every page: the sidebar becomes the sheet with the menu button, no sideways scroll, and steppers keep their padding.
**OK.**

## Convenience (Phase 3) — what exists, what was added

| Item | Before | Status |
|---|---|---|
| Trainee tab in the URL (`?tab=`), library tabs as routes | yes | OK |
| Remember the last tab per trainee | no | **added** — `useTraineeTab`: the URL stays the truth; a link without `?tab` opens her last tab (this browser) |
| Builders: back to the trainee, autosave + "שומר… / נשמר", unsaved-changes guard | yes | OK |
| Destructive actions → toast with "ביטול" | `confirm()` | **added** for meal delete (nutrition builder), food delete, nutrition template delete — `useUndoToast` (5 s) + `useHiddenItems`: the item goes at once; a server delete waits for the undo window (commits on expiry, on the next undo, or when the page closes) |
| Esc / outside click / focus return on popovers, drawers, modals | yes | OK |
| Loading skeletons | plain "loading" text | **added** — `Skeleton` (overview, stats, trainees table, trainee profile, and the logs / body / achievements tabs) |
| "/" focuses the search on list pages | no | **added** — `useSlashSearch` + `data-search-shortcut` (trainees, foods, library); never while typing, ⌘K stays the palette |
| Enter in number fields blurs (and saves) | no | **added** — `useEnterToBlur` (every number input / stepper in the dashboard; a form's own Enter still submits) |
| Sticky builder headers / settings save bar | yes | OK |
| Names on icon-only buttons | yes | OK |

## Verified after the fixes

Playwright, on the running app (scratch script, the dev coach):

| Check | Result |
|---|---|
| Breadcrumb on her profile | "Sistem / כל המתאמנות / Dev Trainee Two" |
| Language switch thumb | white (`rgb(255,255,255)`) |
| "/" on the trainees page | focuses the search |
| Profile without `?tab` after visiting `?tab=logs` | opens `?tab=logs` |
| Library badges | "×5" and "ראשית" no longer overlap (66–99 px vs 172–235 px) |
| Food delete → "ביטול" | card hidden (211 → 210), toast "הפריט ״קוטג' 5%״ הוסר. · ביטול", undo → 211, **no DELETE request** |
| English | every captured page `dir="ltr"`, no sideways scroll; switched back to Hebrew after |
| Page errors | none |

Commands: `npm run lint` (oxlint + i18n audit + contrast audit, no findings), `npm test` (611 server + 33 copy tests pass),
`npm run build` (all apps build).

Screenshots: `after-*` next to `before-*` and `ref-*`; `after-en-*` = English.

## Missing data (layout kept, nothing invented)

- **Library variants total:** the API has no library-wide count (only per family).
- **Tab counts for logs / achievements:** each needs its own request when the profile opens (the tabs load
  their data only when opened). Kept to plans only.
- **Drawer / header "message" button:** there is no messaging feature.
- **Reference sidebar pages:** "התראות" (the reference's own page is a placeholder), "בונה תוכניות" and "תבניות"
  (training), "תפריטים", "הגדרות" (general) don't exist as app pages. Builders open per trainee; the app's nutrition
  templates / settings are in the sidebar.
- **Reference data the dev seed lacks:** "plans ending this week" cards, previous nutrition plans, the stats delta
  chips, and this week's progress pill for the dev trainee (her week is a draft).

## Known issues / left as is

- **`confirm()` still used for:** deleting a whole plan (PlanEditor), deleting a cardio session (CardioBuilder — that
  feature is mid-work in another session), "back to simple sets", replacing meals with an AI draft or a template, and
  leaving unsaved nutrition settings. These are a different kind (replace / leave / delete a whole plan with its
  workouts). An undo needs a deferred delete per case — next pass.
- **Logs tab tiles:** the reference has compact tiles with colored icon squares; the app has larger gradient tiles
  (same data). Kept.
- **The `dir="ltr"` + logical-inset pitfall** (the library badge bug) may exist elsewhere: an absolutely placed element
  with its own `dir` flips its `inset-inline-*`. Found only the one in the screenshots.
- **Copy:** "ביטול" / "Undo", and the toast lines "הפריט ״…״ הוסר." and "הארוחה ״…״ נמחקה.", are PLACEHOLDER.

## Manual test checklist

- [ ] Sidebar: the language switch shows a white pill on the active language; switch EN ↔ עב (the page mirrors).
- [ ] A trainee's profile: the breadcrumb ends with her name; the middle part links to the list.
- [ ] Open her Logs tab, go back to the list, open her again from a row / the drawer → Logs opens.
- [ ] Trainees / food list / exercise library: press "/" → the search is focused (not while typing in a field).
- [ ] Her Nutrition tab (or the builder): "4½" and "1½ חלבון" read correctly in Hebrew.
- [ ] Nutrition builder: delete a meal → toast with "ביטול" → it returns in its place; wait 5 s → it stays deleted (autosave).
- [ ] Food list: remove an item → "ביטול" brings it back (no server call); remove and wait 5 s → removed / archived toast.
- [ ] Templates: delete → "ביטול" works; wait → gone after the list reloads.
- [ ] A stepper / number field: type a value, press Enter → the field blurs and the save indicator runs.
- [ ] Slow network (DevTools throttling): overview, stats, trainees, a profile and its tabs show grey skeleton widgets.
- [ ] Exercise library: a primary variant with copies shows "×N" and "ראשית" in opposite corners.
- [ ] Reduced motion: skeletons don't pulse; the toast doesn't slide.
- [ ] 390 px: no sideways scroll on any page; the sidebar opens as a sheet.

## Suggested commits

The working tree also has another session's **cardio** work (new `features/cardio`, `cardioDisplay.ts`, routes,
router, plan builder tabs, shared copy / index). None of its files are below; commit it separately.

```bash
git add -A -- packages/shared/src/nutritionDisplay.ts apps/dashboard/src/features/nutrition/components/MacroBars/MacroBars.tsx apps/dashboard/src/features/nutrition/components/PortionStepper/PortionStepper.tsx apps/dashboard/src/features/nutrition/components/AiDraftBanner/AiDraftBanner.tsx apps/dashboard/src/features/nutrition/components/DailyTarget/DailyTarget.tsx apps/dashboard/src/features/nutrition/components/PortionTrackingCard/PortionTrackingCard.tsx apps/dashboard/src/features/nutrition/components/PortionBudgetCard/PortionBudgetCard.tsx
git commit -m "fix: portion counts read left to right inside Hebrew text (4½, not ½4)"
```

```bash
git add -A -- apps/dashboard/src/components/layout/Sidebar/Sidebar.css apps/dashboard/src/components/layout/TopLine apps/dashboard/src/features/overview/components/WeekBoard/WeekBoard.tsx apps/dashboard/src/features/trainees/copy/he.ts apps/dashboard/src/features/exerciseLibrary/components/VariantCard/VariantCard.tsx apps/dashboard/src/features/nutrition/components/MealOptionTabs
git commit -m "fix(dashboard): fidelity pass — language switch, breadcrumb with the trainee, week board letters, library badges, copy typo, class collision"
```

```bash
git add -A -- apps/dashboard/src/components/layout/AppShell/AppShell.tsx apps/dashboard/src/components/common/Skeleton apps/dashboard/src/features/overview/pages/OverviewPage/OverviewPage.tsx apps/dashboard/src/features/stats/pages/StatsPage/StatsPage.tsx apps/dashboard/src/features/trainees/pages/TraineesPage/TraineesPage.tsx apps/dashboard/src/features/trainees/pages/TraineeDetailPage/TraineeDetailPage.tsx apps/dashboard/src/features/trainees/components/WorkoutLogList/WorkoutLogList.tsx apps/dashboard/src/features/trainees/components/BodyTracking/BodyTracking.tsx apps/dashboard/src/features/trainees/components/TraineeAchievements/TraineeAchievements.tsx apps/dashboard/src/features/trainees/hooks/useTraineeTab.ts apps/dashboard/src/hooks/useSlashSearch.ts apps/dashboard/src/hooks/useEnterToBlur.ts apps/dashboard/src/features/nutritionLibrary/components/FoodToolbar/FoodToolbar.tsx apps/dashboard/src/features/exerciseLibrary/components/LibraryFilters/LibraryFilters.tsx
git commit -m "feat(dashboard): breadcrumb with the trainee, skeletons, last trainee tab, \"/\" to search, Enter finishes a number field"
```

```bash
git add -A -- apps/dashboard/src/hooks/useUndoToast.ts apps/dashboard/src/hooks/useHiddenItems.ts apps/dashboard/src/components/common/Toast apps/dashboard/src/copy/he.ts apps/dashboard/src/copy/en.ts apps/dashboard/src/features/nutrition/components/MealCard/MealCard.tsx apps/dashboard/src/features/nutrition/components/MealsSection/MealsSection.tsx apps/dashboard/src/features/nutrition/copy/he.ts apps/dashboard/src/features/nutrition/copy/en.ts apps/dashboard/src/features/nutritionLibrary/hooks/useFoods.ts apps/dashboard/src/features/nutritionLibrary/hooks/useTemplates.ts apps/dashboard/src/features/nutritionLibrary/pages/FoodLibraryPage/FoodLibraryPage.tsx apps/dashboard/src/features/nutritionLibrary/copy/he.ts apps/dashboard/src/features/nutritionLibrary/copy/en.ts
git commit -m "feat(dashboard): undo toast instead of confirm for meal, food and template delete"
```

```bash
git add -A -- docs/phase-reports/dashboard-fidelity.md
git commit -m "docs: coach dashboard fidelity report"
```

Optional — the screenshots are 23 MB (121 PNGs); commit them only if you want them in the repo:

```bash
git add -A -- docs/phase-reports/fidelity
git commit -m "docs: dashboard fidelity screenshots (reference, before, after)"
```

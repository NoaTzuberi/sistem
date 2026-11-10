# "תוכנית חדשה" as two steps — PREVIEW (waiting for approval)

## Summary

A static preview of the redesign is at `docs/design-preview/new-plan-flow.html` (gitignored). No app code has changed yet.

- **Step 1, "לאיזה שבוע?":**
  - the length switch, then the weeks as a vertical list of rows;
  - each row shows its relative label, the dates in bold, and a status chip: none = empty (empty drafts too), purple = draft, cherry = published ✓;
  - a selected draft row opens a purple card under it: "להמשיך בטיוטה" (opens the builder), "להתחיל מחדש" (goes to step 2), and a "מחיקת הטיוטה" link;
  - a published row opens a cherry card with "פתיחת התוכנית" only;
  - an empty row → "המשך";
  - in monthly mode, every row in the range takes the selected style, labeled "שבוע 1…4", and conflicts are listed in plain words.
- **Step 2, "איך להתחיל?":**
  - back + a chip with the chosen week or range;
  - three option cards with icons: מאפס / שכפול תוכנית שפורסמה (+ "בחירת תוכנית אחרת") / טיוטת AI;
  - a clear "חלוקת אימונים" row with a one-line explanation;
  - one pink button: "יצירת התוכנית", or "יצירה והחלפת הטיוטה" when replacing (then the confirm dialog).
- **One selected style everywhere:** a 2px pink border, a light pink tint and a pink dot.
- **No orange in this flow.**
- **Only one pink button at a time.** "ביטול" and back are quiet text buttons.
- **The step change:** a 240ms ease-out slide that comes from the reading end (RTL-aware). With reduced motion it is a fade.
- **No sideways scroll** at 1440px or 390px.

## Proposed new tokens (`domains/dashboard.css`)

`--color-new-plan-draft-soft` (#efe7ff = stat-purple-mist) · `--color-new-plan-draft-ink` (#5b2fd6) ·
`--color-new-plan-live-soft` (= primary-soft) · `--color-new-plan-live-ink` (= primary-deep) ·
`--color-new-plan-select-tint` (pink 5% on white) · `--transition-new-plan-step` (240ms).
The orange `--color-new-plan-notice-*` tokens from the last round would be removed.

## Copy (DRAFT)

| Where | he | en |
| --- | --- | --- |
| Step counter | שלב {n} מתוך 2 | Step {n} of 2 |
| Step 1 title | לאיזה שבוע? | Which week? |
| Step 2 title | איך להתחיל? | How to start? |
| Draft chip | טיוטה · {count} אימונים | Draft · {count} workouts |
| Published chip | פורסמה ✓ | Published ✓ |
| Range row label | שבוע {n} | Week {n} |
| Draft card title | יש כאן טיוטה עם {count} אימונים | There’s a draft here with {count} workouts |
| Draft card meta | נערכה לאחרונה ב־{date} | Last edited {date} |
| Continue / restart | להמשיך בטיוטה / להתחיל מחדש | Continue the draft / Start over |
| Delete link | מחיקת הטיוטה | Delete the draft |
| Published card | התוכנית של השבוע הזה כבר פורסמה · כדי לבנות מחדש, אפשר לשכפל אותה לשבוע אחר. | This week’s plan is already published · To rebuild, duplicate it to another week. |
| Published action | פתיחת התוכנית | Open the plan |
| Next | המשך | Continue |
| Monthly drafts | בשני שבועות בטווח כבר יש טיוטות (plural) | Two weeks in the range already have drafts |
| Monthly replace | להתחיל מחדש ולהחליף את הטיוטות | Start over and replace the drafts |
| Monthly published | בשבוע {week} כבר יש תוכנית שפורסמה · בחרי שבוע התחלה אחר או קצרי את התוכנית. | The week of {week} already has a published plan · Pick another start week or shorten the plan. |
| Range chip | {count} שבועות מ־{date} | {count} weeks from {date} |
| Duplicate option | שכפול תוכנית שפורסמה · בחירת תוכנית אחרת | Duplicate a published plan · Pick another plan |
| AI option | {count} אימונים לפי השאלון | {count} workouts from the questionnaire |
| Split row | חלוקת אימונים (Full Body / Upper-Lower…) · לבחור איך לחלק את האימונים בשבוע, לפי ההצעות של ה־AI | Training split (Full Body / Upper-Lower…) · Choose how the week’s workouts are split, from the AI’s suggestions |
| Create / replace | יצירת התוכנית / יצירה והחלפת הטיוטה | Create the plan / Create and replace the draft |

## Questions for you

1. **"Last edited" date:** the week picker doesn't send it yet. Adding it means one more field on the plan summary
   in `plan-weeks` (`updatedAt`). OK?
2. **The "מאפס" button wording:** last round "בניית תוכנית חדשה" replaced the pill wording. In this flow that pill
   is gone, and "להתחיל מחדש" leads to step 2. Should the step-2 card "מאפס" stay "מאפס"?
3. **Monthly, a published week in the range:** there is no "בחירת שבוע התחלה אחר" button. The message asks her to
   pick another row, and "המשך" stays disabled until she does.

## Screenshots

`docs/phase-reports/new-plan-flow/`:

- `before-*`: the popover as it is now;
- `after-0-all`, `after-1…6`: the preview states, the last one in English;
- `after-7-draft-390`: phone width.

## Suggested commits

```
git add -A -- docs/phase-reports/new-plan-flow.md docs/phase-reports/new-plan-flow
git commit -m "docs: new-plan two-step flow preview report with screenshots"
```

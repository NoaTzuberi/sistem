import type { CoachTraineeDetail, Language } from '@sistem/types';
import { dateFormat, describeNutritionPreferences, fill, formatDateShort, formatNumber, isolateLtr, labelList, sharedCopy } from '@sistem/shared';
import type { coachCopy } from '../copy';

type DetailsCopy = (typeof coachCopy)['he']['details'];

/** One read-only row of the details sheet. Rows without data are never built (no "—" rows). */
export interface DetailRow {
  id: 'age' | 'height' | 'startWeight' | 'goal' | 'days' | 'experience' | 'limitations' | 'nutrition' | 'coachingStart' | 'discipline' | 'plan';
  label: string;
  value: string;
  /** The muted line under the value (her birth date under her age). */
  sub?: string;
}

/** Full years between a 'YYYY-MM-DD' birth date and today ('YYYY-MM-DD', her zone). */
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.slice(0, 10).split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

/** "פרטים אישיים" without the email (that row has its own actions): age, height, starting weight. */
export function personalRows(trainee: CoachTraineeDetail, today: string, copy: DetailsCopy, language: Language): DetailRow[] {
  const answers = trainee.onboarding?.answers;
  const units = sharedCopy[language].units;
  const rows: DetailRow[] = [];
  if (answers?.birthDate) {
    rows.push({
      id: 'age',
      label: copy.age,
      value: formatNumber(ageOn(answers.birthDate, today), language),
      sub: formatDateShort(answers.birthDate.slice(0, 10), language),
    });
  }
  if (answers?.height !== undefined) rows.push({ id: 'height', label: copy.height, value: `${formatNumber(answers.height, language)} ${units.cm}` });
  // The questionnaire's weight is her first weigh-in (the coach always reads kg).
  if (answers?.weight !== undefined) rows.push({ id: 'startWeight', label: copy.startWeight, value: `${formatNumber(answers.weight, language)} ${units.kg}` });
  return rows;
}

/** "מטרות והעדפות": her questionnaire answers, only the ones she gave. */
export function goalRows(trainee: CoachTraineeDetail, copy: DetailsCopy, language: Language): DetailRow[] {
  const answers = trainee.onboarding?.answers;
  if (!answers) return [];
  const shared = sharedCopy[language];
  const options = shared.onboardingOptions;
  const rows: DetailRow[] = [];
  if (answers.goals?.length) rows.push({ id: 'goal', label: copy.goal, value: labelList(answers.goals, options.goals, language) });
  const frequency = answers.trainingFrequency;
  if (frequency) {
    const days = frequency.minDays === frequency.maxDays ? `${frequency.minDays}` : `${frequency.minDays}–${frequency.maxDays}`;
    rows.push({ id: 'days', label: copy.days, value: isolateLtr(days) });
  }
  if (answers.trainingExperience) rows.push({ id: 'experience', label: copy.experience, value: options.trainingExperience[answers.trainingExperience] });
  // "Nothing to add" is an answer, not a limitation.
  const flags = (answers.recovery?.flags ?? []).filter((flag) => flag !== 'nothing_to_add');
  const limitations = [flags.length > 0 ? labelList(flags, options.recoveryFlags, language) : '', answers.recovery?.notes?.trim() ?? '']
    .filter(Boolean)
    .join(' · ');
  if (limitations) rows.push({ id: 'limitations', label: copy.limitations, value: limitations });
  const nutrition = nutritionNote(trainee, language);
  if (nutrition) rows.push({ id: 'nutrition', label: copy.nutrition, value: nutrition });
  return rows;
}

/** Diet, styles, religious rules, intolerances and allergies in one line; empty when none applies. */
function nutritionNote(trainee: CoachTraineeDetail, language: Language): string {
  const preferences = trainee.onboarding?.answers?.nutritionPreferences;
  if (!preferences) return '';
  const common = sharedCopy[language].common;
  const empty = new Set(['—', common.noneChosen, common.notAnswered]);
  // The first five rows are diet → allergies (nutritionDisplay); the rest are tastes and meals.
  return describeNutritionPreferences(preferences, language)
    .slice(0, 5)
    .filter((row, index) => !empty.has(row.value) && !(index === 0 && preferences.dietType === 'none' && !preferences.dietTypeDetails))
    .map((row) => row.value)
    .join(' · ');
}

/** "ליווי": when it started, her discipline (when set), and this week's plan (weekly / week N of M / none). */
export function coachingRows(trainee: CoachTraineeDetail, copy: DetailsCopy, language: Language): DetailRow[] {
  const rows: DetailRow[] = [
    { id: 'coachingStart', label: copy.coachingStart, value: formatCoachingDate(trainee.coachingStartedAt, trainee.timezone, language) },
  ];
  if (trainee.discipline) rows.push({ id: 'discipline', label: copy.discipline, value: trainee.discipline });
  rows.push({
    id: 'plan',
    label: copy.plan,
    value: trainee.planBlock
      ? fill(copy.planBlock, { week: trainee.planBlock.week, length: trainee.planBlock.lengthWeeks })
      : trainee.thisWeek
        ? copy.planWeekly
        : copy.noPlan,
  });
  return rows;
}

/** '12 בנוב׳ 2026' in her zone (the day she joined, as she saw it). */
export function formatCoachingDate(iso: string, timezone: string, language: Language): string {
  return dateFormat(language, { timeZone: timezone, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

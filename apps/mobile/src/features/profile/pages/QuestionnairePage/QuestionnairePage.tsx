import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IconBarbell, IconCalendarWeek, IconFlag, IconHeartbeat, IconRun, IconSalad, IconTarget, IconUser } from '@tabler/icons-react';
import type { OnboardingAnswers } from '@sistem/types';
import {
  describeNutritionPreferences,
  fill,
  formatDateOnly,
  roundOneDecimal,
  sharedCopy,
  toDisplayWeight,
  unitLabel,
  useCopy,
  useI18n,
} from '@sistem/shared';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { Toast } from '../../../../components/common/Toast/Toast';
import { useToast } from '../../../../hooks/useToast';
import { ROUTES } from '../../../../app/config/routes';
import { ACTIVITIES } from '../../../onboarding/data/activities';
import { EQUIPMENT_OPTIONS, GOAL_OPTIONS } from '../../../onboarding/data/options';
import { SubScreenHeader } from '../../components/SubScreenHeader/SubScreenHeader';
import { QuestionnaireCard } from '../../components/QuestionnaireCard/QuestionnaireCard';
import { AnswerChips } from '../../components/AnswerChips/AnswerChips';
import { FrequencyPips } from '../../components/FrequencyPips/FrequencyPips';
import { ValueScoreboard } from '../../components/ValueScoreboard/ValueScoreboard';
import type { ScoreValue } from '../../components/ValueScoreboard/ValueScoreboard';
import { ClampText } from '../../components/ClampText/ClampText';
import { QuestionnaireSheet } from '../../components/QuestionnaireSheet/QuestionnaireSheet';
import { QUESTIONNAIRE_SECTIONS, ageFromBirthDate, isSectionAnswered } from '../../data/questionnaireSections';
import type { QuestionnaireStep } from '../../data/questionnaireSections';
import { useQuestionnaire } from '../../hooks/useQuestionnaire';
import { profileCopy } from '../../copy';
import './QuestionnairePage.css';

const ICONS: Record<QuestionnaireStep, ReactNode> = {
  basic_profile: <IconUser size={18} />,
  goals: <IconFlag size={18} />,
  frequency: <IconCalendarWeek size={18} />,
  activities: <IconRun size={18} />,
  exercise_preferences: <IconTarget size={18} />,
  recovery: <IconHeartbeat size={18} />,
  equipment: <IconBarbell size={18} />,
  nutrition_preferences: <IconSalad size={18} />,
};

const EMOJI = new Map<string, string | undefined>([
  ...GOAL_OPTIONS.map((option) => [option.id, option.emoji] as const),
  ...EQUIPMENT_OPTIONS.map((option) => [option.id, option.emoji] as const),
  ...ACTIVITIES.map((activity) => [activity.id, activity.emoji] as const),
]);

const chipsOf = (ids: readonly string[], labels: Readonly<Record<string, string>>, withEmoji = false) =>
  ids.map((id) => ({ id, label: labels[id] ?? id, emoji: withEmoji ? EMOJI.get(id) : undefined }));

/**
 * "השאלון שלי" (PRD §5.5, direction B): her onboarding answers as the coach sees them, one white card
 * per questionnaire section in the onboarding's order. The pencil opens that section in a sheet and
 * saves it as the onboarding does (PATCH /onboarding).
 */
export function QuestionnairePage() {
  const copy = useCopy(profileCopy);
  const shared = useCopy(sharedCopy);
  const { language, plural } = useI18n();
  const questionnaire = useQuestionnaire();
  const [editing, setEditing] = useState<QuestionnaireStep | null>(null);
  const [lastEdited, setLastEdited] = useState<QuestionnaireStep>('goals');
  const { toastMessage, showToast } = useToast();

  const titles = shared.onboardingSections;
  const options = shared.onboardingOptions;
  const sectionTitle: Record<QuestionnaireStep, string> = {
    basic_profile: titles.basicProfile,
    goals: titles.goals,
    frequency: titles.trainingFrequency,
    activities: titles.activities,
    exercise_preferences: titles.exercisePreferences,
    recovery: titles.recovery,
    equipment: titles.equipment,
    nutrition_preferences: titles.nutritionAndGoal,
  };
  const weightUnit = questionnaire.onboarding?.units?.weight ?? 'kg';
  const kg = unitLabel(weightUnit, language);

  function openSheet(step: QuestionnaireStep) {
    setLastEdited(step);
    setEditing(step);
  }

  function renderAnswers(step: QuestionnaireStep, answers: OnboardingAnswers): ReactNode {
    switch (step) {
      case 'basic_profile': {
        const values: ScoreValue[] = [
          ...(answers.weight !== undefined
            ? [{ id: 'weight', value: String(roundOneDecimal(toDisplayWeight(answers.weight, weightUnit))), unit: kg, label: titles.weight }]
            : []),
          ...(answers.height !== undefined ? [{ id: 'height', value: String(answers.height), unit: shared.units.cm, label: titles.height }] : []),
          ...(answers.birthDate ? [{ id: 'age', value: String(ageFromBirthDate(answers.birthDate)), label: copy.questionnaire.age }] : []),
        ];
        const gender = answers.gender ? (options.gender as Record<string, string>)[answers.gender] : undefined;
        return (
          <>
            {values.length > 0 && <ValueScoreboard values={values} />}
            {gender && <AnswerChips label={titles.gender} chips={[{ id: 'gender', label: gender }]} />}
          </>
        );
      }
      case 'goals':
        return <AnswerChips chips={chipsOf(answers.goals, options.goals, true)} />;
      case 'frequency': {
        const frequency = answers.trainingFrequency;
        return (
          <>
            {frequency && <FrequencyPips minDays={frequency.minDays} maxDays={frequency.maxDays} flexible={frequency.flexibleSchedule} />}
            {answers.trainingExperience && (
              <AnswerChips
                label={titles.trainingExperience}
                chips={[{ id: answers.trainingExperience, label: options.trainingExperience[answers.trainingExperience] }]}
              />
            )}
          </>
        );
      }
      case 'activities':
        return <AnswerChips chips={chipsOf(answers.preferredActivities, options.activities, true)} />;
      case 'exercise_preferences': {
        const preferences = answers.exercisePreferences;
        return (
          <>
            {preferences && preferences.muscleFocus.length > 0 && (
              <AnswerChips label={titles.muscleFocus} chips={chipsOf(preferences.muscleFocus, options.muscleFocus)} />
            )}
            {preferences?.favoriteExerciseNotes?.trim() && <ClampText label={titles.favoriteExercises} text={preferences.favoriteExerciseNotes.trim()} />}
            {preferences?.improvementExerciseNotes?.trim() && <ClampText label={titles.wantsToImprove} text={preferences.improvementExerciseNotes.trim()} />}
          </>
        );
      }
      case 'recovery':
        return (
          <>
            {answers.recovery && answers.recovery.flags.length > 0 && <AnswerChips chips={chipsOf(answers.recovery.flags, options.recoveryFlags)} />}
            {answers.recovery?.notes?.trim() && <ClampText label={titles.notes} text={answers.recovery.notes.trim()} />}
          </>
        );
      case 'equipment':
        return <AnswerChips chips={chipsOf(answers.equipment, options.equipment, true)} />;
      case 'nutrition_preferences': {
        const goal = answers.weightGoal;
        const timeframe = goal?.timeframe
          ? goal.timeframe.kind === 'weeks'
            ? plural(shared.nutrition.goalWeeks, goal.timeframe.weeks)
            : fill(shared.nutrition.goalByDate, { date: formatDateOnly(goal.timeframe.date, language) })
          : null;
        return (
          <>
            {goal && (
              <ValueScoreboard
                values={[
                  { id: 'target', value: String(roundOneDecimal(toDisplayWeight(goal.targetWeightKg, weightUnit))), unit: kg, label: copy.weightGoalLabel },
                  ...(timeframe ? [{ id: 'timeframe', value: timeframe, label: titles.weightGoal }] : []),
                ]}
              />
            )}
            {answers.nutritionPreferences && (
              <dl className="qn-rows">
                {describeNutritionPreferences(answers.nutritionPreferences, language).map((row) => (
                  <div key={row.label} className="qn-row">
                    <dt>{row.label}</dt>
                    <dd dir="auto">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </>
        );
      }
    }
  }

  const { onboarding, formState } = questionnaire;
  const answers = onboarding?.answers;
  const lastTint = QUESTIONNAIRE_SECTIONS.find((section) => section.step === lastEdited)?.tint ?? 'goals';

  return (
    <AppShell bleed>
      <div className="qn-screen">
        <SubScreenHeader title={copy.questionnaireTitle} fallbackPath={ROUTES.PROFILE} subtitle={copy.questionnaire.intro} />

        <div className="qn-content">
          {!onboarding ? (
            <StateMessage onRetry={questionnaire.error ? questionnaire.reload : undefined}>{questionnaire.error ?? shared.common.loading}</StateMessage>
          ) : questionnaire.isEmpty || !answers ? (
            <section className="qn-empty">
              <p className="qn-empty-text">{copy.questionnaire.emptyText}</p>
              <Link to={ROUTES.ONBOARDING} className="qn-empty-button">
                {copy.questionnaire.fill}
              </Link>
            </section>
          ) : (
            <>
              {QUESTIONNAIRE_SECTIONS.map(({ step, tint }) => (
                <QuestionnaireCard
                  key={step}
                  id={step}
                  title={sectionTitle[step]}
                  eyebrow={copy.eyebrow.questionnaire[step]}
                  icon={ICONS[step]}
                  tint={tint}
                  answered={isSectionAnswered(step, answers)}
                  onEdit={() => openSheet(step)}
                >
                  {renderAnswers(step, answers)}
                </QuestionnaireCard>
              ))}
              <Link to={ROUTES.ONBOARDING} className="qn-redo">
                {copy.redoOnboarding}
              </Link>
            </>
          )}
        </div>

        <QuestionnaireSheet
          step={editing}
          title={sectionTitle[lastEdited]}
          tint={lastTint}
          formState={formState}
          onClose={() => setEditing(null)}
          onSave={questionnaire.save}
          onSaved={() => showToast(copy.questionnaire.saved)}
        />
        <Toast message={toastMessage} />
      </div>
    </AppShell>
  );
}

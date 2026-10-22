import { useEffect, useState } from 'react';
import { fill, getActiveLanguage, sharedCopy, unitLabel, useCopy, useI18n } from '@sistem/shared';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import { ACTIVITIES } from '../../../onboarding/data/activities';
import { EQUIPMENT_OPTIONS, GOAL_OPTIONS, MUSCLE_FOCUS_OPTIONS, RECOVERY_FLAG_OPTIONS } from '../../../onboarding/data/options';
import { NutritionPreferencesStep } from '../../../onboarding/steps/NutritionPreferencesStep/NutritionPreferencesStep';
import { onboardingCopy } from '../../../onboarding/copy';
import type { OnboardingFormState } from '../../../onboarding/types';
import { isSectionDraftValid, toggleId } from '../../data/questionnaireSections';
import type { QuestionnaireStep, QuestionnaireTint } from '../../data/questionnaireSections';
import { QnStepper } from '../QnStepper/QnStepper';
import { profileCopy } from '../../copy';
import './QuestionnaireSheet.css';

const GENDER_IDS = ['male', 'female', 'other'] as const;
const EXPERIENCE_IDS = ['new', 'some', 'experienced'] as const;
// The server's limits (onboarding.validation.ts): weight 20–400 kg, height 50–300 cm.
const WEIGHT_RANGE = { kg: { min: 20, max: 400 }, lb: { min: 44, max: 882 } } as const;
const HEIGHT_RANGE = { min: 50, max: 300 };

interface ChipOption {
  id: string;
  label: string;
  emoji?: string;
}

/** Toggle chips (multi, or single when `single`): selected = the section's tint, never a filled block. */
function ChipPicker({ label, options, selected, onToggle }: { label: string; options: ChipOption[]; selected: readonly string[]; onToggle: (id: string) => void }) {
  return (
    <div className="qn-field" role="group" aria-label={label}>
      <span className="qn-field-label">{label}</span>
      <div className="qn-pick">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="qn-pick-chip"
            aria-pressed={selected.includes(option.id)}
            onClick={() => onToggle(option.id)}
          >
            {option.emoji && (
              <span className="qn-pick-emoji" aria-hidden="true">
                {option.emoji}
              </span>
            )}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="qn-field">
      <span className="qn-field-label">{label}</span>
      <textarea className="qn-textarea" dir="auto" rows={3} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

interface QuestionnaireSheetProps {
  /** The section being edited; null = closed. */
  step: QuestionnaireStep | null;
  title: string;
  tint: QuestionnaireTint;
  /** Her saved answers as the onboarding's form state — each opening starts from it. */
  formState: OnboardingFormState | null;
  onClose: () => void;
  onSave: (step: QuestionnaireStep, draft: OnboardingFormState) => Promise<void>;
  onSaved: () => void;
}

/**
 * One section's editor in a bottom sheet, with the onboarding's input types (chips, steppers, text).
 * "Nutrition & goal" reuses the onboarding's own step. Saves that step only (PATCH /onboarding).
 */
export function QuestionnaireSheet({ step, title, tint, formState, onClose, onSave, onSaved }: QuestionnaireSheetProps) {
  const copy = useCopy(profileCopy);
  const shared = useCopy(sharedCopy);
  const flow = useCopy(onboardingCopy);
  const { language } = useI18n();
  const [shownStep, setShownStep] = useState<QuestionnaireStep | null>(step);
  const [draft, setDraft] = useState<OnboardingFormState | null>(formState);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Every opening starts from her saved answers; the last section stays drawn while the sheet closes.
  useEffect(() => {
    if (!step) return;
    setShownStep(step);
    setDraft(formState);
    setError(null);
  }, [step, formState]);

  const update = (patch: Partial<OnboardingFormState>) => setDraft((current) => (current ? { ...current, ...patch } : current));
  const options = shared.onboardingOptions;
  const labels = shared.onboardingSections;
  const weightUnit = draft?.units.weight ?? 'kg';

  async function save() {
    if (!shownStep || !draft) return;
    setError(null);
    setIsSaving(true);
    try {
      await onSave(shownStep, draft);
      onSaved();
      onClose();
    } catch (caught) {
      setError((caught instanceof Error && caught.message) || profileCopy[getActiveLanguage()].questionnaire.saveError);
    } finally {
      setIsSaving(false);
    }
  }

  function renderEditor(section: QuestionnaireStep, form: OnboardingFormState) {
    switch (section) {
      case 'basic_profile':
        return (
          <>
            <QnStepper
              label={labels.weight}
              value={form.weight}
              onChange={(weight) => update({ weight })}
              step={0.5}
              {...WEIGHT_RANGE[weightUnit]}
              unit={unitLabel(weightUnit, language)}
              upLabel={fill(copy.stepUp, { step: 0.5, unit: unitLabel(weightUnit, language) })}
              downLabel={fill(copy.stepDown, { step: 0.5, unit: unitLabel(weightUnit, language) })}
              editable
            />
            <QnStepper
              label={labels.height}
              value={form.height}
              onChange={(height) => update({ height })}
              step={1}
              {...HEIGHT_RANGE}
              unit={shared.units.cm}
              upLabel={fill(copy.stepUp, { step: 1, unit: shared.units.cm })}
              downLabel={fill(copy.stepDown, { step: 1, unit: shared.units.cm })}
              editable
            />
            <label className="qn-field">
              <span className="qn-field-label">{labels.birthDate}</span>
              <input className="qn-input" type="date" autoComplete="bday" value={form.birthDate} onChange={(event) => update({ birthDate: event.target.value })} />
            </label>
            <ChipPicker
              label={flow.basicProfile.gender}
              options={GENDER_IDS.map((id) => ({ id, label: options.gender[id] }))}
              selected={form.gender ? [form.gender] : []}
              onToggle={(id) => update({ gender: form.gender === id ? '' : id })}
            />
          </>
        );
      case 'goals':
        return (
          <ChipPicker
            label={flow.chooseAll}
            options={GOAL_OPTIONS.map((goal) => ({ id: goal.id, label: options.goals[goal.id], emoji: goal.emoji }))}
            selected={form.goals}
            onToggle={(id) => update({ goals: toggleId(form.goals, id) })}
          />
        );
      case 'frequency': {
        const frequency = form.trainingFrequency;
        return (
          <>
            <QnStepper
              label={flow.frequency.minDays}
              value={String(frequency.minDays)}
              onChange={(value) => update({ trainingFrequency: { ...frequency, minDays: Number(value), maxDays: Math.max(Number(value), frequency.maxDays) } })}
              step={1}
              min={1}
              max={7}
              upLabel={copy.questionnaire.dayUp}
              downLabel={copy.questionnaire.dayDown}
            />
            <QnStepper
              label={flow.frequency.maxDays}
              value={String(frequency.maxDays)}
              onChange={(value) => update({ trainingFrequency: { ...frequency, maxDays: Number(value), minDays: Math.min(Number(value), frequency.minDays) } })}
              step={1}
              min={1}
              max={7}
              upLabel={copy.questionnaire.dayUp}
              downLabel={copy.questionnaire.dayDown}
            />
            <ChipPicker
              label={labels.flexibleSchedule}
              options={[{ id: 'flexible', label: flow.frequency.flexible }]}
              selected={frequency.flexibleSchedule ? ['flexible'] : []}
              onToggle={() => update({ trainingFrequency: { ...frequency, flexibleSchedule: !frequency.flexibleSchedule } })}
            />
            <ChipPicker
              label={flow.frequency.experienceLabel}
              options={EXPERIENCE_IDS.map((id) => ({ id, label: options.trainingExperience[id] }))}
              selected={form.trainingExperience ? [form.trainingExperience] : []}
              onToggle={(id) => update({ trainingExperience: form.trainingExperience === id ? null : (id as (typeof EXPERIENCE_IDS)[number]) })}
            />
          </>
        );
      }
      case 'activities':
        return (
          <ChipPicker
            label={flow.chooseAll}
            options={ACTIVITIES.map((activity) => ({ id: activity.id, label: options.activities[activity.id], emoji: activity.emoji }))}
            selected={form.preferredActivities}
            onToggle={(id) => update({ preferredActivities: toggleId(form.preferredActivities, id) })}
          />
        );
      case 'exercise_preferences': {
        const preferences = form.exercisePreferences;
        return (
          <>
            <ChipPicker
              label={flow.exercisePreferences.muscleLabel}
              options={MUSCLE_FOCUS_OPTIONS.map((muscle) => ({ id: muscle.id, label: options.muscleFocus[muscle.id] }))}
              selected={preferences.muscleFocus}
              onToggle={(id) => update({ exercisePreferences: { ...preferences, muscleFocus: toggleId(preferences.muscleFocus, id) } })}
            />
            <TextField
              label={flow.exercisePreferences.enjoyLabel}
              value={preferences.favoriteExerciseNotes}
              onChange={(favoriteExerciseNotes) => update({ exercisePreferences: { ...preferences, favoriteExerciseNotes } })}
            />
            <TextField
              label={flow.exercisePreferences.improveLabel}
              value={preferences.improvementExerciseNotes}
              onChange={(improvementExerciseNotes) => update({ exercisePreferences: { ...preferences, improvementExerciseNotes } })}
            />
          </>
        );
      }
      case 'recovery': {
        const recovery = form.recovery;
        return (
          <>
            <ChipPicker
              label={flow.recovery.title}
              options={RECOVERY_FLAG_OPTIONS.map((flag) => ({ id: flag.id, label: options.recoveryFlags[flag.id] }))}
              selected={recovery.flags}
              onToggle={(id) => update({ recovery: { ...recovery, flags: toggleId(recovery.flags, id) } })}
            />
            {/* As in onboarding: the notes field belongs to "injury or limitation". */}
            {recovery.flags.includes('has_injury_or_limitation') && (
              <TextField label={flow.recovery.notesLabel} value={recovery.notes} onChange={(notes) => update({ recovery: { ...recovery, notes } })} />
            )}
            <p className="qn-sheet-note">{flow.recovery.note}</p>
          </>
        );
      }
      case 'equipment':
        return (
          <ChipPicker
            label={flow.chooseAll}
            options={EQUIPMENT_OPTIONS.map((item) => ({ id: item.id, label: options.equipment[item.id], emoji: item.emoji }))}
            selected={form.equipment}
            onToggle={(id) => update({ equipment: toggleId(form.equipment, id) })}
          />
        );
      case 'nutrition_preferences':
        return (
          <div className="qn-sheet-nutrition">
            <NutritionPreferencesStep formState={form} updateFormState={update} />
          </div>
        );
    }
  }

  const canSave = Boolean(shownStep && draft && isSectionDraftValid(shownStep, draft)) && !isSaving;

  return (
    <BottomSheet
      isOpen={step !== null}
      onClose={onClose}
      labelledBy="qn-sheet-title"
      className={`qn-sheet qn-tint-${tint}`}
      footer={
        <div className="qn-sheet-actions">
          <button type="button" className="qn-sheet-button" onClick={onClose}>
            {copy.cancel}
          </button>
          <button type="button" className="qn-sheet-button qn-sheet-save" disabled={!canSave} onClick={() => void save()}>
            {isSaving ? shared.common.saving : copy.save}
          </button>
        </div>
      }
    >
      <h2 className="qn-sheet-title display-title" id="qn-sheet-title">
        {title}
      </h2>
      <div className="qn-sheet-fields">{shownStep && draft && renderEditor(shownStep, draft)}</div>
      {error && (
        <p className="qn-sheet-error" role="alert">
          {error}
        </p>
      )}
    </BottomSheet>
  );
}

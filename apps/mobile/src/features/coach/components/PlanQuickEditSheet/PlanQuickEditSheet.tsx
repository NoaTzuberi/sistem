import type { ReactNode } from 'react';
import { IconArrowsExchange, IconArrowsLeftRight, IconCopy, IconDeviceDesktop } from '@tabler/icons-react';
import { addDaysToDate, fill, humanizeId, sharedCopy, useCopy, useLanguage, weekdayName } from '@sistem/shared';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { coachCopy } from '../../copy';
import { dayMonthOf } from '../../data/coachMode';
import type { SwapOption, usePlanQuickEdit } from '../../hooks/usePlanQuickEdit';
import { CoachSheet } from '../CoachSheet/CoachSheet';
import { SheetButton, SheetButtonRow } from '../SheetButton/SheetButton';
import './PlanQuickEditSheet.css';

const DAYS = [0, 1, 2, 3, 4, 5, 6];

interface OptionProps {
  icon: ReactNode;
  label: string;
  hint: string;
  onSelect: () => void;
  disabled?: boolean;
  muted?: boolean;
}

function Option({ icon, label, hint, onSelect, disabled, muted }: OptionProps) {
  return (
    <button type="button" className={'ce-option' + (muted ? ' ce-option-muted' : '')} onClick={onSelect} disabled={disabled}>
      <span className="ce-option-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="ce-option-text">
        {label}
        <small>{hint}</small>
      </span>
    </button>
  );
}

function SwapList({ title, options, onPick, disabled }: { title: string; options: SwapOption[]; onPick: (id: string) => void; disabled: boolean }) {
  if (options.length === 0) return null;
  return (
    <section className="ce-swap-group">
      <h3 className="ce-swap-title">{title}</h3>
      <ul className="ce-list">
        {options.map((option) => (
          <li key={option.exerciseId}>
            <button type="button" className="ce-row" disabled={disabled} onClick={() => onPick(option.exerciseId)}>
              <bdi className="ce-row-name">{option.name}</bdi>
              {option.equipment.length > 0 && <span className="ce-row-meta">{option.equipment.map(humanizeId).join(' · ')}</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "עריכה קלה" (docs/design/coach-app.html): the workout, then move / swap / duplicate / build in the dashboard. */
export function PlanQuickEditSheet({ edit }: { edit: ReturnType<typeof usePlanQuickEdit> }) {
  const coach = useCopy(coachCopy);
  const copy = coach.edit;
  const shared = useCopy(sharedCopy);
  const language = useLanguage();
  const { plan, workout, step } = edit;

  const dayLabel = (dayOfWeek: number | undefined) =>
    dayOfWeek === undefined || !plan ? copy.noDay : `${weekdayName(dayOfWeek, language, 'short')} ${dayMonthOf(addDaysToDate(plan.weekStartDate, dayOfWeek))}`;

  let title = copy.title;
  let subtitle: ReactNode = workout ? `${workout.title} · ${dayLabel(workout.dayOfWeek)}` : undefined;
  if (step === 'move' && workout) {
    title = copy.moveTitle;
    subtitle =
      workout.dayOfWeek === undefined
        ? fill(copy.moveNoDay, { title: workout.title })
        : fill(copy.moveCurrent, { title: workout.title, day: weekdayName(workout.dayOfWeek, language, 'short') });
  }
  if (step === 'swapPick') title = copy.swapTitle;
  if (step === 'swapReplace' && edit.exercise) {
    title = fill(copy.swapWithTitle, { name: edit.exercise.exercise?.name ?? '' });
    subtitle = copy.swapKeeps;
  }

  const workoutIsDone = workout ? edit.isDone(workout) : false;
  const canSwap = workout !== null && !workoutIsDone && workout.kind !== 'cardio' && workout.exercises.length > 0;

  return (
    <CoachSheet isOpen={edit.isOpen} onClose={edit.close} title={title} subtitle={subtitle}>
      {edit.loadError && <StateMessage onRetry={() => void edit.open(workout?.id)}>{coach.plansLoadError}</StateMessage>}

      {step === 'options' && edit.plans && (
        <>
          {!plan && <p className="ce-note">{copy.noPlan}</p>}
          {edit.workouts.length > 1 && (
            <div className="ce-workouts" role="group" aria-label={copy.workoutsLabel}>
              {edit.workouts.map((entry) => (
                <button key={entry.id} type="button" className="ce-workout" aria-pressed={entry.id === workout?.id} onClick={() => edit.selectWorkout(entry.id)}>
                  <bdi>{entry.title}</bdi>
                </button>
              ))}
            </div>
          )}
          <div className="ce-options">
            {workout && (
              <Option
                icon={<IconArrowsLeftRight size={18} stroke={2} />}
                label={copy.move}
                hint={workoutIsDone ? copy.doneHint : copy.moveHint}
                onSelect={edit.startMove}
                disabled={workoutIsDone}
              />
            )}
            {workout && workout.kind !== 'cardio' && (
              <Option
                icon={<IconArrowsExchange size={18} stroke={2} />}
                label={copy.swap}
                hint={workoutIsDone ? copy.doneHint : copy.swapHint}
                onSelect={edit.startSwap}
                disabled={!canSwap}
              />
            )}
            {plan && (
              <Option
                icon={<IconCopy size={18} stroke={2} />}
                label={copy.duplicate}
                hint={edit.nextWeekTaken ? copy.nextTaken : copy.duplicateHint}
                onSelect={() => void edit.duplicateWeek()}
                disabled={edit.isWorking || edit.nextWeekTaken}
              />
            )}
            {edit.dashboardUrl && (
              <Option icon={<IconDeviceDesktop size={18} stroke={2} />} label={copy.desk} hint={copy.deskHint} onSelect={edit.openDashboard} muted />
            )}
          </div>
        </>
      )}

      {step === 'move' && workout && (
        <>
          <div className="ce-days" role="group" aria-label={copy.daysLabel}>
            {DAYS.map((dayIndex) => (
              <button
                key={dayIndex}
                type="button"
                className="ce-day"
                aria-pressed={edit.day === dayIndex}
                aria-label={weekdayName(dayIndex, language, 'long')}
                disabled={!edit.isDayOpen(dayIndex)}
                onClick={() => edit.setDay(dayIndex)}
              >
                {weekdayName(dayIndex, language, 'short')}
              </button>
            ))}
          </div>
          <SheetButtonRow>
            <SheetButton onClick={edit.back} disabled={edit.isWorking}>
              {copy.back}
            </SheetButton>
            <SheetButton
              variant="primary"
              onClick={() => void edit.saveMove()}
              disabled={edit.isWorking || edit.day === null || edit.day === workout.dayOfWeek}
              aria-busy={edit.isWorking}
            >
              {copy.moveSave}
            </SheetButton>
          </SheetButtonRow>
        </>
      )}

      {step === 'swapPick' && workout && (
        <>
          <ul className="ce-list">
            {workout.exercises.map((entry) => (
              <li key={entry.id}>
                <button type="button" className="ce-row" onClick={() => void edit.pickExercise(entry)}>
                  <bdi className="ce-row-name">{entry.exercise?.name ?? entry.exerciseId}</bdi>
                  {entry.exercise?.primaryMuscles.length ? <span className="ce-row-meta">{entry.exercise.primaryMuscles.map(humanizeId).join(' · ')}</span> : null}
                </button>
              </li>
            ))}
          </ul>
          <SheetButtonRow>
            <SheetButton onClick={edit.back}>{copy.back}</SheetButton>
            <SheetButton onClick={edit.close}>{copy.cancel}</SheetButton>
          </SheetButtonRow>
        </>
      )}

      {step === 'swapReplace' && (
        <>
          {edit.swapError && <StateMessage onRetry={() => edit.exercise && void edit.pickExercise(edit.exercise)}>{copy.swapLoadError}</StateMessage>}
          {!edit.swapOptions && !edit.swapError && <StateMessage>{shared.common.loading}</StateMessage>}
          {edit.swapOptions && edit.swapOptions.family.length + edit.swapOptions.pattern.length === 0 && <p className="ce-note">{copy.swapNone}</p>}
          {edit.swapOptions && (
            <>
              <SwapList title={copy.swapFamily} options={edit.swapOptions.family} onPick={(id) => void edit.swapTo(id)} disabled={edit.isWorking} />
              <SwapList title={copy.swapPattern} options={edit.swapOptions.pattern} onPick={(id) => void edit.swapTo(id)} disabled={edit.isWorking} />
            </>
          )}
          <SheetButtonRow>
            <SheetButton onClick={edit.back} disabled={edit.isWorking}>
              {copy.back}
            </SheetButton>
            <SheetButton onClick={edit.close} disabled={edit.isWorking}>
              {copy.cancel}
            </SheetButton>
          </SheetButtonRow>
        </>
      )}
    </CoachSheet>
  );
}

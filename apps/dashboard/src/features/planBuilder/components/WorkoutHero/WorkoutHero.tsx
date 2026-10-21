import { useState } from 'react';
import { dayNames, useCopy, useLanguage, workoutTypeLabel } from '@sistem/shared';
import type { TrainingConfig, WorkoutTypeConfig } from '@sistem/types';
import { ActionMenu } from '../../../../components/common/ActionMenu/ActionMenu';
import type { ActionMenuItem } from '../../../../components/common/ActionMenu/ActionMenu';
import { estimateWorkoutMinutes, workoutSetCount } from '../../data/planStats';
import type { DraftWorkout } from '../../types';
import { planBuilderCopy } from '../../copy';
import './WorkoutHero.css';

interface WorkoutHeroProps {
  workout: DraftWorkout;
  /** The coach's workout types (null while loading). */
  config: TrainingConfig | null;
  /** This workout's type in her config; undefined for a free workout or a type she removed. */
  type: WorkoutTypeConfig | undefined;
  /** The muscle groups the workout already covers (its slots that have exercises). */
  coveredGroups: string[];
  /** The band's "⋯": move, duplicate, remove. */
  menuItems: ActionMenuItem[];
  onChange: (workout: DraftWorkout) => void;
  /** Omitted for a cardio workout: it has no slot template, so no type select. */
  onTypeChange?: (typeId: string) => void;
  /** The three big numbers; omitted = a strength workout's (exercises / sets / minutes). */
  stats?: HeroStat[];
}

export interface HeroStat {
  id: string;
  label: string;
  value: string;
}

/**
 * The top of the selected workout: a soft cloud in the workout's own color, with its title, its
 * day / type / note chips, and the workout in three big numbers.
 */
export function WorkoutHero({ workout, config, type, coveredGroups, menuItems, onChange, onTypeChange, stats }: WorkoutHeroProps) {
  const language = useLanguage();
  const copy = useCopy(planBuilderCopy);
  // The notes field is tucked behind its chip; the chip says whether there is a note.
  const [showNotes, setShowNotes] = useState(false);
  const hasNotes = workout.notes.trim() !== '';

  return (
    <div className="workout-hero">
      {/* The cloud has its own clipped layer, so the band itself can let its menu hang past its edge. */}
      <div className="workout-hero-cloud" aria-hidden="true" />

      <div className="workout-hero-top">
        <span className="workout-hero-dot" aria-hidden="true" />
        <input
          className="workout-hero-title"
          type="text"
          aria-label={copy.workoutTitle}
          value={workout.title}
          onChange={(event) => onChange({ ...workout, title: event.target.value })}
        />
        <ActionMenu label={copy.workoutActions} variant="ghost" items={menuItems} />
      </div>

      <div className="workout-hero-chips">
        <label className="hero-chip hero-chip-select">
          <span className="visually-hidden">{copy.day}</span>
          <select
            className="hero-select"
            value={workout.dayOfWeek ?? ''}
            onChange={(event) => onChange({ ...workout, dayOfWeek: event.target.value === '' ? undefined : Number(event.target.value) })}
          >
            <option value="">{copy.noDay}</option>
            {dayNames(language).map((label, day) => (
              <option key={label} value={day}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {onTypeChange && (
          <label className="hero-chip hero-chip-select">
            <span className="visually-hidden">{copy.workoutType}</span>
            <select className="hero-select" value={workout.workoutType ?? ''} onChange={(event) => onTypeChange(event.target.value)}>
              <option value="">{workoutTypeLabel(undefined, language)}</option>
              {/* A type her config no longer has stays selectable until she changes it. */}
              {workout.workoutType && !type && <option value={workout.workoutType}>{workoutTypeLabel(workout.workoutType, language)}</option>}
              {config?.workoutTypes.map((option) => (
                <option key={option.id} value={option.id}>
                  {workoutTypeLabel(option, language)}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className="hero-chip hero-chip-button" type="button" aria-expanded={showNotes} onClick={() => setShowNotes((open) => !open)}>
          {hasNotes ? copy.workoutNoteSet : copy.addWorkoutNote}
        </button>
      </div>

      {showNotes && (
        <textarea
          className="workout-hero-notes"
          rows={2}
          dir="auto"
          aria-label={copy.workoutNotes}
          // The chip was just pressed to write a note: the cursor belongs here.
          autoFocus
          value={workout.notes}
          onChange={(event) => onChange({ ...workout, notes: event.target.value })}
        />
      )}

      <div className="workout-hero-stats">
        <dl className="hero-stats">
          {stats ? (
            stats.map((stat) => (
              <div key={stat.id} className="hero-stat">
                <dt>{stat.label}</dt>
                <dd dir="ltr">{stat.value}</dd>
              </div>
            ))
          ) : (
            <>
              <div className="hero-stat">
                <dt>{copy.statExercises}</dt>
                <dd>{workout.exercises.length}</dd>
              </div>
              <div className="hero-stat">
                <dt>{copy.sets}</dt>
                <dd>{workoutSetCount(workout)}</dd>
              </div>
              <div className="hero-stat">
                <dt>{copy.statMinutes}</dt>
                {/* "~32": the sign stays in front of the number in Hebrew too. */}
                <dd dir="ltr">~{estimateWorkoutMinutes(workout)}</dd>
              </div>
            </>
          )}
        </dl>
        {coveredGroups.length > 0 && (
          <ul className="hero-groups">
            {coveredGroups.map((group) => (
              <li key={group} className="hero-group">
                {group}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

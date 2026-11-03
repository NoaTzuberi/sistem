import { initialsOf } from '../../../home/data/homeDisplay';
import './WorkoutCoachNote.css';

interface WorkoutCoachNoteProps {
  /** The coach's note on this workout (plain text). */
  text: string;
  /** null = not known yet: the note without a name. */
  coachName: string | null;
}

/** The coach's note on the workout: a soft pink card with her initials. */
export function WorkoutCoachNote({ text, coachName }: WorkoutCoachNoteProps) {
  const name = coachName?.trim() || null;
  return (
    <div className="wk-note">
      {name && (
        <span className="wk-note-avatar" aria-hidden="true">
          {initialsOf(name)}
        </span>
      )}
      <div className="wk-note-body">
        {name && (
          <b className="wk-note-name" dir="auto">
            {name}
          </b>
        )}
        <p className="wk-note-text" dir="auto">
          {text}
        </p>
      </div>
    </div>
  );
}

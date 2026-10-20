import './CardioCoachNote.css';

interface CardioCoachNoteProps {
  name: string | null;
  note: string;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('');
}

/** The coach's note for this session, under her name. */
export function CardioCoachNote({ name, note }: CardioCoachNoteProps) {
  return (
    <div className="cp-note">
      {name && (
        <span className="cp-note-avatar" aria-hidden="true">
          {initials(name)}
        </span>
      )}
      <div className="cp-note-body">
        {name && <b className="cp-note-name" dir="auto">{name}</b>}
        <p className="cp-note-text" dir="auto">
          {note}
        </p>
      </div>
    </div>
  );
}

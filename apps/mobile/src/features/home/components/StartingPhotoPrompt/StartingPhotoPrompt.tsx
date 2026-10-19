import { IconCamera, IconX } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { homeCopy } from '../../copy';
import './StartingPhotoPrompt.css';

interface StartingPhotoPromptProps {
  /** Opens the existing starting-photo flow (Profile → photos). */
  onTake: () => void;
  onDismiss: () => void;
}

/** Shown only while she has no starting photo and hasn't dismissed it (useStartingPhotoReminder). */
export function StartingPhotoPrompt({ onTake, onDismiss }: StartingPhotoPromptProps) {
  const copy = useCopy(homeCopy);
  return (
    <aside className="starting-photo-prompt" aria-labelledby="starting-photo-prompt-title">
      <span className="starting-photo-prompt-icon" aria-hidden="true">
        <IconCamera size={17} stroke={2} />
      </span>
      <div className="starting-photo-prompt-text">
        <p className="starting-photo-prompt-title display-title" id="starting-photo-prompt-title">
          {copy.photo.title}
        </p>
        <p className="starting-photo-prompt-subtitle">{copy.photo.subtitle}</p>
      </div>
      <button type="button" className="starting-photo-prompt-take" onClick={onTake}>
        {copy.photo.take}
      </button>
      <button
        type="button"
        className="starting-photo-prompt-dismiss"
        aria-label={copy.dismissStartingPhotoReminder}
        onClick={onDismiss}
      >
        <IconX size={14} stroke={2.6} aria-hidden="true" />
      </button>
    </aside>
  );
}

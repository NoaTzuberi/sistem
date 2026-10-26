import { IconDeviceDesktop, IconExternalLink } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { openExternal } from '../../../../services/external/openExternal';
import { coachCopy } from '../../copy';
import './DeskNote.css';

interface DeskNoteProps {
  text: string;
  /** A dashboard deep link; null = no link (no dashboard address set). */
  href?: string | null;
}

/** The soft "this is done in the dashboard" note, with an optional "נפתח בדשבורד" link. */
export function DeskNote({ text, href }: DeskNoteProps) {
  const copy = useCopy(coachCopy);
  return (
    <div className="desk-note">
      <IconDeviceDesktop className="desk-note-icon" size={18} aria-hidden="true" />
      <p className="desk-note-text">
        {text}
        {href && (
          <button type="button" className="desk-note-link" onClick={() => openExternal(href)}>
            {copy.detail.openInDashboard}
            <IconExternalLink size={14} aria-hidden="true" />
          </button>
        )}
      </p>
    </div>
  );
}

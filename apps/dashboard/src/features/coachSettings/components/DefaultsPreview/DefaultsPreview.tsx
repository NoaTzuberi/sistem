import { fill, useCopy } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { coachSettingsCopy } from '../../copy';
import './DefaultsPreview.css';

interface DefaultsPreviewProps {
  message: string;
  tip: string;
  /** The coach's own name: "Tip from <first name>". */
  coachName: string | null;
}

const NAME_TOKEN = /\{name\}/g;

/** "How she will see it": the message as a small bubble ({name} → a sample name) and the tip card under it. */
export function DefaultsPreview({ message, tip, coachName }: DefaultsPreviewProps) {
  const copy = useCopy(coachSettingsCopy).defaults;
  const firstName = coachName?.trim().split(/\s+/)[0] || null;
  const shown = (text: string) => text.trim().replace(NAME_TOKEN, copy.previewName);

  return (
    <figure className="defaults-preview">
      <figcaption className="defaults-preview-title">{copy.previewTitle}</figcaption>
      <div className="defaults-preview-screen">
        {message.trim() ? (
          <p className="defaults-preview-bubble" dir="auto">
            {shown(message)}
          </p>
        ) : (
          <p className="defaults-preview-bubble defaults-preview-bubble-empty">{copy.previewEmpty}</p>
        )}
        {tip.trim() && (
          <aside className="defaults-preview-tip">
            <Icon name="bulb" size="sm" className="defaults-preview-tip-icon" />
            <span className="defaults-preview-tip-body">
              <b className="defaults-preview-tip-title" dir="auto">
                {firstName ? fill(copy.tipFrom, { name: firstName }) : copy.tipFromCoach}
              </b>
              <span className="defaults-preview-tip-text" dir="auto">
                {shown(tip)}
              </span>
            </span>
          </aside>
        )}
      </div>
    </figure>
  );
}

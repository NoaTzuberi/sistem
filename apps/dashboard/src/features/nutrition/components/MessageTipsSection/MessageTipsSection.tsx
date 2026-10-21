import { fill, formatNumber, useCopy, useLanguage } from '@sistem/shared';
import { StepNumber } from '../StepNumber/StepNumber';
import { nutritionCopy } from '../../copy';
import { sectionId } from '../../data/scrollToSection';
import type { DraftTip } from '../../nutritionDraft';
import { MessagePreview } from '../MessagePreview/MessagePreview';
import { TipsList } from '../TipsList/TipsList';
import './MessageTipsSection.css';

// The server's limit (nutrition.constants MAX_INTRO_MESSAGE_LENGTH).
const MAX_INTRO_LENGTH = 1500;

interface MessageTipsSectionProps {
  message: string;
  onMessageChange: (message: string) => void;
  tips: DraftTip[];
  onTipsChange: (tips: DraftTip[]) => void;
}

/** Step 3: her message (with a live count and a preview of how it reads) and the coach's tips. */
export function MessageTipsSection({ message, onMessageChange, tips, onTipsChange }: MessageTipsSectionProps) {
  const language = useLanguage();
  const copy = useCopy(nutritionCopy);
  const b = copy.builder;
  const atLimit = message.length >= MAX_INTRO_LENGTH;

  return (
    <section className="nb-card" id={sectionId('message')} aria-labelledby="nb-message-title">
      <header className="nb-card-head">
        <StepNumber number={3} isDone={message.trim().length > 0} />
        <h2 className="nb-card-title" id="nb-message-title" tabIndex={-1}>
          {b.step3}
        </h2>
      </header>

      <div className="nb-message">
        <div className="nb-message-field">
          <label className="nb-subtitle" htmlFor="nb-message-input">
            {copy.introTitle}
          </label>
          <p className="nb-note">{copy.introHint}</p>
          <textarea
            className="nb-message-input"
            id="nb-message-input"
            dir="auto"
            rows={5}
            maxLength={MAX_INTRO_LENGTH}
            value={message}
            // maxLength stops typing; a paste or a template's text is cut here too.
            onChange={(event) => onMessageChange(event.target.value.slice(0, MAX_INTRO_LENGTH))}
          />
          <span className="nb-message-count" data-limit={atLimit || undefined} aria-live="polite">
            <bdi>{fill(copy.introCount, { count: formatNumber(message.length, language), max: formatNumber(MAX_INTRO_LENGTH, language) })}</bdi>
          </span>
        </div>
        <MessagePreview title={b.previewTitle} text={message} empty={b.previewEmpty} />
      </div>

      <TipsList tips={tips} onChange={onTipsChange} />
    </section>
  );
}

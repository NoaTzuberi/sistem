import { useId } from 'react';
import { fill, formatNumber, isolateNameToken, SEND_DEFAULT_MAX, useCopy, useLanguage } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { useAuth } from '../../../../services/auth/AuthContext';
import type { DefaultsCardState, DefaultsForm } from '../../hooks/useSendDefaults';
import { coachSettingsCopy } from '../../copy';
import { DefaultsPreview } from '../DefaultsPreview/DefaultsPreview';
import './SendDefaultsCard.css';

/** One plan kind's fixed message + tip: icon tile + title, the two fields, the preview, save / delete. */
export function SendDefaultsCard({ card }: { card: DefaultsCardState }) {
  const copy = useCopy(coachSettingsCopy).defaults;
  const language = useLanguage();
  const { user } = useAuth();
  const titleId = useId();
  const kindCopy = copy.kinds[card.kind];
  const { form } = card;

  const field = (id: keyof DefaultsForm, label: string, placeholder: string) => {
    const max = SEND_DEFAULT_MAX[id];
    return (
      <label className="send-defaults-field">
        <span className="send-defaults-label">{label}</span>
        <textarea
          className="send-defaults-input"
          dir={form[id] ? 'auto' : undefined}
          rows={1}
          maxLength={max}
          placeholder={placeholder}
          value={form[id]}
          disabled={!card.isLoaded}
          onChange={(event) => card.change({ [id]: event.target.value })}
        />
        <span className="send-defaults-meta">
          <span>{isolateNameToken(copy.nameHint)}</span>
          <bdi className="send-defaults-count">{fill(copy.count, { count: formatNumber(form[id].length, language), max: formatNumber(max, language) })}</bdi>
        </span>
      </label>
    );
  };

  return (
    <article className="send-defaults-card" data-kind={card.kind} aria-labelledby={titleId}>
      <header className="send-defaults-head">
        <span className="send-defaults-tile" aria-hidden="true">
          <Icon name={card.kind === 'nutrition' ? 'bowl' : 'dumbbell'} />
        </span>
        <span className="send-defaults-heading">
          <h3 className="send-defaults-title" id={titleId}>
            {kindCopy.title}
          </h3>
          <span className="send-defaults-sub">{kindCopy.sub}</span>
        </span>
      </header>

      <form
        className="send-defaults-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (card.isDirty) void card.save();
        }}
        noValidate
      >
        {card.isLoaded && !card.hasSaved && !card.isDirty && <p className="send-defaults-empty">{copy.empty}</p>}
        {field('message', copy.message, copy.messagePlaceholder)}
        {field('tip', copy.tip, copy.tipPlaceholder)}
        <DefaultsPreview message={form.message} tip={form.tip} coachName={user?.name ?? null} />
        {card.error && (
          <p className="send-defaults-error" role="alert">
            {card.error}
          </p>
        )}
        <div className="send-defaults-actions">
          <PillButton type="submit" variant="primary" disabled={!card.isDirty || card.isSaving} data-saved={card.justSaved || undefined}>
            {card.isSaving ? copy.saving : card.justSaved ? copy.saved : copy.save}
            {card.justSaved && <Icon name="check" size="sm" />}
          </PillButton>
          {card.hasSaved && (
            <button
              className="send-defaults-remove"
              type="button"
              disabled={card.isSaving}
              onClick={() => {
                if (window.confirm(copy.removeConfirm)) void card.remove();
              }}
            >
              {copy.remove}
            </button>
          )}
        </div>
      </form>
    </article>
  );
}

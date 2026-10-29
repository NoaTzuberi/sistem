import { useId } from 'react';
import { useCopy } from '@sistem/shared';
import { StateLine } from '../../../../components/common/StateLine/StateLine';
import { useUnsavedChangesGuard } from '../../../../hooks/useUnsavedChangesGuard';
import { DEFAULTS_KINDS, useSendDefaults } from '../../hooks/useSendDefaults';
import { coachSettingsCopy } from '../../copy';
import { SendDefaultsCard } from '../SendDefaultsCard/SendDefaultsCard';
import './SendDefaultsSection.css';

/** "Messages sent with the plan": one card per plan kind (side by side on desktop, stacked below). */
export function SendDefaultsSection() {
  const copy = useCopy(coachSettingsCopy).defaults;
  const titleId = useId();
  const defaults = useSendDefaults();
  useUnsavedChangesGuard(defaults.isDirty, copy.unsavedConfirm);

  return (
    <section className="send-defaults-section" aria-labelledby={titleId}>
      <header className="send-defaults-section-head">
        <h2 className="send-defaults-section-title" id={titleId}>
          {copy.title}
        </h2>
        <p className="send-defaults-section-text">{copy.helper}</p>
      </header>
      {defaults.loadError ? (
        <StateLine error={defaults.loadError} />
      ) : (
        <div className="send-defaults-section-grid">
          {DEFAULTS_KINDS.map((kind) => (
            <SendDefaultsCard key={kind} card={defaults.card(kind)} />
          ))}
        </div>
      )}
    </section>
  );
}

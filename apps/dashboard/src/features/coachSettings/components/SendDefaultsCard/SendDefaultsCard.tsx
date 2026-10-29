import { fill, useCopy } from '@sistem/shared';
import { WidgetCard } from '../../../../components/common/WidgetCard/WidgetCard';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { StateLine } from '../../../../components/common/StateLine/StateLine';
import { useSendDefaults } from '../../hooks/useSendDefaults';
import type { DefaultsForm } from '../../hooks/useSendDefaults';
import { coachSettingsCopy } from '../../copy';
import './SendDefaultsCard.css';

// The server's limits (coachDefaults.validation.ts).
const MAX: Record<keyof DefaultsForm, number> = { message: 600, tip: 300 };

/** "Default messages": the message + tip the nutrition send sheet starts from. */
export function SendDefaultsCard({ onToast }: { onToast: (text: string) => void }) {
  const copy = useCopy(coachSettingsCopy).defaults;
  const defaults = useSendDefaults(onToast);
  const { form } = defaults;

  const field = (id: keyof DefaultsForm, label: string, placeholder: string, rows: number) => (
    <label className="send-defaults-field">
      <span className="send-defaults-label">{label}</span>
      <textarea
        className="send-defaults-input"
        dir={form[id] ? 'auto' : undefined}
        rows={rows}
        maxLength={MAX[id]}
        placeholder={placeholder}
        value={form[id]}
        disabled={!defaults.isLoaded}
        onChange={(event) => defaults.change({ [id]: event.target.value })}
      />
      <span className="send-defaults-meta">
        <span>{copy.nameHint}</span>
        <span dir="ltr">{fill(copy.count, { count: form[id].length, max: MAX[id] })}</span>
      </span>
    </label>
  );

  return (
    <WidgetCard title={copy.title} subtitle={copy.helper} className="send-defaults-card">
      {defaults.loadError ? (
        <StateLine error={defaults.loadError} />
      ) : (
        <form
          className="send-defaults-form"
          onSubmit={(event) => {
            event.preventDefault();
            void defaults.save();
          }}
          noValidate
        >
          {defaults.isEmpty && <p className="send-defaults-empty">{copy.empty}</p>}
          {field('message', copy.message, copy.messagePlaceholder, 4)}
          {field('tip', copy.tip, copy.tipPlaceholder, 2)}
          {defaults.saveError && (
            <p className="send-defaults-error" role="alert">
              {defaults.saveError}
            </p>
          )}
          <div className="send-defaults-actions">
            <PillButton type="submit" variant="primary" disabled={!defaults.isDirty || defaults.isSaving}>
              {defaults.isSaving ? copy.saving : copy.save}
            </PillButton>
          </div>
        </form>
      )}
    </WidgetCard>
  );
}

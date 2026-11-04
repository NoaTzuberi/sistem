import { useState } from 'react';
import { IconCalendar, IconTrash } from '@tabler/icons-react';
import { fill, formatDateOnly, formatLength, formatNumber, measurementLabel, toDisplayLength, unitLabel, useCopy, useLanguage } from '@sistem/shared';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { ConfirmSheet } from '../../../../components/common/ConfirmSheet/ConfirmSheet';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { ROUTES } from '../../../../app/config/routes';
import { bodyCopy } from '../../../bodyTracking/copy';
import { SubScreenHeader } from '../../components/SubScreenHeader/SubScreenHeader';
import { useMeasurementsLog } from '../../hooks/useMeasurementsLog';
import './MeasurementsLogPage.css';

/** "תיעוד מידות" (direction B, full screen): the day as a soft pill, one white card per measurement, the sticky save pill. */
export function MeasurementsLogPage() {
  const language = useLanguage();
  const copy = useCopy(bodyCopy);
  const log = useMeasurementsLog();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const unit = unitLabel(log.unit, language);

  return (
    <AppShell hideTabBar bleed>
      <div className="ml-screen">
        <SubScreenHeader title={log.hasSaved ? copy.editMeasurements : copy.logMeasurements} fallbackPath={ROUTES.PROFILE_MEASUREMENTS} />

        <div className="ml-content">
          {log.isLoading && !log.list && <StateMessage>{copy.loading}</StateMessage>}
          {log.error && !log.list && <StateMessage onRetry={log.reload}>{log.error}</StateMessage>}

          {log.list && (
            <form className="ml-form" onSubmit={log.submit} noValidate>
              {/* The pill shows the day; the native date input on top of it opens the phone's picker. */}
              <label className="ml-date">
                <IconCalendar size={18} aria-hidden="true" />
                <span>{log.date ? formatDateOnly(log.date, language) : copy.date}</span>
                <input
                  className="ml-date-input"
                  type="date"
                  aria-label={copy.date}
                  max={log.today}
                  value={log.date}
                  onChange={(event) => log.setDate(event.target.value)}
                />
              </label>

              <div className="ml-list">
                {log.ids.map((id) => {
                  const last = log.lastElsewhere.get(id);
                  const inputId = `ml-${id}`;
                  const error = log.fieldError?.id === id ? log.fieldError.message : null;
                  return (
                    <div key={id} className="ml-row">
                      <div className="ml-line">
                        <label className="ml-label" htmlFor={inputId}>
                          <b>{measurementLabel(id, language)}</b>
                          {last !== undefined && <small>{fill(copy.lastValue, { value: formatLength(last, log.unit, language) })}</small>}
                        </label>
                        <span className="ml-field">
                          <input
                            id={inputId}
                            className={error ? 'ml-input ml-input-error' : 'ml-input'}
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            enterKeyHint="next"
                            dir="ltr"
                            aria-label={fill(copy.measurementField, { label: measurementLabel(id, language), unit })}
                            aria-invalid={error ? true : undefined}
                            aria-describedby={error ? `${inputId}-error` : undefined}
                            placeholder={last !== undefined ? formatNumber(toDisplayLength(last, log.unit), language) : ''}
                            value={log.values[id] ?? ''}
                            onChange={(event) => log.setValue(id, event.target.value)}
                          />
                          <span className="ml-unit" aria-hidden="true">
                            {unit}
                          </span>
                        </span>
                      </div>
                      {error && (
                        <p className="ml-error" id={`${inputId}-error`} role="alert">
                          {error}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {log.formError && (
                <p className="ml-error ml-form-error" role="alert">
                  {log.formError}
                </p>
              )}

              {log.hasSaved && (
                <button type="button" className="ml-delete" disabled={log.isSaving} onClick={() => setConfirmDelete(true)}>
                  {copy.delete}
                </button>
              )}

              <div className="ml-actions">
                <PillButton type="submit" loading={log.isSaving} disabled={!log.isDirty}>
                  {copy.save}
                </PillButton>
              </div>
            </form>
          )}
        </div>

        <ConfirmSheet
          isOpen={confirmDelete}
          tone="destructive"
          icon={<IconTrash size={22} />}
          title={copy.deleteMeasurementsTitle}
          confirmLabel={copy.delete}
          cancelLabel={copy.cancel}
          isWorking={log.isSaving}
          onConfirm={() => {
            setConfirmDelete(false);
            log.deleteDay();
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      </div>
    </AppShell>
  );
}

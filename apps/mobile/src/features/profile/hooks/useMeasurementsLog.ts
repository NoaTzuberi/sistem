import { useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { BodyMetric } from '@sistem/types';
import { extractErrorField, extractErrorMessage } from '@sistem/api-client';
import { getActiveLanguage, latestMeasurements, parseDecimalInput, toCm, toDisplayLength } from '@sistem/shared';
import { ROUTES } from '../../../app/config/routes';
import { saveBodyMetric } from '../../../services/bodyMetrics/bodyMetricsService';
import { celebrate } from '../../achievements/celebration';
import { bodyCopy } from '../../bodyTracking/copy';
import { useGoBack } from './useGoBack';
import { useMyBodyMetrics, useMyUnits } from './useMyBody';

function valuesOf(day: BodyMetric | undefined, ids: string[], unit: 'cm' | 'in'): Record<string, string> {
  return Object.fromEntries(
    ids.map((id) => [id, day?.measurements[id] !== undefined ? String(toDisplayLength(day.measurements[id], unit)) : '']),
  );
}

/**
 * Log or change one day's measurements (the logic of the page, unchanged). The form always shows the chosen
 * day: picking a date that already has measurements opens them for editing (one day per date). Empty fields are
 * skipped; emptying a saved one clears it. Save is enabled once something changed; a measurement the server
 * refuses gets its message under its own row (`field`), anything else under the form.
 */
export function useMeasurementsLog() {
  const [params] = useSearchParams();
  const { list, error, isLoading, reload } = useMyBodyMetrics();
  const { units, today } = useMyUnits();
  const goBack = useGoBack(ROUTES.PROFILE_MEASUREMENTS);
  const [date, setDateState] = useState(params.get('date') ?? today);
  const [values, setValues] = useState<Record<string, string>>({});
  const [initial, setInitial] = useState<Record<string, string>>({});
  const [filledFor, setFilledFor] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ id: string; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const ids = list?.measurementIds ?? [];
  const day = list?.items.find((item) => item.date === date);
  const hasSaved = Object.keys(day?.measurements ?? {}).length > 0;
  // Fill the fields from the chosen day once it is known (and again when the date changes).
  if (list && filledFor !== date) {
    const filled = valuesOf(day, ids, units.length);
    setFilledFor(date);
    setValues(filled);
    setInitial(filled);
  }
  const lastElsewhere = new Map(
    latestMeasurements(list?.items.filter((item) => item.date !== date) ?? [], ids).map((item) => [item.id, item.cm]),
  );
  const isDirty = ids.some((id) => (values[id] ?? '').trim() !== (initial[id] ?? '').trim());

  async function send(measurements: Record<string, number | null>) {
    setFormError(null);
    setFieldError(null);
    setIsSaving(true);
    try {
      const saved = await saveBodyMetric(date, { measurements });
      celebrate(saved.achievementsUnlocked);
      goBack();
    } catch (caught) {
      const message = extractErrorMessage(caught, bodyCopy[getActiveLanguage()].saveError);
      const field = extractErrorField(caught);
      if (field && ids.includes(field)) setFieldError({ id: field, message });
      else setFormError(message);
      setIsSaving(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const copy = bodyCopy[getActiveLanguage()];
    const measurements: Record<string, number | null> = {};
    for (const id of ids) {
      const text = values[id]?.trim() ?? '';
      if (text === '') {
        if (day?.measurements[id] !== undefined) measurements[id] = null;
        continue;
      }
      const parsed = parseDecimalInput(text);
      if (parsed === null) {
        setFormError(copy.measurementsInvalid);
        return;
      }
      measurements[id] = toCm(parsed, units.length);
    }
    if (!date || Object.keys(measurements).length === 0) {
      setFormError(copy.measurementsInvalid);
      return;
    }
    void send(measurements);
  }

  return {
    list,
    error,
    isLoading,
    reload,
    unit: units.length,
    today,
    ids,
    date,
    setDate: (next: string) => {
      setDateState(next);
      setFormError(null);
      setFieldError(null);
    },
    values,
    setValue: (id: string, value: string) => {
      setValues((previous) => ({ ...previous, [id]: value }));
      if (fieldError?.id === id) setFieldError(null);
    },
    lastElsewhere,
    hasSaved,
    isDirty,
    isSaving,
    formError,
    fieldError,
    submit,
    deleteDay: () => void send(Object.fromEntries(Object.keys(day?.measurements ?? {}).map((id) => [id, null]))),
  };
}

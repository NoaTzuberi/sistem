import type { UpdatePreferencesPayload } from '@sistem/types';
import { LANGUAGE_IDS, LENGTH_UNIT_IDS, WEIGHT_UNIT_IDS } from './units';
import { APP_MODE_IDS } from './appMode';
import { type ServerMessage, msg } from '../../i18n';

type Parsed<T> = { value: T; error?: undefined } | { value?: undefined; error: ServerMessage };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * PATCH /users/preferences: { units?: { weight?: 'kg' | 'lb', length?: 'cm' | 'in' }, language?: 'he' | 'en',
 * appMode?: 'coach' | 'trainee' }. At least one setting; the others stay as they are. Whether her roles allow
 * the app mode is checked by the service (it needs the account).
 */
export function parsePreferencesPayload(body: unknown): Parsed<UpdatePreferencesPayload> {
  if (!isObject(body)) return { error: msg('invalid_body') };
  const { units, language, appMode, ...unknownFields } = body;
  if (Object.keys(unknownFields).length > 0) return { error: msg('preferences_unknown_field') };
  if (language !== undefined && !(LANGUAGE_IDS as readonly unknown[]).includes(language)) {
    return { error: msg('language_invalid') };
  }
  if (appMode !== undefined && !(APP_MODE_IDS as readonly unknown[]).includes(appMode)) {
    return { error: msg('app_mode_invalid') };
  }
  if (units !== undefined && !isObject(units)) return { error: msg('preferences_units_not_object') };
  const { weight, length, ...unknownUnits } = units ?? {};
  if (Object.keys(unknownUnits).length > 0) return { error: msg('preferences_unknown_unit') };
  if (weight !== undefined && !(WEIGHT_UNIT_IDS as readonly unknown[]).includes(weight)) {
    return { error: msg('weight_unit_invalid') };
  }
  if (length !== undefined && !(LENGTH_UNIT_IDS as readonly unknown[]).includes(length)) {
    return { error: msg('length_unit_invalid') };
  }
  if (weight === undefined && length === undefined && language === undefined && appMode === undefined) return { error: msg('preferences_empty') };
  return {
    value: {
      ...((weight !== undefined || length !== undefined) && {
        units: {
          ...(weight !== undefined && { weight: weight as (typeof WEIGHT_UNIT_IDS)[number] }),
          ...(length !== undefined && { length: length as (typeof LENGTH_UNIT_IDS)[number] }),
        },
      }),
      ...(language !== undefined && { language: language as (typeof LANGUAGE_IDS)[number] }),
      ...(appMode !== undefined && { appMode: appMode as (typeof APP_MODE_IDS)[number] }),
    },
  };
}

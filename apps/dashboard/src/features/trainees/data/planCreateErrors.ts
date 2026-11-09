import { PlanRequestError } from '@sistem/api-client';
import type { Language } from '@sistem/types';
import { traineesCopy } from '../copy';

type CreateErrorCode = keyof (typeof traineesCopy)['he']['duplicate']['errors'];

/**
 * What a failed "create / duplicate plan" says: what happened and what to do, by the server's
 * error code. No answer at all = the connection; an unknown code = a general line.
 */
export function describePlanCreateError(error: unknown, language: Language): string {
  const errors = traineesCopy[language].duplicate.errors;
  if (!(error instanceof PlanRequestError)) return errors.unknown;
  if (error.status === undefined) return errors.network;
  const code = error.code as CreateErrorCode | undefined;
  return code && code in errors ? errors[code] : errors.unknown;
}

/** After these, the weeks / sources on screen are out of date: they are fetched again. */
export function isStaleListError(error: unknown): boolean {
  return error instanceof PlanRequestError && (error.code === 'plan_week_taken' || error.code === 'plan_source_not_found');
}

import { LocalizedError } from '../../i18n';
import type { PlanProblem } from './plan.validation';

/** The plan (or the request) breaks a plan rule; `issues` say where. */
export class PlanValidationError extends Error {
  constructor(public readonly issues: PlanProblem[]) {
    super(issues[0]?.code ?? 'plan_invalid');
  }
}

/** The action does not fit the plan's current state (week taken, plan locked, …). */
export class PlanConflictError extends LocalizedError {}

/** The week already has a draft and the coach did not say to replace it: she chooses (replace / open / cancel). */
export class PlanWeekHasDraftError extends PlanConflictError {
  constructor(public readonly planId: string) {
    super('plan_week_has_draft');
  }
}

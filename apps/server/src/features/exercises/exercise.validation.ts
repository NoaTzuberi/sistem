import {
  CATEGORY_IDS,
  MUSCLE_IDS,
  EQUIPMENT_IDS,
  DIFFICULTY_IDS,
  MOVEMENT_TYPE_IDS,
  EXERCISE_GOAL_IDS,
  MECHANIC_IDS,
  FORCE_TYPE_IDS,
} from './exercise.constants';
import { type ServerMessage, msg } from '../../i18n';

const MIN_PAGE = 1;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const MAX_SEARCH_LENGTH = 100;

function isStringInSet(value: unknown, allowed: readonly string[]): boolean {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

export function validateExerciseListQuery(query: unknown): ServerMessage | null {
  if (typeof query !== 'object' || query === null) {
    return msg('exercise_query_invalid');
  }

  const params = query as Record<string, unknown>;

  if (params.page !== undefined) {
    const page = Number(params.page);
    if (!Number.isInteger(page) || page < MIN_PAGE) {
      return msg('exercise_page_invalid', { min: MIN_PAGE });
    }
  }

  if (params.limit !== undefined) {
    const limit = Number(params.limit);
    if (!Number.isInteger(limit) || limit < MIN_LIMIT || limit > MAX_LIMIT) {
      return msg('exercise_limit_invalid', { min: MIN_LIMIT, max: MAX_LIMIT });
    }
  }

  if (params.category !== undefined && !isStringInSet(params.category, CATEGORY_IDS)) {
    return msg('exercise_query_param_invalid', { param: 'category' });
  }

  if (params.muscle !== undefined && !isStringInSet(params.muscle, MUSCLE_IDS)) {
    return msg('exercise_query_param_invalid', { param: 'muscle' });
  }

  if (params.equipment !== undefined && !isStringInSet(params.equipment, EQUIPMENT_IDS)) {
    return msg('exercise_query_param_invalid', { param: 'equipment' });
  }

  if (params.difficulty !== undefined && !isStringInSet(params.difficulty, DIFFICULTY_IDS)) {
    return msg('exercise_query_param_invalid', { param: 'difficulty' });
  }

  if (params.movementType !== undefined && !isStringInSet(params.movementType, MOVEMENT_TYPE_IDS)) {
    return msg('exercise_query_param_invalid', { param: 'movementType' });
  }

  if (params.goal !== undefined && !isStringInSet(params.goal, EXERCISE_GOAL_IDS)) {
    return msg('exercise_query_param_invalid', { param: 'goal' });
  }

  if (params.mechanic !== undefined && !isStringInSet(params.mechanic, MECHANIC_IDS)) {
    return msg('exercise_query_param_invalid', { param: 'mechanic' });
  }

  if (params.forceType !== undefined && !isStringInSet(params.forceType, FORCE_TYPE_IDS)) {
    return msg('exercise_query_param_invalid', { param: 'forceType' });
  }

  if (params.isUnilateral !== undefined && params.isUnilateral !== 'true' && params.isUnilateral !== 'false') {
    return msg('exercise_query_param_invalid', { param: 'isUnilateral' });
  }

  // The list is public and scored in memory per request: a cap keeps one request cheap.
  if (params.search !== undefined && (typeof params.search !== 'string' || params.search.length > MAX_SEARCH_LENGTH)) {
    return msg('exercise_query_param_invalid', { param: 'search' });
  }

  return null;
}

export function validateSlugParam(slug: unknown): ServerMessage | null {
  if (typeof slug !== 'string' || slug.trim().length === 0) {
    return msg('exercise_slug_invalid');
  }
  return null;
}

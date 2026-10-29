import { useSendNote } from '@sistem/shared';
import type { SendDefaultsKind } from '@sistem/types';
import { getSendDefaults, saveSendDefaults } from '../../../services/coachProfile/coachDefaultsService';

const API = { getSendDefaults, saveSendDefaults };

/** The send sheet's message + tip for a nutrition plan or a workout plan (rules: @sistem/shared sendNote). */
export function usePlanSendNote(kind: SendDefaultsKind) {
  return useSendNote(kind, API);
}

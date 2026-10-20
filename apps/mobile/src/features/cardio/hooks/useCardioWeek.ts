import { useLoad } from '@sistem/shared';
import { getCardioWeek } from '../../../services/cardio/cardioService';

/** This week's cardio days (statuses from the server). A failed load just shows no cardio. */
export function useCardioWeek() {
  return useLoad(getCardioWeek, '');
}

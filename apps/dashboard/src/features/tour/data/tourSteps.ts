import { ROUTES } from '../../../app/config/routes';

export type TourStepId = 'trainees' | 'invite' | 'planBuilder' | 'nutrition' | 'settings' | 'activity';

export interface TourStep {
  id: TourStepId;
  /** `data-tour` marks on real elements, tried in order; none visible → the card shows centered. */
  targets: string[];
  /** Open this page first (the element lives there). */
  path?: string;
}

/** THE tour, in order. Only existing UI is pointed at; nothing is created for the tour. */
export const TOUR_STEPS: TourStep[] = [
  { id: 'trainees', targets: ['trainees'] },
  { id: 'invite', targets: ['invite'], path: ROUTES.TRAINEES },
  { id: 'planBuilder', targets: ['new-plan'] },
  { id: 'nutrition', targets: ['nutrition'] },
  { id: 'settings', targets: ['settings'] },
  { id: 'activity', targets: ['activity', 'notifications'], path: ROUTES.HOME },
];

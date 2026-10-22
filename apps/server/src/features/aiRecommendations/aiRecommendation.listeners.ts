import { appEvents } from '../../events/appEvents';
import type { TraineeOnboardedEvent } from '../../events/appEvents';
import { aiUnavailableReason } from '../ai/ai.config';
import { coachHasActiveFoods } from '../nutrition/foodItem.service';
import { startRecommendation } from './aiRecommendation.service';

// PRD §8 / §5.6: when an onboarded trainee meets a coach (onboarding completed with a coaching, or
// an onboarded trainee joining one), a training draft and a nutrition draft are generated for that
// coaching. Onboarding never waits for them and never fails because of them.

export async function onTraineeOnboardedStartDraft(event: TraineeOnboardedEvent): Promise<void> {
  if (aiUnavailableReason()) return;
  const base = { traineeId: event.traineeId, coachId: event.coachId, coachingId: event.coachingId, trigger: 'onboarding' as const };
  await startRecommendation({ ...base, type: 'training_plan' });
  // The nutrition draft needs the coach's food list; without one there is nothing to draft from.
  if (await coachHasActiveFoods(event.coachId)) {
    await startRecommendation({ ...base, type: 'nutrition_plan' });
  }
}

let registered = false;

/** Called once when the app is created; calling it again does nothing. */
export function registerAiRecommendationListeners(): void {
  if (registered) return;
  registered = true;
  appEvents.on('trainee.onboarded', onTraineeOnboardedStartDraft);
}

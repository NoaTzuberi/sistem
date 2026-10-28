import { appEvents } from '../../events/appEvents';
import type {
  CoachingEndedEvent,
  NutritionPlanPublishedEvent,
  PlanPublishedEvent,
  TraineeOnboardedEvent,
  WorkoutCompletedEvent,
} from '../../events/appEvents';
import { User } from '../users/user.model';
import { WorkoutLog } from '../workoutLogs/workoutLog.model';
import { Coaching } from '../coachings/coaching.model';
import { getCoachName } from '../coachProfiles/coachProfile.service';
import { notify } from './notification.service';

// Turns domain events into notifications (PRD §9). The features that emit the
// events know nothing about notifications.

export async function onTraineeOnboarded(event: TraineeOnboardedEvent): Promise<void> {
  const trainee = await User.findById(event.traineeId).select('name').lean();
  if (!trainee) return;

  await notify(event.coachId, {
    type: 'trainee_onboarded',
    data: { traineeId: event.traineeId, traineeName: trainee.name },
  });
}

export async function onPlanPublished(event: PlanPublishedEvent): Promise<void> {
  await notify(event.traineeId, {
    type: 'plan_published',
    data: { planId: event.planId, weekStartDate: event.weekStartDate },
  });
}

/**
 * To the coach of the coaching the workout belongs to — and only while that coaching is live. A free
 * workout (her own, no coaching) goes to every coach she has now (it is in their log lists too).
 */
export async function onWorkoutCompleted(event: WorkoutCompletedEvent): Promise<void> {
  const [trainee, log] = await Promise.all([
    User.findById(event.traineeId).select('name').lean(),
    WorkoutLog.findById(event.logId).select('coachingId source').lean(),
  ]);
  if (!trainee || !log) return;
  const coachings = log.source === 'free'
    ? await Coaching.find({ traineeId: event.traineeId, live: true }).select('coachId').lean()
    : await Coaching.find({ _id: log.coachingId, live: true }).select('coachId').lean();

  for (const coaching of coachings) {
    await notify(String(coaching.coachId), {
      type: 'workout_completed',
      data: { traineeId: event.traineeId, traineeName: trainee.name, logId: event.logId, workoutTitle: event.workoutTitle },
    });
  }
}

/** To the trainee — her app builds the wording; tap → the Nutrition tab. */
export async function onNutritionPlanPublished(event: NutritionPlanPublishedEvent): Promise<void> {
  await notify(event.traineeId, {
    type: 'nutrition_plan_published',
    data: { planId: event.planId, version: event.version, isUpdate: event.version > 1 },
  });
}

/** To the trainee — her Home shows "<coach> ended the coaching" until she dismisses it. */
export async function onCoachingEnded(event: CoachingEndedEvent): Promise<void> {
  await notify(event.traineeId, {
    type: 'coaching_ended',
    data: { coachingId: event.coachingId, coachName: await getCoachName(event.coachId) },
  });
}

let registered = false;

/** Called once when the app is created; calling it again does nothing. */
export function registerNotificationListeners(): void {
  if (registered) return;
  registered = true;
  appEvents.on('trainee.onboarded', onTraineeOnboarded);
  appEvents.on('plan.published', onPlanPublished);
  appEvents.on('workout.completed', onWorkoutCompleted);
  appEvents.on('nutrition_plan.published', onNutritionPlanPublished);
  appEvents.on('coaching.ended', onCoachingEnded);
}

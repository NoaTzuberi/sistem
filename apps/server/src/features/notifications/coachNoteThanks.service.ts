import type { CoachNoteId } from '@sistem/types';
import { LocalizedError } from '../../i18n';
import { User } from '../users/user.model';
import { DEFAULT_TIMEZONE } from '../users/users.constants';
import { Plan } from '../plans/plan.model';
import { localDateString, weekStartOf } from '../plans/planWeek';
import { NutritionPlanVersion } from '../nutrition/nutritionPlan.model';
import { notify } from './notification.service';

// Home's "👍 Thanks!" chip under the coach's note. The client only names WHICH note; the server
// finds it (her own, published, with text) and her coach — the same notes Home shows.

export class CoachNoteNotFoundError extends LocalizedError {}

/** The note's id: this week's published plan with notes, or her newest nutrition version with an intro. */
async function findNoteId(traineeId: string, timezone: string, note: CoachNoteId): Promise<string | null> {
  if (note === 'plan') {
    const weekStartDate = weekStartOf(localDateString(new Date(), timezone));
    const plan = await Plan.findOne({ traineeId, weekStartDate, status: 'published' }).select('notes').lean();
    return plan?.notes?.trim() ? String(plan._id) : null;
  }
  const latest = await NutritionPlanVersion.findOne({ traineeId }).sort({ version: -1 }).select('introMessage').lean();
  return latest?.introMessage?.trim() ? String(latest._id) : null;
}

export async function thankCoachForNote(traineeId: string, note: CoachNoteId): Promise<void> {
  const trainee = await User.findById(traineeId).select('name coachId timezone').lean();
  if (!trainee?.coachId) throw new CoachNoteNotFoundError('coach_note_not_found');
  const noteId = await findNoteId(traineeId, trainee.timezone ?? DEFAULT_TIMEZONE, note);
  if (!noteId) throw new CoachNoteNotFoundError('coach_note_not_found');

  await notify(String(trainee.coachId), {
    type: 'coach_note_thanks',
    data: { traineeId, traineeName: trainee.name, note, noteId },
  });
}

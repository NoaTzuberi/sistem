import type { Types } from 'mongoose';
import { User } from '../users/user.model';
import { DEFAULT_TIMEZONE } from '../users/users.constants';
import { Coaching } from '../coachings/coaching.model';
import { notify } from '../notifications/notification.service';
import { PlanBlock } from './planBlock.model';
import { blockWeekStart } from './planBlock.service';
import { currentWeekStart } from './planWeek';

// "התוכנית של <name> מסתיימת השבוע" — there is no scheduler (owner, 2026-11-09): the notification is
// made the first time the coach opens Today or her notifications during the block's last week
// (in the trainee's zone). One per block (dedupe `block_ending:<blockId>` + endingNotifiedAt).

/**
 * Announces this coach's published blocks that are in their last week. A block whose last week
 * already passed without her opening the app is closed quietly (endingNotifiedAt set, nothing sent):
 * "ends this week" would no longer be true.
 */
export async function announceEndingBlocks(coachId: string, now: Date = new Date()): Promise<void> {
  const blocks = await PlanBlock.find({ coachId, status: 'published', endingNotifiedAt: null })
    .select('traineeId coachingId startWeek lengthWeeks')
    .lean<{ _id: Types.ObjectId; traineeId: Types.ObjectId; coachingId: Types.ObjectId; startWeek: string; lengthWeeks: number }[]>();
  if (blocks.length === 0) return;

  const [trainees, liveCoachings] = await Promise.all([
    User.find({ _id: { $in: blocks.map((block) => block.traineeId) } }).select('name timezone').lean<{ _id: Types.ObjectId; name?: string; timezone?: string }[]>(),
    Coaching.find({ _id: { $in: blocks.map((block) => block.coachingId) }, live: true }).select('_id').lean(),
  ]);
  const byId = new Map(trainees.map((trainee) => [String(trainee._id), trainee]));
  const live = new Set(liveCoachings.map((coaching) => String(coaching._id)));

  for (const block of blocks) {
    const trainee = byId.get(String(block.traineeId));
    const thisWeek = currentWeekStart(trainee?.timezone ?? DEFAULT_TIMEZONE, now);
    const lastWeek = blockWeekStart(block.startWeek, block.lengthWeeks);
    if (lastWeek > thisWeek) continue;
    // Claimed first: two screens opening at once announce once.
    const claimed = await PlanBlock.updateOne({ _id: block._id, endingNotifiedAt: null }, { $set: { endingNotifiedAt: now } });
    if (claimed.modifiedCount === 0 || lastWeek < thisWeek || !trainee || !live.has(String(block.coachingId))) continue;
    await notify(coachId, {
      type: 'plan_block_ending',
      data: { traineeId: String(block.traineeId), traineeName: trainee.name ?? '', blockId: String(block._id), weekStartDate: lastWeek },
    });
  }
}

/** Never fails the screen that triggered it. */
export async function announceEndingBlocksSafely(coachId: string, now: Date = new Date()): Promise<void> {
  try {
    await announceEndingBlocks(coachId, now);
  } catch (error) {
    console.error(`[plan blocks] ending check failed for ${coachId}:`, error);
  }
}

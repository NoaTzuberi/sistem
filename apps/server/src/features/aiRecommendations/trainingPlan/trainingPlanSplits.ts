import type { PatternId, TrainingConfig } from '@sistem/types';
import { msg, type ServerMessage } from '../../../i18n';
import { cappedDayRange, findSplit, nearestDayCount, splitDayCounts, splitsFitting } from '../../trainingSplits/trainingSplit.service';
import { MAX_SPLIT_OPTIONS } from './trainingPlan.constants';
import type { SplitMenu, SplitOffer } from './trainingPlanPrompt';

// Pure (Phase 12b): which splits the model may offer her, with which day counts, and how many
// options it must return — decided in code from the coach's config and her training days.

export type SplitMenuResult = { ok: true; value: SplitMenu } | { ok: false; message: ServerMessage };

export function buildSplitMenu(config: TrainingConfig, range: { min: number; max: number }, requestedSplitId?: string): SplitMenuResult {
  const fitting: SplitOffer[] = splitsFitting(config, range).map(({ split, days }) => ({ splitId: split.id, days }));

  if (requestedSplitId) {
    const split = findSplit(config, requestedSplitId);
    if (!split || splitDayCounts(split).length === 0) return { ok: false, message: msg('ai_split_unknown') };
    // The coach may pick a split outside her days: then its day count nearest to them.
    const fits = fitting.find((offer) => offer.splitId === split.id)?.days;
    const requested: SplitOffer = { splitId: split.id, days: fits ?? [nearestDayCount(split, range)!] };
    const others = fitting.filter((offer) => offer.splitId !== split.id);
    return {
      ok: true,
      value: { offers: [requested, ...others], optionCount: Math.min(MAX_SPLIT_OPTIONS, 1 + others.length), requestedSplitId: split.id },
    };
  }

  if (fitting.length === 0) {
    const { min, max } = cappedDayRange(range);
    return { ok: false, message: msg('ai_split_none_fits', { min, max }) };
  }
  return { ok: true, value: { offers: fitting, optionCount: Math.min(MAX_SPLIT_OPTIONS, fitting.length) } };
}

/** Every pattern a slot of the offered splits asks for, in slot order. */
export function neededPatterns(config: TrainingConfig, menu: SplitMenu): PatternId[] {
  const typeIds = new Set(
    menu.offers.flatMap(({ splitId, days }) => {
      const split = findSplit(config, splitId);
      return split ? days.flatMap((count) => split.days[String(count)] ?? []) : [];
    }),
  );
  const slots = config.workoutTypes.filter((type) => typeIds.has(type.id)).flatMap((type) => type.slots);
  return [...new Set(slots.flatMap((slot) => slot.patterns))];
}

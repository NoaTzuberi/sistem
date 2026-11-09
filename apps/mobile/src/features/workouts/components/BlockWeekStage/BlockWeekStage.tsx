import { IconArrowUp } from '@tabler/icons-react';
import type { TraineePlanBlock } from '@sistem/types';
import { fill, formatWeekRange, useCopy, useI18n } from '@sistem/shared';
import { workoutCopy } from '../../copy';
import './BlockWeekStage.css';

interface BlockWeekStageProps {
  weekStartDate: string;
  block: TraineePlanBlock;
}

/**
 * This week of her multi-week plan, on the pink stage: "שבוע 02 מתוך 4", one segment per week (done
 * weeks full, this one half, later ones faint), and — when it is heavier than last week — a line saying so.
 */
export function BlockWeekStage({ weekStartDate, block }: BlockWeekStageProps) {
  const copy = useCopy(workoutCopy).block;
  const { language, plural } = useI18n();
  const line = block.isDeload ? copy.lightWeek : block.weightIncreases > 0 ? plural(copy.weightUps, block.weightIncreases) : null;
  return (
    <section className="block-stage" aria-label={fill(copy.weekOf, { n: block.week, total: block.lengthWeeks })}>
      <p className="block-stage-week" aria-hidden="true">
        <span className="block-stage-word">{copy.word}</span>
        <bdi className="block-stage-number" dir="ltr">
          {String(block.week).padStart(2, '0')}
        </bdi>
        <span className="block-stage-of">{fill(copy.of, { total: block.lengthWeeks })}</span>
      </p>
      <p className="block-stage-dates">{formatWeekRange(weekStartDate, language)}</p>
      <div className="block-stage-segments" aria-hidden="true">
        {Array.from({ length: block.lengthWeeks }, (_, index) => {
          const week = index + 1;
          const state = week < block.week ? 'done' : week === block.week ? 'now' : 'later';
          return <span key={week} className={`block-stage-segment block-stage-segment-${state}`} />;
        })}
      </div>
      {line && (
        <p className="block-stage-line">
          {!block.isDeload && <IconArrowUp size={16} stroke={2.4} aria-hidden="true" />}
          <span>{line}</span>
        </p>
      )}
    </section>
  );
}

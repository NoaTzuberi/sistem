import { fill, useCopy } from '@sistem/shared';
import { IconCheck } from '@tabler/icons-react';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { appCopy } from '../../../../copy';
import { workoutCopy } from '../../copy';
import { nameScript } from '../../data/weekPlanDisplay';
import './PlayerQueue.css';

export interface QueueItem {
  id: string;
  name: string;
  /** One entry per set: done or not. */
  sets: boolean[];
}

interface PlayerQueueProps {
  items: QueueItem[];
  /** The exercise on screen. */
  currentId: string | null;
  onSelect: (id: string) => void;
}

/** "The workout": every exercise as a row — tap to jump to it. Pink = on screen, Cherry ✓ = done. */
export function PlayerQueue({ items, currentId, onSelect }: PlayerQueueProps) {
  const copy = useCopy(workoutCopy);
  const eyebrow = useCopy(appCopy).eyebrow;

  return (
    <section className="wp-queue" aria-labelledby="wp-queue-title">
      <h2 className="wp-queue-title" id="wp-queue-title">
        <Eyebrow>{eyebrow.upNext}</Eyebrow>
        {copy.player.queue}
      </h2>
      <ol>
        {items.map((item, index) => {
          const done = item.sets.filter(Boolean).length;
          const isCurrent = item.id === currentId;
          const isDone = done === item.sets.length;
          const state = isCurrent ? ' wp-queue-row-current' : isDone ? ' wp-queue-row-done' : '';
          return (
            <li key={item.id}>
              <button type="button" className={'wp-queue-row' + state} aria-current={isCurrent ? 'step' : undefined} onClick={() => onSelect(item.id)}>
                <span className="wp-queue-index" aria-hidden="true">
                  {isDone && !isCurrent ? <IconCheck size={14} stroke={3} /> : index + 1}
                </span>
                <span className="wp-queue-name display-name" {...nameScript(item.name)}>
                  {item.name}
                </span>
                <span className="wp-queue-pips" role="img" aria-label={fill(copy.player.queueSets, { done, total: item.sets.length })}>
                  {item.sets.map((setDone, setIndex) => (
                    <i key={setIndex} className={setDone ? 'wp-queue-pip-done' : undefined} />
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

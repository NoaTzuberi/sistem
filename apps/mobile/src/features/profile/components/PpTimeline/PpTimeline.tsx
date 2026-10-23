import { IconPlus } from '@tabler/icons-react';
import { dateFormat, fill, formatDateOnly, poseLabel, useCopy, useLanguage } from '@sistem/shared';
import type { MonthGroup, ProgressItem } from '../../data/progressTimeline';
import { monthEyebrow, weekChip } from '../../data/progressTimeline';
import { profileCopy } from '../../copy';
import './PpTimeline.css';

interface PpTimelineProps {
  groups: MonthGroup[];
  weekOf: (date: string) => number;
  onOpen: (item: ProgressItem) => void;
  onAdd: () => void;
  onLinkExpired: () => void;
}

function monthTitle(month: string, language: ReturnType<typeof useLanguage>): string {
  return dateFormat(language, { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(`${month}-01T00:00:00Z`));
}

/** Her progress photos by month: 3 tiles a row (3:4, a week chip); the newest month starts with "+ New photo". */
export function PpTimeline({ groups, weekOf, onOpen, onAdd, onLinkExpired }: PpTimelineProps) {
  const copy = useCopy(profileCopy).pp;
  const language = useLanguage();
  return (
    <div className="pp-timeline">
      {groups.map((group, groupIndex) => (
        <section key={group.month} className="pp-month" aria-labelledby={`pp-month-${group.month}`}>
          <h3 className="pp-month-title" id={`pp-month-${group.month}`}>
            <code className="pp-eyebrow" aria-hidden="true">
              {monthEyebrow(group.month)}
            </code>
            {monthTitle(group.month, language)}
          </h3>
          <ul className="pp-grid">
            {groupIndex === 0 && (
              <li>
                <button type="button" className="pp-tile pp-tile-add" onClick={onAdd}>
                  <IconPlus size={20} stroke={2.4} aria-hidden="true" />
                  {copy.newPhoto}
                </button>
              </li>
            )}
            {group.items.map((item) => {
              const label = fill(copy.openPhoto, { pose: poseLabel(item.pose, language), date: formatDateOnly(item.date, language) });
              return (
                <li key={item.key}>
                  <button type="button" className="pp-tile" onClick={() => onOpen(item)} aria-label={label}>
                    <img className="pp-tile-image" src={item.photo.url} alt="" loading="lazy" decoding="async" onError={onLinkExpired} />
                    <code className="pp-tile-week" aria-hidden="true">
                      {weekChip(weekOf(item.date))}
                    </code>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

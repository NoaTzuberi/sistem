import type { MealLogDay, PortionGroup } from '@sistem/types';
import { formatNumber, sharedCopy, useLanguage } from '@sistem/shared';
import { circlesFor } from '../../../nutrition/data/portionCircles';
import './FuelToday.css';

const GROUPS: PortionGroup[] = ['protein', 'carb', 'fat', 'snack'];

interface FuelTodayProps {
  day: MealLogDay;
}

/**
 * Today's portions per group (marked / planned), read-only — marking happens in the Nutrition tab.
 * One pip per planned portion (a planned half is a half pip); a group with nothing planned is left out.
 */
export function FuelToday({ day }: FuelTodayProps) {
  const language = useLanguage();
  const groups = sharedCopy[language].nutrition.groups;

  return (
    <dl className="fuel-today">
      {GROUPS.filter((group) => day.planned[group] > 0).map((group) => (
        <div key={group} className={`fuel-today-row fuel-today-${group}`}>
          <dt className="fuel-today-label display-title">{groups[group]}</dt>
          <dd className="fuel-today-pips" aria-hidden="true">
            {circlesFor(day.planned[group], day.eaten[group]).map((pip, index) => (
              <span
                key={index}
                className={[
                  'fuel-today-pip',
                  pip.size < 1 && 'fuel-today-pip-half',
                  pip.filled >= pip.size ? 'fuel-today-pip-on' : pip.filled > 0 && 'fuel-today-pip-part',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            ))}
          </dd>
          <dd className="fuel-today-count" dir="ltr">
            {formatNumber(day.eaten[group], language)}/{formatNumber(day.planned[group], language)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

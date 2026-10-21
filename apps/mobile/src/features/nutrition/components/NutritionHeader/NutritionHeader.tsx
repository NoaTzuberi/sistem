import type { ReactNode } from 'react';
import { dateFormat, useCopy, useLanguage } from '@sistem/shared';
import { IconCamera } from '@tabler/icons-react';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { appCopy } from '../../../../copy';
import { eyebrowDate } from '../../data/nutritionDay';
import { nutritionCopy } from '../../copy';
import './NutritionHeader.css';

interface NutritionHeaderProps {
  /** The selected day ('YYYY-MM-DD'); null until the days arrive (title only). */
  date: string | null;
  /** The "meal photo" pill; hidden when the day has no meal to photograph. */
  onAddPhoto?: () => void;
  /** Under the title row (the week strip). */
  children?: ReactNode;
}

/** The sticky frosted header: the large title, the selected day's date and the "meal photo" pill. */
export function NutritionHeader({ date, onAddPhoto, children }: NutritionHeaderProps) {
  const language = useLanguage();
  const copy = useCopy(nutritionCopy);
  const eyebrow = useCopy(appCopy).eyebrow;

  return (
    <header className="tn-header">
      <div className="tn-header-row">
        <div className="tn-header-titles">
          <h1 className="tn-header-title">{copy.title}</h1>
          {date && (
            <p className="tn-header-date">
              <Eyebrow>{`${eyebrow.fuel} · ${eyebrowDate(date, eyebrow.weekdays)}`}</Eyebrow>
              <span>
                {dateFormat(language, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))}
              </span>
            </p>
          )}
        </div>
        {onAddPhoto && (
          <button type="button" className="tn-header-photo" onClick={onAddPhoto}>
            <IconCamera size={16} stroke={2} aria-hidden="true" />
            {copy.mealPhoto}
          </button>
        )}
      </div>
      {children}
    </header>
  );
}

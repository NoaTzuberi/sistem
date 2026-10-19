import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { isHebrewText } from '../../data/homeDisplay';
import './TodayWorkoutHeadline.css';

interface TodayWorkoutHeadlineProps {
  /** "Today's workout" / "Next workout" / "Rest day". */
  kicker: string;
  /** The mono eyebrow before the kicker ("TODAY"). */
  eyebrow?: string;
  /** The coach's workout name, as written (never translated). Absent: the kicker stands alone. */
  title?: string;
}

/**
 * The stage's headline. A Latin name is set in Barlow Condensed italic, uppercase and isolated
 * left-to-right; a Hebrew name is set in Karantina, upright. Either way it lines up with the page's start.
 */
export function TodayWorkoutHeadline({ kicker, eyebrow, title }: TodayWorkoutHeadlineProps) {
  return (
    <div className="today-headline">
      <p className="today-headline-kicker">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        {kicker}
      </p>
      {title && (
        <h1 className={'today-headline-title' + (isHebrewText(title) ? ' today-headline-title-he' : '')}>
          <bdi dir={isHebrewText(title) ? 'rtl' : 'ltr'}>{title}</bdi>
        </h1>
      )}
    </div>
  );
}

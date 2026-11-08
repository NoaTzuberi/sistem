import { useId } from 'react';
import { useCopy } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { tourCopy } from '../../../tour/copy';
import { useTour } from '../../../tour/hooks/useTour';
import './HelpSection.css';

/**
 * Settings → "עזרה": a soft grouped list. Today one row, the dashboard guide (the tour from step 1,
 * no welcome); later rows join the same list.
 */
export function HelpSection() {
  const copy = useCopy(tourCopy);
  const { start } = useTour();
  const titleId = useId();
  return (
    <section className="help-section" aria-labelledby={titleId}>
      <h2 className="help-section-title" id={titleId}>
        {copy.helpTitle}
      </h2>
      <ul className="help-section-list">
        <li>
          <button type="button" className="help-section-row" onClick={start}>
            <span className="help-section-icon">
              <Icon name="book" size="sm" />
            </span>
            <span className="help-section-label">{copy.guideRow}</span>
            <Icon name="chevron" size="sm" flip className="help-section-chevron" />
          </button>
        </li>
      </ul>
    </section>
  );
}

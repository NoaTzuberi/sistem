import type { ReactNode } from 'react';
import { useCopy } from '@sistem/shared';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { appCopy } from '../../../../copy';
import { nutritionCopy } from '../../copy';
import './MenuSection.css';

interface MenuSectionProps {
  children: ReactNode;
}

/** "Your menu" (menu mode only): the coach's meals, each item swappable within its group. */
export function MenuSection({ children }: MenuSectionProps) {
  const copy = useCopy(nutritionCopy);
  const eyebrow = useCopy(appCopy).eyebrow;
  return (
    <section className="tn-menu" aria-labelledby="tn-menu-title">
      <div className="tn-section-head">
        <h2 className="tn-section-title" id="tn-menu-title">
          <Eyebrow>{eyebrow.menu}</Eyebrow>
          {copy.menuTitle}
        </h2>
        <span className="tn-menu-hint">{copy.menuHint}</span>
      </div>
      {children}
    </section>
  );
}

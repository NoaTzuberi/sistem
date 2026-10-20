import type { CSSProperties } from 'react';
import type { CardioSport } from '@sistem/types';
import { type CardioFrame, cardioMinutes, intensityZone, useCopy, useLanguage } from '@sistem/shared';
import { cardioCopy } from '../../copy';
import { barHeight, previewEyebrow, shortDayName } from '../../data/cardioLabels';
import './CardioPreview.css';

interface CardioPreviewProps {
  name: string;
  sport: CardioSport;
  totalSec: number;
  frames: CardioFrame[];
  days: number[];
  repeatsWeekly: boolean;
}

/** "How she will see it": a small dark card with the name, a mini graph and the days. */
export function CardioPreview({ name, sport, totalSec, frames, days, repeatsWeekly }: CardioPreviewProps) {
  const copy = useCopy(cardioCopy);
  const language = useLanguage();
  const dayLine = [days.map((day) => shortDayName(day, language)).join(' · '), repeatsWeekly ? copy.weekly : null].filter(Boolean).join(' · ');

  return (
    <section className="cb-card" aria-labelledby="cb-preview-title">
      <h3 className="cb-side-title" id="cb-preview-title">
        {copy.previewTitle}
      </h3>
      <div className="cb-preview">
        <code className="cb-preview-eyebrow" aria-hidden="true">
          {previewEyebrow(sport, cardioMinutes(totalSec))}
        </code>
        <b className="cb-preview-name" dir="auto">
          {name.trim() || copy.previewFallback}
        </b>
        <div className="cb-preview-graph" aria-hidden="true">
          {frames.map((frame) => (
            <i
              key={frame.index}
              className="cb-zone"
              data-zone={intensityZone(frame.block.intensity)}
              style={{ '--cb-w': frame.block.durationSec, '--cb-h': barHeight(frame.block.intensity) } as CSSProperties}
            />
          ))}
        </div>
        {dayLine && <p className="cb-preview-days">{dayLine}</p>}
      </div>
    </section>
  );
}

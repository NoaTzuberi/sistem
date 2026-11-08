import { useCopy } from '@sistem/shared';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { WidgetCard } from '../../../../components/common/WidgetCard/WidgetCard';
import { tourCopy } from '../../copy';
import { useTour } from '../../hooks/useTour';
import './TourReplayCard.css';

/** Settings: "סיור במערכת" — the first-visit tour again, from its first step. */
export function TourReplayCard() {
  const copy = useCopy(tourCopy);
  const { start } = useTour();
  return (
    <WidgetCard
      className="tour-replay"
      title={copy.replayTitle}
      subtitle={copy.replayHint}
      action={
        <PillButton size="sm" onClick={start}>
          {copy.replayButton}
        </PillButton>
      }
    />
  );
}

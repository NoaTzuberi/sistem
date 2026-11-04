import { useNavigate } from 'react-router-dom';
import { useCopy } from '@sistem/shared';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { ROUTES, progressPhotosDayPath } from '../../../../app/config/routes';
import { PhotoCompare } from '../../../bodyTracking/components/PhotoCompare/PhotoCompare';
import { bodyCopy } from '../../../bodyTracking/copy';
import { SubScreenHeader } from '../../components/SubScreenHeader/SubScreenHeader';
import { useMyBodyMetrics, useMyUnits } from '../../hooks/useMyBody';
import './PhotoComparePage.css';

// Two days of one pose (direction B): side by side or in the slider; "הוספת תמונה" opens today's photos.
export function PhotoComparePage() {
  const copy = useCopy(bodyCopy);
  const navigate = useNavigate();
  const { list, error, isLoading, reload } = useMyBodyMetrics();
  const { units } = useMyUnits();

  return (
    <AppShell bleed>
      <div className="pcp-screen">
        <SubScreenHeader title={copy.compareTitle} fallbackPath={ROUTES.PROFILE_PHOTOS} />
        <div className="pcp-content">
          {isLoading && !list && <StateMessage>{copy.loading}</StateMessage>}
          {error && !list && <StateMessage onRetry={reload}>{error}</StateMessage>}
          {list && <PhotoCompare metrics={list.items} weightUnit={units.weight} onLinkExpired={reload} onAdd={() => navigate(progressPhotosDayPath())} />}
        </div>
      </div>
    </AppShell>
  );
}

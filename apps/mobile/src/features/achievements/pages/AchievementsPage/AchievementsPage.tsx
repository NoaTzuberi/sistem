import { useCopy } from '@sistem/shared';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { ROUTES } from '../../../../app/config/routes';
import { SubScreenHeader } from '../../../profile/components/SubScreenHeader/SubScreenHeader';
import { AchievementsTab } from '../../components/AchievementsTab/AchievementsTab';
import { NextUpCard } from '../../components/NextUpCard/NextUpCard';
import { ProgressStats } from '../../components/ProgressStats/ProgressStats';
import { useMyAchievements } from '../../hooks/useMyAchievements';
import { achievementCopy } from '../../copy';
import './AchievementsPage.css';

/**
 * All her achievements (design group 4): the Profile "הישגים" board — hero, then "הבא בתור" and her numbers,
 * then every badge by category — on the soft sub-screen surface.
 */
export function AchievementsPage() {
  const copy = useCopy(achievementCopy);
  const { data, error, reload } = useMyAchievements();

  return (
    <AppShell bleed surface="soft">
      <div className="achievements-page">
        <SubScreenHeader title={copy.allTitle} fallbackPath={ROUTES.PROFILE} />
        <div className="achievements-page-content">
          {!data && !error && <StateMessage>{copy.loading}</StateMessage>}
          {!data && error && <StateMessage onRetry={reload}>{error}</StateMessage>}
          {data && (
            <AchievementsTab
              overview={data}
              renderMiddle={(board) => (
                <>
                  <NextUpCard board={board} />
                  <ProgressStats overview={data} />
                </>
              )}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

import type { CoachTraineeDetail } from '@sistem/types';
import { CoachCard } from '../CoachCard/CoachCard';
import { LockLine } from '../LockLine/LockLine';
import { QuestionnaireCard } from '../QuestionnaireCard/QuestionnaireCard';
import { TraineeBodyTracking } from '../TraineeBodyTracking/TraineeBodyTracking';
import { TraineeAchievements } from '../TraineeAchievements/TraineeAchievements';

/** גוף: her weight, measurements and progress photos (her own views, read-only, kg / cm), the questionnaire, her achievements. */
export function TraineeBody({ trainee }: { trainee: CoachTraineeDetail }) {
  return (
    <>
      <CoachCard>
        <TraineeBodyTracking traineeId={trainee.id} timezone={trainee.timezone} />
        <LockLine />
      </CoachCard>
      <QuestionnaireCard onboarding={trainee.onboarding} />
      {/* Her full achievement list (the overview shows the streak and numbers only). */}
      <CoachCard>
        <TraineeAchievements traineeId={trainee.id} />
      </CoachCard>
    </>
  );
}

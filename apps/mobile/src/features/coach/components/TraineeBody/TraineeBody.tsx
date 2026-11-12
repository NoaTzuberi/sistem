import type { CoachTraineeDetail } from '@sistem/types';
import { LockLine } from '../LockLine/LockLine';
import { QuestionnaireCard } from '../QuestionnaireCard/QuestionnaireCard';
import { TraineeBodyTracking } from '../TraineeBodyTracking/TraineeBodyTracking';
import { TraineeAchievements } from '../TraineeAchievements/TraineeAchievements';

/** גוף: her weight, measurements and progress photos (her own views, read-only, kg / cm), the questionnaire, her achievements. */
export function TraineeBody({ trainee, questionnaireRequest }: { trainee: CoachTraineeDetail; questionnaireRequest?: number }) {
  return (
    <>
      <TraineeBodyTracking traineeId={trainee.id} timezone={trainee.timezone} />
      <LockLine />
      <QuestionnaireCard onboarding={trainee.onboarding} openRequest={questionnaireRequest} />
      {/* Her full achievement list (the overview shows the streak and numbers only). */}
      <TraineeAchievements traineeId={trainee.id} />
    </>
  );
}

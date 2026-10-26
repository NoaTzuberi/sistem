import { useCopy } from '@sistem/shared';
import { coachCopy } from '../../copy';
import { dashboardLinks } from '../../data/dashboardLinks';
import { CoachCard } from '../CoachCard/CoachCard';
import { DeskNote } from '../DeskNote/DeskNote';
import { NutritionDay } from '../NutritionDay/NutritionDay';
import { TraineeNutrition } from '../TraineeNutrition/TraineeNutrition';

/** תזונה: a day's portions (day picker) and meal photos, then the plan she sees now (read-only). */
export function TraineeNutritionTab({ traineeId }: { traineeId: string }) {
  const copy = useCopy(coachCopy);
  return (
    <>
      <NutritionDay traineeId={traineeId} />
      <CoachCard>
        <TraineeNutrition traineeId={traineeId} />
      </CoachCard>
      <DeskNote text={copy.profile.desk} href={dashboardLinks.traineeNutrition(traineeId)} />
    </>
  );
}

import { useCopy } from '@sistem/shared';
import { coachCopy } from '../../copy';
import { dashboardLinks } from '../../data/dashboardLinks';
import { DeskNote } from '../DeskNote/DeskNote';
import { NutritionDay } from '../NutritionDay/NutritionDay';
import { TraineeNutrition } from '../TraineeNutrition/TraineeNutrition';

/** תזונה: her tracking (day picker, a card per day with portions and meal photos), then the plan she sees now (read-only). */
export function TraineeNutritionTab({ traineeId }: { traineeId: string }) {
  const copy = useCopy(coachCopy);
  return (
    <>
      <NutritionDay traineeId={traineeId} />
      <TraineeNutrition traineeId={traineeId} />
      <DeskNote text={copy.profile.desk} href={dashboardLinks.traineeNutrition(traineeId)} />
    </>
  );
}

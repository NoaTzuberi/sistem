import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { WorkoutsScreen } from '../../components/WorkoutsScreen/WorkoutsScreen';

// Trainee Workouts tab (PRD §5.4): this week's plan, next week, and her history.
export function WorkoutsPage() {
  return (
    <AppShell bleed>
      <WorkoutsScreen />
    </AppShell>
  );
}

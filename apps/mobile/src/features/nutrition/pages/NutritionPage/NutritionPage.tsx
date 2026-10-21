import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { useAuth } from '../../../../services/auth/AuthContext';
import { NutritionScreen } from '../../components/NutritionScreen/NutritionScreen';

// Trainee Nutrition tab (PRD §5.6). Full-bleed like Home / Workouts: the screen draws its own header and
// gutters. Keyed by user: another account on the same phone starts from its own cache.
export function NutritionPage() {
  const { user } = useAuth();
  const userId = user?.id ?? 'anonymous';

  return (
    <AppShell bleed>
      <NutritionScreen key={userId} userId={userId} />
    </AppShell>
  );
}

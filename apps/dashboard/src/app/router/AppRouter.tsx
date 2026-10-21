import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../config/routes';
import { Login } from '../../features/auth/pages/Login/Login';
import { RequireCoach } from '../../features/auth/components/RequireCoach/RequireCoach';
import { AppShell } from '../../components/layout/AppShell/AppShell';
import { OverviewPage } from '../../features/overview/pages/OverviewPage/OverviewPage';
import { StatsPage } from '../../features/stats/pages/StatsPage/StatsPage';
import { TraineesPage } from '../../features/trainees/pages/TraineesPage/TraineesPage';
import { TraineeDetailPage } from '../../features/trainees/pages/TraineeDetailPage/TraineeDetailPage';
import { PlanBuilderPage } from '../../features/planBuilder/pages/PlanBuilderPage/PlanBuilderPage';
import { NutritionBuilderPage } from '../../features/nutrition/pages/NutritionBuilderPage/NutritionBuilderPage';
import { FoodLibraryPage } from '../../features/nutritionLibrary/pages/FoodLibraryPage/FoodLibraryPage';
import { ExerciseLibraryPage } from '../../features/exerciseLibrary/pages/ExerciseLibraryPage/ExerciseLibraryPage';

export function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<Login />} />
      {/* Client-side gate only; every /api/coach route checks role=coach itself. */}
      <Route element={<RequireCoach />}>
        <Route element={<AppShell />}>
          <Route path={ROUTES.HOME} element={<OverviewPage />} />
          <Route path={ROUTES.STATS} element={<StatsPage />} />
          <Route path={ROUTES.TRAINEES} element={<TraineesPage />} />
          <Route path={ROUTES.TRAINEE} element={<TraineeDetailPage />} />
          <Route path={ROUTES.PLAN} element={<PlanBuilderPage />} />
          <Route path={ROUTES.EXERCISES} element={<ExerciseLibraryPage />} />
          <Route path={ROUTES.TRAINEE_NUTRITION} element={<NutritionBuilderPage />} />
          {/* The nutrition library: one page, its tab in the path. */}
          <Route path={ROUTES.NUTRITION} element={<Navigate to={ROUTES.NUTRITION_FOODS} replace />} />
          <Route path={ROUTES.NUTRITION_FOODS} element={<FoodLibraryPage />} />
          <Route path={ROUTES.NUTRITION_TEMPLATES} element={<FoodLibraryPage />} />
          <Route path={ROUTES.NUTRITION_SETTINGS} element={<FoodLibraryPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  );
}

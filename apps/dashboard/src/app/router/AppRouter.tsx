import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../config/routes';
import { CoachSettingsPage } from '../../features/coachSettings/pages/CoachSettingsPage/CoachSettingsPage';
import { Login } from '../../features/auth/pages/Login/Login';
import { RequireRole } from '../../features/auth/components/RequireRole/RequireRole';
import { SetPasswordPage } from '../../features/auth/pages/SetPasswordPage/SetPasswordPage';
import { ForgotPasswordPage } from '../../features/auth/pages/ForgotPasswordPage/ForgotPasswordPage';
import { ResetPasswordPage } from '../../features/auth/pages/ResetPasswordPage/ResetPasswordPage';
import { CoachesPage } from '../../features/admin/pages/CoachesPage/CoachesPage';
import { AppShell } from '../../components/layout/AppShell/AppShell';
import { OverviewPage } from '../../features/overview/pages/OverviewPage/OverviewPage';
import { StatsPage } from '../../features/stats/pages/StatsPage/StatsPage';
import { TraineesPage } from '../../features/trainees/pages/TraineesPage/TraineesPage';
import { TraineeDetailPage } from '../../features/trainees/pages/TraineeDetailPage/TraineeDetailPage';
import { ArchivedTraineePage } from '../../features/trainees/pages/ArchivedTraineePage/ArchivedTraineePage';
import { PlanBuilderPage } from '../../features/planBuilder/pages/PlanBuilderPage/PlanBuilderPage';
import { NutritionBuilderPage } from '../../features/nutrition/pages/NutritionBuilderPage/NutritionBuilderPage';
import { FoodLibraryPage } from '../../features/nutritionLibrary/pages/FoodLibraryPage/FoodLibraryPage';
import { ExerciseLibraryPage } from '../../features/exerciseLibrary/pages/ExerciseLibraryPage/ExerciseLibraryPage';

export function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route path={ROUTES.SET_PASSWORD} element={<SetPasswordPage />} />
      <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
      <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
      {/* Client-side gates only; every /api/admin and /api/coach route checks the role itself. */}
      <Route element={<RequireRole role="admin" />}>
        <Route path={ROUTES.ADMIN_COACHES} element={<CoachesPage />} />
      </Route>
      <Route element={<RequireRole role="coach" />}>
        <Route element={<AppShell />}>
          <Route path={ROUTES.HOME} element={<OverviewPage />} />
          <Route path={ROUTES.STATS} element={<StatsPage />} />
          <Route path={ROUTES.TRAINEES} element={<TraineesPage />} />
          <Route path={ROUTES.TRAINEE} element={<TraineeDetailPage />} />
          <Route path={ROUTES.ARCHIVED_TRAINEE} element={<ArchivedTraineePage />} />
          <Route path={ROUTES.PLAN} element={<PlanBuilderPage />} />
          <Route path={ROUTES.EXERCISES} element={<ExerciseLibraryPage />} />
          <Route path={ROUTES.SETTINGS} element={<CoachSettingsPage />} />
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

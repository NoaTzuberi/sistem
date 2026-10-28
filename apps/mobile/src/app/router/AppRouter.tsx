import { Routes, Route, type Location } from 'react-router-dom';
import {
  ROUTES,
  COACH_TRAINEE_PATH,
  COACH_ARCHIVED_TRAINEE_PATH,
  COACH_THREAD_PATH,
  WORKOUT_DETAIL_PATH,
  WORKOUT_LOG_PATH,
  WORKOUT_SESSION_PATH,
  CARDIO_DETAIL_PATH,
  CARDIO_RUN_PATH,
  WORKOUT_SUMMARY_PATH,
  ONBOARDING_EDIT_PATH,
  JOIN_PATH,
  FIRST_RUN_COACH_PATH,
  JOIN_COACH_CONFIRM_PATH,
  OWN_CARDIO_NEW,
  OWN_CARDIO_EDIT_PATH,
  OWN_CARDIO_DETAIL_PATH,
  OWN_CARDIO_RUN_PATH,
} from '../config/routes';
import { JoinPage } from '../../features/join/pages/JoinPage/JoinPage';
import { ChoosePathPage } from '../../features/firstRun/pages/ChoosePathPage/ChoosePathPage';
import { CoachCodePage } from '../../features/firstRun/pages/CoachCodePage/CoachCodePage';
import { CoachConfirmPage } from '../../features/firstRun/pages/CoachConfirmPage/CoachConfirmPage';
import { OwnCardioBuilderPage } from '../../features/cardio/pages/OwnCardioBuilderPage/OwnCardioBuilderPage';
import { AdminOnlyPage } from '../../features/join/pages/AdminOnlyPage/AdminOnlyPage';
import { Login } from '../../features/auth/pages/Login/Login';
import { Register } from '../../features/auth/pages/Register/Register';
import { ForgotPassword } from '../../features/auth/pages/ForgotPassword/ForgotPassword';
import { ResetPassword } from '../../features/auth/pages/ResetPassword/ResetPassword';
import { CardioDetailPage } from '../../features/cardio/pages/CardioDetailPage/CardioDetailPage';
import { CardioRunPage } from '../../features/cardio/pages/CardioRunPage/CardioRunPage';
import { ProtectedRoute } from '../../features/auth/components/ProtectedRoute/ProtectedRoute';
import { AppStateGuard } from '../../features/auth/components/AppStateGuard/AppStateGuard';
import { RootRedirect } from '../../features/auth/components/RootRedirect/RootRedirect';
import { WaitingPage } from '../../features/waiting/pages/WaitingPage/WaitingPage';
import { HomePage } from '../../features/home/pages/HomePage/HomePage';
import { ProfilePage } from '../../features/profile/pages/ProfilePage/ProfilePage';
import { WeightPage } from '../../features/profile/pages/WeightPage/WeightPage';
import { MeasurementsPage } from '../../features/profile/pages/MeasurementsPage/MeasurementsPage';
import { MeasurementsLogPage } from '../../features/profile/pages/MeasurementsLogPage/MeasurementsLogPage';
import { ProgressPhotosPage } from '../../features/profile/pages/ProgressPhotosPage/ProgressPhotosPage';
import { ProgressPhotosDayPage } from '../../features/profile/pages/ProgressPhotosDayPage/ProgressPhotosDayPage';
import { PhotoComparePage } from '../../features/profile/pages/PhotoComparePage/PhotoComparePage';
import { SettingsPage } from '../../features/profile/pages/SettingsPage/SettingsPage';
import { QuestionnairePage } from '../../features/profile/pages/QuestionnairePage/QuestionnairePage';
import { AchievementsPage } from '../../features/achievements/pages/AchievementsPage/AchievementsPage';
import { AchievementCelebration } from '../../features/achievements/components/AchievementCelebration/AchievementCelebration';
import { WorkoutsPage } from '../../features/workouts/pages/WorkoutsPage/WorkoutsPage';
import { OnboardingPage } from '../../features/onboarding/pages/OnboardingPage/OnboardingPage';
import { WorkoutDetailPage } from '../../features/workouts/pages/WorkoutDetailPage/WorkoutDetailPage';
import { WorkoutLogPage } from '../../features/workouts/pages/WorkoutLogPage/WorkoutLogPage';
import { WorkoutSessionPage } from '../../features/workouts/pages/WorkoutSessionPage/WorkoutSessionPage';
import { WorkoutSummaryPage } from '../../features/workouts/pages/WorkoutSummaryPage/WorkoutSummaryPage';
import { IntervalTimerPage } from '../../features/workouts/pages/IntervalTimerPage/IntervalTimerPage';
import { NutritionPage } from '../../features/nutrition/pages/NutritionPage/NutritionPage';
import { InboxPage } from '../../features/coach/pages/InboxPage/InboxPage';
import { TodayPage } from '../../features/coach/pages/TodayPage/TodayPage';
import { TraineesPage } from '../../features/coach/pages/TraineesPage/TraineesPage';
import { TraineeDetailPage } from '../../features/coach/pages/TraineeDetailPage/TraineeDetailPage';
import { ArchivedTraineePage } from '../../features/coach/pages/ArchivedTraineePage/ArchivedTraineePage';
import { CoachProfilePage } from '../../features/coach/pages/CoachProfilePage/CoachProfilePage';
import { MessagesPage as CoachMessagesPage } from '../../features/coach/pages/MessagesPage/MessagesPage';
import { ThreadPage as CoachThreadPage } from '../../features/coach/pages/ThreadPage/ThreadPage';
import { MessagesPage } from '../../features/messages/pages/MessagesPage/MessagesPage';
import { ScreenTransition } from '../../components/layout/ScreenTransition/ScreenTransition';

/** Every route, for one location: a screen leaving in a tab transition keeps rendering its own. */
function AppRoutes({ location }: { location: Location }) {
  return (
      <Routes location={location}>
        {/* No homepage: "/" redirects by the server-decided app state (PRD §4.2). */}
        <Route path={ROUTES.HOME} element={<RootRedirect />} />
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.REGISTER} element={<Register />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
        <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
        {/* A coach's invite link: public — signed out it leads to the sign-up with the code kept. */}
        <Route path={JOIN_PATH} element={<JoinPage />} />

        <Route element={<ProtectedRoute />}>
          {/* First run without an invite: "how do you want to train" → the coach's code → confirm. */}
          <Route element={<AppStateGuard allow={['choose_path']} />}>
            <Route path={ROUTES.FIRST_RUN} element={<ChoosePathPage />} />
            <Route path={ROUTES.FIRST_RUN_CODE} element={<CoachCodePage mode="firstRun" />} />
            <Route path={FIRST_RUN_COACH_PATH} element={<CoachConfirmPage mode="firstRun" />} />
          </Route>

          <Route element={<AppStateGuard allow={['onboarding']} />}>
            <Route path={ROUTES.ONBOARDING} element={<OnboardingPage />} />
          </Route>

          {/* Until a plan is published, the waiting screen is the only trainee screen. */}
          <Route element={<AppStateGuard allow={['waiting']} />}>
            <Route path={ROUTES.WAITING} element={<WaitingPage />} />
          </Route>

          <Route element={<AppStateGuard allow={['home']} />}>
            <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
            <Route path={ROUTES.PROFILE_WEIGHT} element={<WeightPage />} />
            <Route path={ROUTES.PROFILE_MEASUREMENTS} element={<MeasurementsPage />} />
            <Route path={ROUTES.PROFILE_MEASUREMENTS_LOG} element={<MeasurementsLogPage />} />
            <Route path={ROUTES.PROFILE_PHOTOS} element={<ProgressPhotosPage />} />
            <Route path={ROUTES.PROFILE_PHOTOS_DAY} element={<ProgressPhotosDayPage />} />
            <Route path={ROUTES.PROFILE_PHOTOS_COMPARE} element={<PhotoComparePage />} />
            <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
            <Route path={ROUTES.PROFILE_QUESTIONNAIRE} element={<QuestionnairePage />} />
            <Route path={ROUTES.PROFILE_ACHIEVEMENTS} element={<AchievementsPage />} />
            <Route path={ROUTES.WORKOUTS} element={<WorkoutsPage />} />
            <Route path={WORKOUT_DETAIL_PATH} element={<WorkoutDetailPage />} />
            <Route path={WORKOUT_LOG_PATH} element={<WorkoutLogPage />} />
            <Route path={WORKOUT_SESSION_PATH} element={<WorkoutSessionPage />} />
            <Route path={CARDIO_DETAIL_PATH} element={<CardioDetailPage />} />
            <Route path={CARDIO_RUN_PATH} element={<CardioRunPage />} />
            {/* Her own cardio workouts (self-guided): build, open, run. */}
            <Route path={OWN_CARDIO_NEW} element={<OwnCardioBuilderPage />} />
            <Route path={OWN_CARDIO_EDIT_PATH} element={<OwnCardioBuilderPage />} />
            <Route path={OWN_CARDIO_DETAIL_PATH} element={<CardioDetailPage own />} />
            <Route path={OWN_CARDIO_RUN_PATH} element={<CardioRunPage own />} />
            {/* Joining a coach later (from the Profile): the first run's code + confirm screens. */}
            <Route path={ROUTES.JOIN_COACH_CODE} element={<CoachCodePage mode="later" />} />
            <Route path={JOIN_COACH_CONFIRM_PATH} element={<CoachConfirmPage mode="later" />} />
            <Route path={WORKOUT_SUMMARY_PATH} element={<WorkoutSummaryPage />} />
            <Route path={ROUTES.INTERVAL_TIMER} element={<IntervalTimerPage />} />
            <Route path={ROUTES.NUTRITION} element={<NutritionPage />} />
            <Route path={ONBOARDING_EDIT_PATH} element={<OnboardingPage />} />
            <Route path={ROUTES.TRAINEE_HOME} element={<HomePage />} />
            <Route path={ROUTES.TRAINEE_MESSAGES} element={<MessagesPage />} />
          </Route>

          <Route element={<AppStateGuard allow={['admin']} />}>
            <Route path={ROUTES.ADMIN_ONLY} element={<AdminOnlyPage />} />
          </Route>

          <Route element={<AppStateGuard allow={['coach']} />}>
            <Route path={ROUTES.COACH_TODAY} element={<TodayPage />} />
            <Route path={ROUTES.COACH_INBOX} element={<InboxPage />} />
            <Route path={ROUTES.COACH_TRAINEES} element={<TraineesPage />} />
            <Route path={COACH_TRAINEE_PATH} element={<TraineeDetailPage />} />
            <Route path={COACH_ARCHIVED_TRAINEE_PATH} element={<ArchivedTraineePage />} />
            <Route path={ROUTES.COACH_PROFILE} element={<CoachProfilePage />} />
            <Route path={ROUTES.COACH_MESSAGES} element={<CoachMessagesPage />} />
            <Route path={COACH_THREAD_PATH} element={<CoachThreadPage />} />
          </Route>
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>
  );
}

export function AppRouter() {
  return (
    <>
      {/* One celebration sheet for the whole app (Phase 11) — trainees only. */}
      <AchievementCelebration />
      {/* The screens + the one dock; tab changes get the depth transition. */}
      <ScreenTransition renderScreen={(location) => <AppRoutes location={location} />} />
    </>
  );
}

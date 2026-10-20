import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { healthRouter } from './features/health/health.routes';
import { authRouter } from './features/auth/auth.routes';
import { usersRouter } from './features/users/users.routes';
import { exercisesRouter } from './features/exercises/exercise.routes';
import { onboardingRouter } from './features/onboarding/onboarding.routes';
import { plansRouter } from './features/plans/plan.routes';
import { workoutLogsRouter } from './features/workoutLogs/workoutLog.routes';
import { bodyMetricsRouter } from './features/bodyMetrics/bodyMetric.routes';
import { achievementsRouter } from './features/achievements/achievement.routes';
import { coachRouter } from './features/coach/coach.routes';
import { notificationsRouter } from './features/notifications/notification.routes';
import { nutritionRouter } from './features/nutrition/nutrition.routes';
import { mealLogsRouter } from './features/mealLogs/mealLog.routes';
import { cardioRouter } from './features/cardio/cardio.routes';
import { tabUpdatesRouter } from './features/tabUpdates/tabUpdates.routes';
import { registerNotificationListeners } from './features/notifications/notification.listeners';
import { registerAiRecommendationListeners } from './features/aiRecommendations/aiRecommendation.listeners';

const app = express();

// Only the listed origins get CORS headers. No `credentials`: auth is a Bearer header, not a cookie.
app.use(cors({ origin: config.clientOrigins }));
app.use(express.json());

app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/plans', plansRouter);
app.use('/api/workout-logs', workoutLogsRouter);
app.use('/api/body-metrics', bodyMetricsRouter);
app.use('/api/achievements', achievementsRouter);
app.use('/api/coach', coachRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/nutrition-plan', nutritionRouter);
app.use('/api/meal-logs', mealLogsRouter);
app.use('/api/cardio', cardioRouter);
app.use('/api/tab-updates', tabUpdatesRouter);

registerNotificationListeners();
registerAiRecommendationListeners();

export default app;

import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { isAllowedOrigin } from './config/clientOrigins';
import { securityHeaders } from './middleware/securityHeaders.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
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
import { adminRouter } from './features/admin/admin.routes';
import { joinRouter } from './features/invites/invite.routes';
import { coachingsRouter, communitiesRouter, meRouter } from './features/coachings/coaching.routes';
import { reactionsRouter } from './features/reactions/reaction.routes';
import { messagesRouter } from './features/messages/message.routes';
import { accountRouter } from './features/account/account.routes';
import { registerNotificationListeners } from './features/notifications/notification.listeners';
import { registerAiRecommendationListeners } from './features/aiRecommendations/aiRecommendation.listeners';

const app = express();

app.disable('x-powered-by');
// Behind a host's proxy (Render) the client address is in X-Forwarded-For. Without this every
// visitor shares the proxy's address — one rate-limit bucket for everyone (config/trustProxy.ts).
app.set('trust proxy', config.trustProxy);
app.use(securityHeaders);
// Only the listed origins get CORS headers (in development also the apps' LAN addresses — clientOrigins.ts).
// No `credentials`: auth is a Bearer header, not a cookie.
app.use(cors({ origin: (origin, done) => done(null, isAllowedOrigin(origin, config.clientOrigins, config.nodeEnv)) }));
app.use(express.json());

app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/account', accountRouter);
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
app.use('/api/admin', adminRouter);
app.use('/api/join', joinRouter);
app.use('/api/coachings', coachingsRouter);
app.use('/api/me', meRouter);
app.use('/api/communities', communitiesRouter);
app.use('/api/reactions', reactionsRouter);
app.use('/api/messages', messagesRouter);

app.use(errorHandler);

registerNotificationListeners();
registerAiRecommendationListeners();

export default app;

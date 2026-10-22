import app from './app';
import { config } from './config/env';
import { connectDatabase } from './config/database';
import { failInterruptedRecommendations } from './features/aiRecommendations/aiRecommendation.service';
import { migrateLegacyNutritionPreferences } from './features/onboarding/nutritionPreferencesMigration';
import { migrateCardioSessions } from './features/cardio/cardioSessionMigration';
import { CardioLog } from './features/cardio/cardio.model';
import { syncMealLogIndexes } from './features/mealLogs/mealLog.model';
import { migrateAccounts } from './features/coachings/accountsMigration';

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
  } catch {
    console.error('Failed to connect to MongoDB. Server startup aborted.');
    process.exit(1);
  }

  // Accounts & relationships: roles[], coach profiles, coachings from User.coachId, coachingId on every
  // coach-owned record. First, so every later step (and the cardio migration's plans) finds coachings.
  const accounts = await migrateAccounts();
  if (accounts.roles + accounts.coaches + accounts.coachings + accounts.records > 0) {
    console.log(
      `[accounts] roles ${accounts.roles}, coach profiles ${accounts.coaches}, coachings ${accounts.coachings} (+${accounts.endedCoachings} ended for history), records linked ${accounts.records}.`,
    );
  }

  const interrupted = await failInterruptedRecommendations();
  if (interrupted > 0) console.warn(`[aiRecommendations] ${interrupted} interrupted draft(s) marked failed.`);

  const migrated = await migrateLegacyNutritionPreferences();
  if (migrated > 0) console.log(`[onboarding] ${migrated} nutrition preference answer(s) moved to the 13a+ shape.`);
  await syncMealLogIndexes();
  // Cardio moved into the plan: old separate sessions become plan workouts, and the log's
  // indexes follow its new key (plan + workout instead of session + date).
  const cardio = await migrateCardioSessions();
  if (cardio.sessions > 0 || cardio.skipped > 0) {
    console.log(`[cardio] ${cardio.sessions} session(s) moved into plans as ${cardio.workouts} workout(s); ${cardio.skipped} draft(s) skipped.`);
  }
  await CardioLog.syncIndexes();

  app.listen(config.port, () => {
    console.log(`Sistem server running on port ${config.port}`);
  });
}

startServer();

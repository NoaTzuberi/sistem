import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 30000,
    // Tests never call a real AI / embeddings API: empty keys win over apps/server/.env (dotenv
    // never overrides a variable that is already set). AI tests fake the client instead.
    // Feature flags start closed in every test (a test opens one with setFeatureFlagsForTests).
    env: {
      GEMINI_API_KEY: '',
      AI_MODEL: '',
      AI_FALLBACK_MODEL: '',
      VOYAGE_API_KEY: '',
      FEATURE_NUTRITION_RECIPES: '',
      FEATURE_WATER_TRACKING: '',
      // One coach per trainee unless a test turns multi-coach on (setMultiCoachForTests); no admin by env.
      MULTI_COACH_ENABLED: '',
      // Never send real email from tests (the admin's set-password link is copied instead).
      RESEND_API_KEY: '',
      ADMIN_EMAIL: '',
    },
  },
});

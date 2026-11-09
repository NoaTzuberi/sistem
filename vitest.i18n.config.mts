import { defineConfig } from 'vitest/config';

// The copy parity check (Phase 15): `npm run test:i18n`, also part of `npm test`.
export default defineConfig({
  test: {
    environment: 'node',
    // + the api-client base URL check and the plan builder's state / CSS guards (no client test
    // setup yet — they run here).
    include: ['scripts/i18n-parity.test.ts', 'scripts/api-client.test.ts', 'scripts/plan-builder.test.ts', 'scripts/duplicate-plan.test.ts', 'scripts/plan-blocks.test.ts'],
  },
});

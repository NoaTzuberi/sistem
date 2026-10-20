// Logic and display helpers used by both the web dashboard and the mobile app (coach
// mode, and the trainee screens that show the same data). No UI and no API calls: components stay in each app, calls
// in @sistem/api-client, contract types in @sistem/types (types only — this package
// holds runtime code, so the server never imports it).
export * from './format';
export * from './planDisplay';
export * from './workoutLogDisplay';
export * from './traineeStatus';
export * from './onboardingSections';
export * from './coachNotifications';
export * from './units';
export * from './bodyChart';
export * from './bodyMetricsDisplay';
export * from './achievementDisplay';
export * from './nutritionDisplay';
export * from './textSearch';
export * from './planIssues';
export * from './trainingDisplay';
export * from './trainingSlots';
export * from './cardioDisplay';
export { useLoad } from './hooks/useLoad';
export { useServerNow } from './hooks/useServerNow';
// Phase 15 — languages, copy files, Intl, bidi.
export * from './i18n/copy';
export * from './i18n/language';
export * from './i18n/intl';
export * from './i18n/bidi';
export { I18nProvider, useI18n, useLanguage, useCopy, useUserLanguage } from './i18n/I18nProvider';
export { sharedCopy } from './copy';

import type { CopyShape } from '@sistem/shared';
import type { he } from './he';

// DRAFT English for account deletion (the owner sends the final wording).
export const en: CopyShape<typeof he> = {
  entry: 'Delete account',
  title: 'Delete your account?',
  intro: 'This is permanent and can’t be undone. What gets deleted:',
  items: [
    'Your account and profile',
    'All your workouts, measurements and food logs',
    'All your photos — progress, Daily Pump, meals and profile photo',
    'Your questionnaire answers',
  ],
  coachingNote: 'Your coaching will end.',
  coachNote: 'Your templates and food lists will be deleted. If you have active trainees, end their coaching first.',
  passwordLabel: 'Type your password to confirm',
  passwordPlaceholder: 'Your password',
  confirm: 'Delete account permanently',
  deleting: 'Deleting…',
  cancel: 'Cancel',
  failed: 'Deleting didn’t work. Please try again.',
};

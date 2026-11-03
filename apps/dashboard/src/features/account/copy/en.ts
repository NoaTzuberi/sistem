import type { CopyShape } from '@sistem/shared';
import type { he } from './he';

// DRAFT English for account deletion (the owner sends the final wording).
export const en: CopyShape<typeof he> = {
  entry: 'Delete account',
  title: 'Delete your account?',
  intro: 'This is permanent and can’t be undone. What gets deleted:',
  items: [
    'Your account, profile and community',
    'Your templates, food lists and settings (the system lists stay)',
    'Your invite links and messages',
    'Your profile photo',
  ],
  traineesNote: 'If you have active trainees, end their coaching first.',
  passwordLabel: 'Type your password to confirm',
  confirm: 'Delete account permanently',
  deleting: 'Deleting…',
  cancel: 'Cancel',
  failed: 'Deleting didn’t work. Please try again.',
};

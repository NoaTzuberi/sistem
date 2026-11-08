import type { CopyShape } from '@sistem/shared';
import type { he } from './he';

// DRAFT — waits for the owner's wording (as the Hebrew).
export const en: CopyShape<typeof he> = {
  steps: {
    trainees: {
      title: 'Your trainees',
      body: 'Every trainee is here: who is waiting for a plan, who is active and who needs attention.',
    },
    invite: {
      title: 'How they join',
      body: 'Send a trainee your link or your 6-character code. She enters it in the app and joins you.',
    },
    planBuilder: {
      title: 'Building a plan',
      body: 'A template is only a suggestion: add, remove and change anything. Name each workout — your trainee sees the name.',
    },
    nutrition: {
      title: 'Nutrition',
      body: 'Build a plan in portions or as a full menu. The food bank is ready, and you can add and edit foods.',
    },
    settings: {
      title: 'Messages and payment',
      body: 'Settings keep your default messages for sending plans, and your PayBox and Bit links for trainees.',
    },
    activity: {
      title: 'What’s happening',
      body: 'Finished workouts, photos and updates from your trainees show up here. Notifications wait in the bell.',
    },
  },
  next: 'Next',
  finish: 'Done',
  skip: 'Skip',
  progress: 'Step {step} of {total}',
  dialogLabel: 'Dashboard tour',
  replayTitle: 'Dashboard tour',
  replayHint: 'The short tour of the dashboard, from the start.',
  replayButton: 'Start the tour',
};

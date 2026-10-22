import type { CopyShape } from '@sistem/shared';
import type { he } from './he';

export const en: CopyShape<typeof he> = {
  stepsLabel: 'Step {step} of {total}',
  back: 'Back',
  choice: {
    title: 'How do you want to train?',
    sub: 'You can change this any time from your profile.',
    coachTitle: 'With a coach',
    coachBody: 'You got a code or a link from your coach. She builds you a personal plan.',
    soloTitle: 'On my own',
    soloBody: 'Workouts, runs and nutrition without a coach. You can join a coach any time.',
    soloFailed: "We couldn't save your choice. Try again.",
  },
  code: {
    title: "Your coach's code",
    sub: '6 characters. You can also paste the link you got.',
    groupLabel: 'Coach code',
    charLabel: 'Character {n} of 6',
    pasteLink: 'Paste link',
    pasteHint: 'The link your coach sent you',
    pasteEmpty: "We found no code in what you copied. Type it here.",
    continue: 'Continue',
    checking: 'Checking…',
    invalid: "This code isn't valid or has expired. Check with your coach.",
    notTrainee: "This code is for trainees, and this is a coach's account.",
    failed: "We couldn't check the code. Check your connection and try again.",
    noCode: "I don't have a code yet",
    noCodeNote: 'You can join a coach later, from your profile.',
  },
  confirm: {
    title: 'Is this your coach?',
    access: '{coach} will see your questionnaire answers, your measurements, the workouts you log and the photos you upload. Nobody else will.',
    yes: "Yes, that's her",
    no: 'No, enter another code',
    joining: 'Joining…',
    failed: "We couldn't add you. Try again.",
    alreadyHers: "You're already training with {coach}.",
    otherCoach: "You're already training with {coach}. For now you can train with one coach at a time.",
    loading: "Loading your coach's details…",
  },
  banner: "Joining {coach}'s coaching",
  intro: {
    coach: '{coach} will use your answers to build your plan.',
    coachNoName: 'Your coach will use your answers to build your plan.',
    self: "We'll use your answers to tailor the app to you.",
  },
  later: {
    joined: "You joined {coach}'s coaching",
  },
};

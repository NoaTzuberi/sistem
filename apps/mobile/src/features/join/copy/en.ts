import type { CopyShape } from '@sistem/shared';
import type { he } from './he';

export const en: CopyShape<typeof he> = {
  title: 'Join',
  invitedBy: '{coach} invites you to train with her on Sistem.',
  invitedHint: "After signing up you fill in a short questionnaire, and your coach builds your plan.",
  signUp: 'Sign up',
  haveAccount: 'I already have an account',
  confirmJoin: "Join {coach}'s coaching?",
  confirmJoinText: 'Your coach will see your questionnaire and build you a personal plan.',
  join: 'Join',
  joining: 'Joining…',
  alreadyHers: "You're already training with {coach}.",
  otherCoach: "You're already training with {coach}",
  otherCoachText: "For now you can train with one coach at a time, so we didn't switch coaches. If this is a mistake, talk to your coach.",
  communityTitle: 'Join the {community} community?',
  communityText: 'The community sees only your name and profile photo. Your plan and data stay private.',
  communityJoined: 'You joined the {community} community.',
  notTrainee: "This link is for trainees, and this is a coach's account.",
  problems: {
    invalid: "This link isn't valid or has expired",
    expired: 'This link has expired',
    revoked: 'This link is no longer active',
    used_up: 'This link has already been used',
  },
  problemHint: 'Ask your coach for a new link.',
  continue: 'Continue',
  failed: 'Something went wrong. Try again.',
  retry: 'Try again',
  adminOnlyTitle: 'Admin account',
  adminOnlyText: 'You manage Sistem from the dashboard on a computer.',
  logout: 'Log out',
};

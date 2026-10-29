import type { CopyShape } from '@sistem/shared';
import type { he } from './he';

export const en: CopyShape<typeof he> = {
  title: 'Messages',
  back: 'Back',
  threadLabel: 'Conversation',
  placeholder: 'Write a message…',
  inputLabel: 'Message',
  send: 'Send',
  sendError: "The message wasn't sent. Please try again.",
  loadError: "Couldn't load the messages.",
  older: 'Earlier messages',
  empty: 'No messages yet. You can write here.',
  read: 'Read',
  noCoach: "You don't have a coach right now, so there's no one to write to.",
  mine: 'You',
  reply: 'Reply',
  openThread: 'Messages',
  reactionOn: {
    workout: '{coach} reacted {emoji} to {title}',
    pump: '{coach} reacted {emoji} to your Daily Pump',
    meal: '{coach} reacted {emoji} to your meal photos',
    progress: '{coach} reacted {emoji} to your progress photos',
  },
  reactionOnLog: '{coach} reacted {emoji}',
};

import type { CopyShape } from '@sistem/shared';
import type { he } from './he';

export const en: CopyShape<typeof he> = {
  title: 'Settings',
  subtitle: 'What your trainees see about you',
  navLabel: 'Settings',
  navGroup: 'Account',
  payments: {
    title: 'Payments',
    helper: 'Trainees see this in their profile, on your coach card',
    paybox: 'PayBox link',
    payboxPlaceholder: 'https://',
    payboxHint: 'A link that starts with https://, from the PayBox app',
    bit: 'Bit number',
    bitHint: 'An Israeli mobile, e.g. 050-1234567',
    note: 'Payment note',
    noteHint: 'E.g.: payment at the start of each month',
    noteCount: '{count}/{max}',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Payment details saved',
    loadError: "Couldn't load your payment details. Refresh the page.",
    saveError: "Couldn't save. Try again.",
    previewTitle: 'What your trainee sees',
    previewEmpty: 'Fill in at least one field and it shows here.',
    previewPaybox: 'Pay with PayBox',
    previewBit: 'Bit',
    previewCopy: 'Copy',
    previewDirect: 'You pay your coach directly',
    future: "The app doesn't process or record payments. Payment tracking comes later.",
  },
};

import { isolateLtr } from './i18n/bidi';
import type { CoachSendDefault } from '@sistem/types';

// THE send sheet rule (nutrition plan send + workout plan publish, dashboard and coach mode):
// "my default" or "a new message", the fixed tip on or off, save-as-default. Pure; useSendNote holds it.

export type SendMessageMode = 'default' | 'new';

export interface SendNoteState {
  /** 'default' is only offered when a default message exists. */
  mode: SendMessageMode;
  /** The default message as edited for this send (starts as the default). */
  defaultText: string;
  /** A new message for this send. */
  newText: string;
  /** New message: also save it as the default for this plan kind. */
  saveNewAsDefault: boolean;
  /** The fixed tip goes out with it (only when a tip exists). */
  attachTip: boolean;
}

/** The server's limits for a saved default (coachDefaults.validation.ts). */
export const SEND_DEFAULT_MAX = { message: 600, tip: 300 } as const;
/** The limits on a sent plan (plan.constants / nutrition.constants). */
export const SEND_MESSAGE_MAX = 1500;

const same = (a: string, b: string) => a.trim() === b.trim();

/**
 * Opening the sheet. With a default: "my default", unless the plan already holds a different text
 * of hers (a nutrition note written in the builder) — then "new" with that text. The tip is on
 * whenever one exists.
 */
export function initialSendNote(defaults: CoachSendDefault, draftMessage = ''): SendNoteState {
  const hasOwnText = draftMessage.trim().length > 0 && !(defaults.message !== null && same(draftMessage, defaults.message));
  return {
    mode: defaults.message && !hasOwnText ? 'default' : 'new',
    defaultText: defaults.message ?? '',
    newText: hasOwnText ? draftMessage : '',
    saveNewAsDefault: false,
    attachTip: defaults.tip !== null,
  };
}

/** What goes out: the message of the chosen mode, and the tip when attached. */
export function sentNote(state: SendNoteState, defaults: CoachSendDefault): { introMessage: string; introTip: string } {
  const message = state.mode === 'default' && defaults.message ? state.defaultText : state.newText;
  return { introMessage: message.trim(), introTip: state.attachTip && defaults.tip ? defaults.tip : '' };
}

/** "Save as default" (link, default mode): the default was edited into something savable. */
export function canUpdateDefault(state: SendNoteState, defaults: CoachSendDefault): boolean {
  const text = state.defaultText.trim();
  return state.mode === 'default' && text.length > 0 && text.length <= SEND_DEFAULT_MAX.message && !same(text, defaults.message ?? '');
}

/** The "save as my default" tick (new mode) can be used for this text. */
export function canSaveNewAsDefault(state: SendNoteState): boolean {
  const text = state.newText.trim();
  return text.length > 0 && text.length <= SEND_DEFAULT_MAX.message;
}

/** The text in the message box right now. */
export function currentMessage(state: SendNoteState): string {
  return state.mode === 'default' ? state.defaultText : state.newText;
}

/** "message + tip" / "message" / "tip" / null (nothing): the words come from sharedCopy.sendNote. */
export function describeSendIncludes(includes: { message: boolean; tip: boolean }, words: { message: string; tip: string }): string | null {
  const parts = [includes.message && words.message, includes.tip && words.tip].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' + ') : null;
}

/** "{name} is replaced…": the token stays one left-to-right word inside a Hebrew line (braces not mirrored). */
export function isolateNameToken(text: string): string {
  return text.replace('{name}', isolateLtr('{name}'));
}

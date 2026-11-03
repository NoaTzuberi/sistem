import { type ServerMessage, msg } from '../../i18n';
import type { AccountDeletionInput } from './account.service';
import { ACCOUNT_DELETE_MAX_INPUT } from './account.constants';

type Parsed<T> = { value: T; error?: undefined } | { value?: undefined; error: ServerMessage };

function readText(value: unknown): string | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > ACCOUNT_DELETE_MAX_INPUT) return null;
  return value;
}

/** DELETE /account: { password?: string, confirmWord?: string } — nothing else. */
export function parseAccountDeletion(body: unknown): Parsed<AccountDeletionInput> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return { error: msg('invalid_body') };
  const { password, confirmWord, ...unknownFields } = body as Record<string, unknown>;
  if (Object.keys(unknownFields).length > 0) return { error: msg('invalid_body') };
  const parsedPassword = readText(password);
  const parsedWord = readText(confirmWord);
  if (parsedPassword === null || parsedWord === null) return { error: msg('invalid_body') };
  return { value: { password: parsedPassword, confirmWord: parsedWord } };
}

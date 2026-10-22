// The coach code boxes (pure). A short code is 6 letters / digits; a pasted /join link may carry
// either a short code or a long link code (16+ characters) — a long one skips the boxes.

export const CODE_LENGTH = 6;

/** Letters and digits only, upper case (the server accepts any case). */
export function cleanCodeChars(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

export type PastedCode = { kind: 'short'; chars: string } | { kind: 'link'; code: string } | { kind: 'none' };

/** What a paste holds: a /join link (its code), or characters for the boxes. */
export function readPastedCode(text: string): PastedCode {
  const link = text.trim().match(/\/join\/([A-Za-z0-9_-]+)/);
  if (link) {
    const code = link[1];
    return code.length > CODE_LENGTH ? { kind: 'link', code } : { kind: 'short', chars: cleanCodeChars(code) };
  }
  const chars = cleanCodeChars(text);
  return chars.length > 0 ? { kind: 'short', chars: chars.slice(0, CODE_LENGTH) } : { kind: 'none' };
}

/** The boxes after typing / pasting `chars` from box `start` on. */
export function fillBoxes(boxes: string[], start: number, chars: string): string[] {
  const next = [...boxes];
  for (let index = 0; index < chars.length && start + index < CODE_LENGTH; index += 1) next[start + index] = chars[index];
  return next;
}

export function emptyBoxes(): string[] {
  return Array.from({ length: CODE_LENGTH }, () => '');
}

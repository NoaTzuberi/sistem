// The coach's note + tip may say {name}: her first name, filled when she (or the coach's
// preview of the published version) reads it. Stored raw, so the text as sent never changes.

const NAME_TOKEN = /\{name\}/g;

/** The first word of her name ("Noa Levi" → "Noa"). */
export function firstNameOf(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? '';
}

export function fillTraineeName(text: string | null | undefined, firstName: string): string | null {
  if (!text) return null;
  return text.replace(NAME_TOKEN, firstName);
}

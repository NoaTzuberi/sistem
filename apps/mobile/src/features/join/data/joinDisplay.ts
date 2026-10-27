/** The first word of the coach's name ("Dana Levi" → "Dana") for the sentences that name her. */
export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

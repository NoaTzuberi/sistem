// Which published plan messages she has opened (per device): the card opens until she reads it,
// like the nutrition note. Storage can be missing (private mode): then it simply opens each time.

const KEY = 'sistem.planIntroSeen';
const MAX_KEPT = 20;

/** One plan's message as sent (a re-publish with a new message counts as new). */
export function planIntroKey(planId: string, publishedAt: string | null): string {
  return `${planId}:${publishedAt ?? ''}`;
}

function readSeen(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function isPlanIntroSeen(key: string): boolean {
  return readSeen().includes(key);
}

export function markPlanIntroSeen(key: string): void {
  try {
    const seen = readSeen().filter((item) => item !== key);
    localStorage.setItem(KEY, JSON.stringify([key, ...seen].slice(0, MAX_KEPT)));
  } catch {
    // Not stored: it opens again next time.
  }
}

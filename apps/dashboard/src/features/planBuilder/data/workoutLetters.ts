/**
 * A workout's letter marker (A, B, C … by its place in the week). The name is the title; the letter
 * only marks the card and tab, next to its color. The same Latin letter in both languages.
 */
export function workoutLetter(index: number): string {
  return index >= 0 && index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

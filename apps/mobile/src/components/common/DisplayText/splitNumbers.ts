export interface TextRun {
  text: string;
  isNumber: boolean;
}

// A number with its joiners: "25", "2026", "11–17", "21/25", "3:40", "1,200", "8.5".
const NUMBER = /\d+(?:[–\-/:.,]\d+)*/g;

/** "25 אימונים" → [{ "25", number }, { " אימונים" }]. Order is the logical (typed) order. */
export function splitNumbers(text: string): TextRun[] {
  const runs: TextRun[] = [];
  let last = 0;
  for (const match of text.matchAll(NUMBER)) {
    const start = match.index ?? 0;
    if (start > last) runs.push({ text: text.slice(last, start), isNumber: false });
    runs.push({ text: match[0], isNumber: true });
    last = start + match[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last), isNumber: false });
  return runs;
}

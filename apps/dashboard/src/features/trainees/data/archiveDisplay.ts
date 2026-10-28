/** 'YYYY-MM-DD' Sunday of the week an instant falls in, in her zone — "this week" of an archive = the week it ended. */
export function currentWeekStartOf(iso: string, timezone: string): string {
  // en-CA writes dates as YYYY-MM-DD; only the digits are used, never shown. i18n-ignore
  const local = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  const date = new Date(`${local}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return date.toISOString().slice(0, 10);
}

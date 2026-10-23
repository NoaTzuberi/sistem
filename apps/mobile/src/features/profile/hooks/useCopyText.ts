/** Copies a text; false when the browser refuses (no permission / no API) — the caller says so. */
export function useCopyText() {
  return async function copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };
}

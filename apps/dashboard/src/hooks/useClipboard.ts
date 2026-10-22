import { useCallback } from 'react';

/** Copies a text; false when the browser refuses (no clipboard permission / insecure page). */
export function useClipboard() {
  return useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, []);
}

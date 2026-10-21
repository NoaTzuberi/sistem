import { useEffect } from 'react';

/** The attribute a list page puts on its search input ("/" jumps to it). */
export const SEARCH_SHORTCUT_ATTRIBUTE = 'data-search-shortcut';

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * "/" focuses the open page's own search (trainees, foods, exercise library) — never while she types,
 * and never with a modifier (⌘K stays the palette). Pages without a marked search ignore it.
 */
export function useSlashSearch(): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      const input = document.querySelector<HTMLInputElement>(`[${SEARCH_SHORTCUT_ATTRIBUTE}]`);
      if (!input) return;
      event.preventDefault();
      input.focus();
      input.select();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}

import { useEffect } from 'react';

/**
 * Enter in a number field (every stepper and number input in the dashboard) finishes the edit: the field
 * blurs, which commits what saves on blur and shows the autosave state. The key is not swallowed, so a
 * form's own Enter (submit) still works.
 */
export function useEnterToBlur(): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter' || event.isComposing) return;
      const target = event.target;
      if (target instanceof HTMLInputElement && target.type === 'number') target.blur();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}

import type { Language } from '@sistem/types';
import { sharedCopy, useCopy, useI18n } from '@sistem/shared';
import './LanguageToggle.css';

interface LanguageToggleProps {
  /** After the UI switched (a logged-in screen saves it on the server); without it only this device remembers. */
  onChange?: (language: Language) => void;
  /** Where it sits is the screen's business (the login pins it to a corner). */
  className?: string;
  /** vertical = the two options stacked (the dashboard's icon rail is one option wide). */
  orientation?: 'horizontal' | 'vertical';
}

// EN first, then עב — the same order in both languages (the group is always left-to-right).
const OPTIONS: Language[] = ['en', 'he'];

/**
 * The compact language toggle: a soft grey pill with EN | עב, the active one on a white thumb that
 * slides between them. Switches at once, no reload (Phase 15).
 *
 * Depends only on @sistem/shared + the design tokens, so the mobile app can take this folder
 * as it is (there is no shared UI package yet).
 */
export function LanguageToggle({ onChange, className, orientation = 'horizontal' }: LanguageToggleProps) {
  const { language, setLanguage } = useI18n();
  const copy = useCopy(sharedCopy);

  function choose(next: Language) {
    if (next === language) return;
    setLanguage(next);
    onChange?.(next);
  }

  return (
    <div
      className={['language-toggle', `language-toggle-${language}`, `language-toggle-${orientation}`, className].filter(Boolean).join(' ')}
      role="group"
      aria-label={copy.language}
      dir="ltr"
    >
      <span className="language-toggle-thumb" aria-hidden="true" />
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          className={'language-toggle-option' + (option === language ? ' language-toggle-option-active' : '')}
          aria-pressed={option === language}
          // The short label alone ("EN", "עב") says little to a screen reader.
          aria-label={copy.languageNames[option]}
          onClick={() => choose(option)}
        >
          {copy.languageShort[option]}
        </button>
      ))}
    </div>
  );
}

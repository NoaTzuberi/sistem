import type { Language } from '@sistem/types';
import { LANGUAGES, sharedCopy, useCopy, useI18n } from '@sistem/shared';
import './LanguageSwitch.css';

interface LanguageSwitchProps {
  /** After the UI switched (Settings saves it on the server); without it only this device remembers. */
  onChange?: (language: Language) => void;
  disabled?: boolean;
}

/** עברית | English — each language by its own name. Switches at once, no reload (Phase 15). */
export function LanguageSwitch({ onChange, disabled }: LanguageSwitchProps) {
  const { language, setLanguage } = useI18n();
  const copy = useCopy(sharedCopy);

  function choose(next: Language) {
    if (next === language) return;
    setLanguage(next);
    onChange?.(next);
  }

  return (
    <div className="language-switch" role="group" aria-label={copy.language}>
      {LANGUAGES.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          className={'language-switch-option' + (option === language ? ' language-switch-option-active' : '')}
          aria-pressed={option === language}
          disabled={disabled}
          onClick={() => choose(option)}
        >
          {copy.languageNames[option]}
        </button>
      ))}
    </div>
  );
}

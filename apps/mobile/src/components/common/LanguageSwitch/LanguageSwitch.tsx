import type { CSSProperties } from 'react';
import type { Language } from '@sistem/types';
import { LANGUAGES, sharedCopy, useCopy, useI18n } from '@sistem/shared';
import './LanguageSwitch.css';

interface LanguageSwitchProps {
  /** After the UI switched (Settings saves it on the server); without it only this device remembers. */
  onChange?: (language: Language) => void;
  disabled?: boolean;
  /** stage = on the pink stage (signed-out screens): a white thumb slides under the chosen language. */
  variant?: 'default' | 'stage';
}

/** עברית | English — each language by its own name. Switches at once, no reload (Phase 15). */
export function LanguageSwitch({ onChange, disabled, variant = 'default' }: LanguageSwitchProps) {
  const { language, setLanguage } = useI18n();
  const copy = useCopy(sharedCopy);

  function choose(next: Language) {
    if (next === language) return;
    setLanguage(next);
    onChange?.(next);
  }

  return (
    <div
      className={'language-switch' + (variant === 'stage' ? ' language-switch-stage' : '')}
      role="group"
      aria-label={copy.language}
      style={{ '--ls-index': LANGUAGES.indexOf(language), '--ls-count': LANGUAGES.length } as CSSProperties}
    >
      {variant === 'stage' && <span className="language-switch-thumb" aria-hidden="true" />}
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

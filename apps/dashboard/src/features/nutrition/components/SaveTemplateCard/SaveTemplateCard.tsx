import { useState } from 'react';
import { useCopy } from '@sistem/shared';
import { nutritionCopy } from '../../copy';
import './SaveTemplateCard.css';

interface SaveTemplateCardProps {
  /** Nothing to save without meals. */
  disabled: boolean;
  /** Resolves when it was saved (the name is cleared then). */
  onSave: (name: string) => Promise<boolean>;
}

/** "Save as template": a name, then save — the button waits for a name. */
export function SaveTemplateCard({ disabled, onSave }: SaveTemplateCardProps) {
  const copy = useCopy(nutritionCopy);
  const [name, setName] = useState('');
  const canSave = !disabled && name.trim().length > 0;
  return (
    <section className="nb-save-template-card" aria-labelledby="nb-save-template-title">
      <h3 className="nb-side-title" id="nb-save-template-title">
        {copy.saveAsTemplate}
      </h3>
      <div className="nb-save-template">
        <input className="nb-save-template-input" dir="auto" value={name} placeholder={copy.templateName} aria-label={copy.templateName} onChange={(event) => setName(event.target.value)} />
        <button className="nb-save-template-button" type="button" disabled={!canSave} onClick={async () => (await onSave(name.trim())) && setName('')}>
          {copy.saveAsTemplate}
        </button>
      </div>
    </section>
  );
}

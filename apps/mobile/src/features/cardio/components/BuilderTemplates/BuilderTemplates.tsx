import type { CSSProperties } from 'react';
import { cardioTimeline, intensityZone, useCopy } from '@sistem/shared';
import { CARDIO_TEMPLATES, CARDIO_TEMPLATE_IDS } from '../../data/ownCardioDraft';
import type { CardioTemplateId } from '../../data/ownCardioDraft';
import { cardioCopy } from '../../copy';
import './BuilderTemplates.css';

interface BuilderTemplatesProps {
  onPick: (template: CardioTemplateId) => void;
}

// The mini profile of each template (built once: the shape never changes).
const SHAPES = Object.fromEntries(
  CARDIO_TEMPLATE_IDS.map((id) => [id, cardioTimeline(CARDIO_TEMPLATES[id].build()).map((frame) => frame.block)]),
) as Record<CardioTemplateId, ReturnType<typeof cardioTimeline>[number]['block'][]>;

/** "התחלה מתבנית" (a new, untouched workout only): three starters with their shape. */
export function BuilderTemplates({ onPick }: BuilderTemplatesProps) {
  const copy = useCopy(cardioCopy).builder;
  return (
    <section className="cb-templates" aria-labelledby="cb-templates-title">
      <h2 className="cb-templates-title" id="cb-templates-title">
        {copy.templatesTitle}
      </h2>
      <div className="cb-templates-list">
        {CARDIO_TEMPLATE_IDS.map((id) => (
          <button key={id} type="button" className="cb-template" onClick={() => onPick(id)}>
            <b className="cb-template-name">{copy.templates[id]}</b>
            <bdi className="cb-template-meta" dir="ltr">
              {copy.templateMeta[id]}
            </bdi>
            <span className="cb-template-bars" dir="ltr" aria-hidden="true">
              {SHAPES[id].map((block, index) => (
                <i
                  key={index}
                  className="cb-template-bar cp-zone"
                  data-zone={intensityZone(block.intensity)}
                  style={{ '--cb-w': block.durationSec, '--cb-h': `${18 + block.intensity * 8}%` } as CSSProperties}
                />
              ))}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

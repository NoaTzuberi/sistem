import { useState } from 'react';
import { fill, formatNumber, useCopy, useLanguage } from '@sistem/shared';
import { IconInfoCircle } from '@tabler/icons-react';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import { TextWithNumber } from '../PortionNumber/PortionNumber';
import { nutritionCopy } from '../../copy';
import './ProteinGoal.css';

interface ProteinGoalProps {
  /** The coach's daily protein goal in grams (only shown when she set one). */
  grams: number;
}

/**
 * Under the protein row: "~X g protein a day" and (i) → a short sheet on what the goal is. Only the
 * coach's own number — the food data has no protein per portion, so nothing is computed or estimated.
 */
export function ProteinGoal({ grams }: ProteinGoalProps) {
  const language = useLanguage();
  const copy = useCopy(nutritionCopy).protein;
  const [isOpen, setIsOpen] = useState(false);
  const value = formatNumber(grams, language);

  return (
    <div className="tn-protein">
      <p className="tn-protein-line">
        <TextWithNumber
          text={fill(copy.line, { grams: '{n}' })}
          number={
            <bdi className="tn-protein-number" dir="ltr">
              ~{value}
            </bdi>
          }
        />
      </p>
      <button type="button" className="tn-protein-info" aria-label={copy.infoLabel} onClick={() => setIsOpen(true)}>
        <IconInfoCircle size={18} stroke={2} aria-hidden="true" />
      </button>

      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        labelledBy="tn-protein-title"
        footer={
          <button type="button" className="tn-protein-close" onClick={() => setIsOpen(false)}>
            {copy.close}
          </button>
        }
      >
        <h2 className="tn-protein-title" id="tn-protein-title">
          {copy.infoTitle}
        </h2>
        <p className="tn-protein-text">
          <TextWithNumber
            text={fill(copy.infoText, { grams: '{n}' })}
            number={
              <bdi className="tn-protein-number" dir="ltr">
                {value}
              </bdi>
            }
          />
        </p>
      </BottomSheet>
    </div>
  );
}

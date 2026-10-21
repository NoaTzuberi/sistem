import { useCopy } from '@sistem/shared';
import { nutritionCopy } from '../../copy';
import './FreeVegetables.css';

interface FreeVegetablesProps {
  /** Opens the vegetable list — only when the coach has vegetable items. */
  onOpen?: () => void;
}

/** "Vegetables — free, at any meal, in any amount": not counted, so no bar. */
export function FreeVegetables({ onOpen }: FreeVegetablesProps) {
  const copy = useCopy(nutritionCopy);
  const content = (
    <>
      <b className="tn-vegetables-title">{copy.vegetablesTitle}</b>
      {copy.vegetablesLine}
    </>
  );
  return onOpen ? (
    <button type="button" className="tn-vegetables tn-vegetables-button" onClick={onOpen}>
      {content}
    </button>
  ) : (
    <p className="tn-vegetables">{content}</p>
  );
}

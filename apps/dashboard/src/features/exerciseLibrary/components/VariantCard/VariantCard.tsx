import type { ExerciseVariantSummary } from '@sistem/types';
import { fill, humanizeId, useCopy, useLanguage, variantLabel } from '@sistem/shared';
import { exerciseLibraryCopy } from '../../copy';
import './VariantCard.css';

interface VariantCardProps {
  member: ExerciseVariantSummary;
  /** How many exercises its variant has (the main one + copies); shown on the main one when > 1. */
  variantSize: number;
  isBusy: boolean;
  onMakeMain: () => void;
}

/**
 * One exercise of the family. The main exercise of its variant — the one the builder and the AI
 * offer — wears "★ main" and a pink ring; a copy can be made the main one. The library has no
 * media yet, so the picture is the "no video" tile.
 */
export function VariantCard({ member, variantSize, isBusy, onMakeMain }: VariantCardProps) {
  const language = useLanguage();
  const copy = useCopy(exerciseLibraryCopy);
  return (
    <li className={member.isPrimary ? 'variant-card variant-card-main' : 'variant-card'}>
      <div className="variant-card-media">
        <span className="variant-card-no-media">{copy.noVideo}</span>
      </div>
      {member.isPrimary && <span className="variant-card-badge variant-card-badge-main">{copy.mainBadge}</span>}
      {member.isPrimary && variantSize > 1 && (
        // Only the text is left-to-right: a dir on the badge itself would flip its inline-end corner onto "main".
        <span className="variant-card-badge variant-card-badge-copies">
          <bdi dir="ltr">{fill(copy.copiesBadge, { count: variantSize })}</bdi>
        </span>
      )}
      {!member.isPrimary && (
        <button className="variant-card-make-main" type="button" disabled={isBusy} onClick={onMakeMain}>
          {copy.makeMain}
        </button>
      )}
      <bdi className="variant-card-name">{member.name}</bdi>
      <ul className="variant-card-tags">
        <li>{variantLabel(member.variant, language)}</li>
        {member.equipment
          .filter((item) => item !== member.variant)
          .map((item) => (
            <li key={item}>
              <bdi>{humanizeId(item)}</bdi>
            </li>
          ))}
      </ul>
    </li>
  );
}

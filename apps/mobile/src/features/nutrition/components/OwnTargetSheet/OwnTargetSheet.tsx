import type { OwnNutritionTarget } from '@sistem/types';
import { formatPortionCount, PORTION_GROUPS, sharedCopy, useCopy } from '@sistem/shared';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import { CardioSwitch } from '../../../cardio/components/CardioSwitch/CardioSwitch';
import { SgStepper } from '../../../cardio/components/SgStepper/SgStepper';
import { MAX_OWN_PORTIONS, useOwnTargetForm } from '../../hooks/useOwnTargetForm';
import { nutritionCopy } from '../../copy';
import './OwnTargetSheet.css';

interface OwnTargetSheetProps {
  isOpen: boolean;
  onClose: () => void;
  current: OwnNutritionTarget | null;
  /** Saved: the screen reloads the days (today follows the new target). */
  onSaved: () => void;
}

/** "היעד שלי" (self-guided): how many portions of each group a day, and whether vegetables are free. */
export function OwnTargetSheet({ isOpen, onClose, current, onSaved }: OwnTargetSheetProps) {
  const copy = useCopy(nutritionCopy).ownTarget;
  const groups = useCopy(sharedCopy).nutrition.groups;
  const form = useOwnTargetForm(isOpen, current, () => {
    onSaved();
    onClose();
  });

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="sg-target-title"
      footer={
        <button type="button" className="sg-target-save" onClick={() => void form.save()} disabled={form.isSaving || form.isEmpty}>
          {form.isSaving ? copy.saving : copy.save}
        </button>
      }
    >
      <h2 className="sg-target-title" id="sg-target-title">
        {copy.title}
      </h2>
      <p className="sg-target-sub">{copy.sub}</p>
      <div className="sg-target-groups">
        {PORTION_GROUPS.map((group) => (
          <SgStepper
            key={group}
            label={groups[group]}
            display={formatPortionCount(form.portions[group])}
            onDecrease={() => form.step(group, -1)}
            onIncrease={() => form.step(group, 1)}
            canDecrease={form.portions[group] > 0}
            canIncrease={form.portions[group] < MAX_OWN_PORTIONS}
          />
        ))}
      </div>
      <div className="sg-target-veg">
        <CardioSwitch checked={form.freeVegetables} onChange={form.setFreeVegetables} label={copy.freeVegetables} hint={copy.freeVegetablesHint} />
      </div>
      <p className="sg-target-error" role="alert">
        {form.error ?? ''}
      </p>
    </BottomSheet>
  );
}

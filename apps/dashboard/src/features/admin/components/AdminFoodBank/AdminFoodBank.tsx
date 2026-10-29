import { useCopy } from '@sistem/shared';
import { Toast } from '../../../../components/common/Toast/Toast';
import { useToast } from '../../../../hooks/useToast';
import { useUndoToast } from '../../../../hooks/useUndoToast';
import { appCopy } from '../../../../copy';
import { FoodBankPanel } from '../../../nutritionLibrary/components/FoodBankPanel/FoodBankPanel';
import { adminFoodSource } from '../../../nutritionLibrary/data/foodSources';
import { useFoods } from '../../../nutritionLibrary/hooks/useFoods';
import { adminCopy } from '../../copy';
import './AdminFoodBank.css';

/**
 * The system food bank (owner 2026-10-28): every coach and trainee sees it. The admin adds, edits and
 * removes its items with the coach library's own list and sheet; coaches only copy, hide or restore.
 */
export function AdminFoodBank() {
  const copy = useCopy(adminCopy);
  const app = useCopy(appCopy);
  const foods = useFoods(adminFoodSource);
  const { toastMessage, showToast } = useToast();
  const { undoMessage, offerUndo, undo } = useUndoToast();

  return (
    <section className="admin-food-bank" aria-labelledby="admin-food-bank-title">
      <header className="admin-food-bank-head">
        <h2 className="admin-food-bank-title" id="admin-food-bank-title">
          {copy.foodBankTitle}
        </h2>
        <p className="admin-food-bank-text">{copy.foodBankText}</p>
      </header>
      <FoodBankPanel foods={foods} onToast={showToast} offerUndo={offerUndo} />
      <Toast message={undoMessage ?? toastMessage} action={undoMessage ? { label: app.shell.undo, onPress: undo } : undefined} />
    </section>
  );
}

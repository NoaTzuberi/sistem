import type { MealLogDay } from '@sistem/types';
import { useCopy } from '@sistem/shared';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import { MealPhotoField } from '../MealPhotoField/MealPhotoField';
import { nutritionCopy } from '../../copy';
import './MealPhotoSheet.css';

interface MealPhotoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  day: MealLogDay;
  onDayChange: (day: MealLogDay) => void;
  onLinkExpired: () => void;
}

/**
 * "Meal photo": one slot per meal of that day (photos are per meal), each the existing private-photo
 * flow — compressed on the phone, EXIF / GPS dropped, visible only to her and her coach.
 */
export function MealPhotoSheet({ isOpen, onClose, day, onDayChange, onLinkExpired }: MealPhotoSheetProps) {
  const copy = useCopy(nutritionCopy);
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} labelledBy="tn-photo-sheet-title">
      <h2 className="tn-photo-sheet-title" id="tn-photo-sheet-title">
        {copy.mealPhoto}
      </h2>
      <p className="tn-photo-sheet-privacy">{copy.photoPrivacy}</p>
      <ul className="tn-photo-sheet-meals">
        {day.meals.map((meal) => (
          <li key={meal.id} className="tn-photo-sheet-meal">
            <h3 className="tn-photo-sheet-meal-name" dir="auto">
              <bdi>{meal.name}</bdi>
            </h3>
            <MealPhotoField
              date={day.date}
              mealId={meal.id}
              mealName={meal.name}
              photo={day.photos.find((photo) => photo.mealId === meal.id)}
              editable={day.editable}
              onDayChange={onDayChange}
              onLinkExpired={onLinkExpired}
            />
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}

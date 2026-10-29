import type { DeleteFoodItemResult, FoodItem, FoodItemPayload, NutritionConfig } from '@sistem/types';
import { createFood, deleteFood, getNutritionSettings, listFoods, restoreFood, setFoodHidden, updateFood } from '../../../services/coach/coachService';
import { createSystemFood, deleteSystemFood, listSystemFoods, restoreSystemFood, updateSystemFood } from '../../../services/admin/adminService';

// Where a food list reads and writes: the coach's library (the bank merged with her own items) or the
// admin's system bank. The server decides everything (copy-on-write, archive vs delete, caps).

export interface FoodBankSource {
  load: () => Promise<{ foods: FoodItem[]; config: NutritionConfig }>;
  create: (payload: FoodItemPayload) => Promise<FoodItem>;
  update: (foodId: string, payload: FoodItemPayload) => Promise<FoodItem>;
  remove: (foodId: string) => Promise<DeleteFoodItemResult>;
  restore: (foodId: string) => Promise<FoodItem>;
  /** Coach only: a system item out of her lists, or back. */
  setHidden?: (foodId: string, hidden: boolean) => Promise<FoodItem>;
}

export const coachFoodSource: FoodBankSource = {
  load: async () => {
    const [foods, settings] = await Promise.all([listFoods(), getNutritionSettings()]);
    return { foods, config: settings.config };
  },
  create: createFood,
  update: updateFood,
  remove: deleteFood,
  restore: restoreFood,
  setHidden: setFoodHidden,
};

export const adminFoodSource: FoodBankSource = {
  load: async () => {
    const { items, config } = await listSystemFoods();
    return { foods: items, config };
  },
  create: createSystemFood,
  update: updateSystemFood,
  remove: deleteSystemFood,
  restore: restoreSystemFood,
};

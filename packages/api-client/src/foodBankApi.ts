import type { AxiosInstance } from 'axios';
import type { AdminFoodBankResponse, DeleteFoodItemResult, FoodItem, FoodItemPayload } from '@sistem/types';
import { toNutritionRequestError } from './coachApi';

// The admin's system food bank (/api/admin/foods — the server checks the admin role on each call).
export function createAdminFoodsApi(client: AxiosInstance) {
  async function call<T>(fallback: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      throw toNutritionRequestError(error, fallback);
    }
  }

  async function listSystemFoods(): Promise<AdminFoodBankResponse> {
    return (await client.get<AdminFoodBankResponse>('/admin/foods')).data;
  }

  function createSystemFood(payload: FoodItemPayload): Promise<FoodItem> {
    return call("Couldn't add the food item.", async () => (await client.post<{ item: FoodItem }>('/admin/foods', payload)).data.item);
  }

  function updateSystemFood(foodId: string, payload: FoodItemPayload): Promise<FoodItem> {
    return call("Couldn't save the food item.", async () => (await client.patch<{ item: FoodItem }>(`/admin/foods/${foodId}`, payload)).data.item);
  }

  /** Deleted when nothing uses it, archived otherwise (plans, templates or a coach's copy). */
  function deleteSystemFood(foodId: string): Promise<DeleteFoodItemResult> {
    return call("Couldn't remove the food item.", async () => (await client.delete<DeleteFoodItemResult>(`/admin/foods/${foodId}`)).data);
  }

  function restoreSystemFood(foodId: string): Promise<FoodItem> {
    return call("Couldn't restore the food item.", async () => (await client.post<{ item: FoodItem }>(`/admin/foods/${foodId}/restore`)).data.item);
  }

  return { listSystemFoods, createSystemFood, updateSystemFood, deleteSystemFood, restoreSystemFood };
}

export type AdminFoodsApi = ReturnType<typeof createAdminFoodsApi>;

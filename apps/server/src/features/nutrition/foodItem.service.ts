import { Types } from 'mongoose';
import type { DeleteFoodItemResult, FoodItem, FoodItemPayload, NutritionConfig, PortionGroup } from '@sistem/types';
import { PORTION_GROUP_IDS, isCategoryOf } from './nutrition.constants';
import { Template } from '../templates/template.model';
import { CoachProfile } from '../coachProfiles/coachProfile.model';
import { FoodItem as FoodItemModel } from './foodItem.model';
import { NutritionPlan, NutritionPlanVersion } from './nutritionPlan.model';
import { Recipe } from './nutritionLogs.model';
import { toPublicFoodItem } from './nutritionMapping';
import type { LeanFoodItem } from './nutritionMapping';
import { mergeFoodBank, sortFoods } from './foodBank';
import { getEffectiveNutritionConfig, mergeNutritionConfig } from './nutritionSettings.service';
import { foodKcalProblem } from './nutrition.validation';
import { LocalizedError } from '../../i18n';

// The food bank (owner 2026-10-28): system items for everyone + each coach's own items. A coach writes
// only her own items: editing a system item makes her own copy (copy-on-write, basedOn), removing that
// copy restores the original, and a system item she doesn't want is hidden, never changed. Only the
// admin writes system items (the admin functions at the bottom). Another coach's item is simply not found.

export class FoodItemNotFoundError extends LocalizedError {}
export class FoodItemValidationError extends LocalizedError {}

const SYSTEM = { scope: 'system' } as const;

type FoodDoc = InstanceType<typeof FoodItemModel>;

async function hiddenSystemFoodIds(coachId: string): Promise<Set<string>> {
  const profile = await CoachProfile.findOne({ userId: coachId }).select('hiddenSystemFoods').lean();
  return new Set((profile?.hiddenSystemFoods ?? []).map(String));
}

/**
 * Her lists (library, plan builder, food picker, AI drafts, the trainee's swaps): the system bank minus
 * what she replaced or hid, plus her own items (archived ones included — callers skip them where needed).
 */
export async function listCoachFoods(coachId: string, options: { includeHidden?: boolean } = {}): Promise<FoodItem[]> {
  const [system, own, hidden] = await Promise.all([
    FoodItemModel.find({ ...SYSTEM, archivedAt: null }).lean<LeanFoodItem[]>(),
    FoodItemModel.find({ coachId }).lean<LeanFoodItem[]>(),
    hiddenSystemFoodIds(coachId),
  ]);
  return mergeFoodBank(system.map(toPublicFoodItem), own.map(toPublicFoodItem), hidden, options);
}

/**
 * Items by id for plans, versions and templates: her own + any system item (archived, hidden or replaced
 * ones too — a line that points at one keeps resolving). Never another coach's item.
 */
export async function findCoachFoods(coachId: string, ids?: readonly string[]): Promise<Map<string, FoodItem>> {
  const filter: Record<string, unknown> = { $or: [{ coachId }, SYSTEM] };
  if (ids) filter._id = { $in: ids.filter((id) => Types.ObjectId.isValid(id)) };
  const items = await FoodItemModel.find(filter).lean<LeanFoodItem[]>();
  return new Map(items.map((item) => [String(item._id), toPublicFoodItem(item)]));
}

/** The lists a trainee without a coach sees: the system bank. */
export async function listSystemBank(): Promise<FoodItem[]> {
  return sortFoods((await FoodItemModel.find({ ...SYSTEM, archivedAt: null }).lean<LeanFoodItem[]>()).map(toPublicFoodItem));
}

/** Whether her lists have any active portion-group item (the AI nutrition draft needs some). */
export async function coachHasActiveFoods(coachId: string): Promise<boolean> {
  const foods = await listCoachFoods(coachId);
  return foods.some((food) => !food.archivedAt && (PORTION_GROUP_IDS as readonly string[]).includes(food.group));
}

function checkKcal(group: FoodItem['group'], kcal: number | null | undefined, config: NutritionConfig): void {
  const problem = foodKcalProblem(group, kcal, config);
  if (problem) throw new FoodItemValidationError(problem);
}

/** Writes a payload onto an item (her own, or a system item for the admin), checked against `config`. */
function applyPayload(item: FoodDoc, input: FoodItemPayload, config: NutritionConfig): void {
  const group = input.group ?? item.group;
  checkKcal(group, input.kcal !== undefined ? input.kcal : item.kcal, config);
  if (input.group !== undefined) item.group = input.group;
  if (input.name !== undefined) item.name = input.name;
  if (input.portion !== undefined) item.portion = input.portion;
  if (input.grams !== undefined) item.grams = input.grams;
  if (input.kcal !== undefined) item.kcal = input.kcal;
  if (input.isNew !== undefined) item.isNewItem = input.isNew;
  if (input.dietTags !== undefined) item.dietTags = input.dietTags;
  if (input.order !== undefined) item.order = input.order;
  if (input.category !== undefined) {
    if (input.category !== null && !isCategoryOf(group, input.category)) {
      throw new FoodItemValidationError('food_category_wrong_group');
    }
    item.category = input.category;
  } else if (item.category && !isCategoryOf(group, item.category)) {
    // Moved to another group without a new category: the old one no longer fits.
    item.category = null;
  }
}

async function nextOrder(filter: Record<string, unknown>): Promise<number> {
  return ((await FoodItemModel.findOne(filter).sort({ order: -1 }).select('order').lean())?.order ?? -1) + 1;
}

function newItemFields(input: FoodItemPayload, config: NutritionConfig) {
  const group = input.group!;
  checkKcal(group, input.kcal, config);
  const category = input.category ?? null;
  if (category !== null && !isCategoryOf(group, category)) throw new FoodItemValidationError('food_category_wrong_group');
  return {
    group,
    name: input.name,
    portion: input.portion,
    grams: input.grams ?? null,
    kcal: input.kcal ?? null,
    isNewItem: input.isNew ?? false,
    dietTags: input.dietTags ?? [],
    category,
  };
}

// ---------------------------------------------------------------------------
// Coach
// ---------------------------------------------------------------------------

export async function createCoachFood(coachId: string, input: FoodItemPayload): Promise<FoodItem> {
  const fields = newItemFields(input, await getEffectiveNutritionConfig(coachId));
  // New items go to the end of their group in her lists unless an order was given.
  const order = input.order ?? Math.max(await nextOrder({ coachId, group: fields.group }), await nextOrder({ ...SYSTEM, group: fields.group }));
  const created = await FoodItemModel.create({ scope: 'coach', coachId, ...fields, order });
  return toPublicFoodItem(created.toObject() as LeanFoodItem);
}

/**
 * Points her own plan lines (working copies), templates and recipes from one item to another — when she
 * makes or removes an edited copy. Published versions keep what was published (both ids resolve); her next
 * publish carries the change.
 */
async function repointCoachFoodLines(coachId: string, fromId: Types.ObjectId, toId: Types.ObjectId): Promise<void> {
  const line = { arrayFilters: [{ 'line.foodItemId': fromId }] };
  await Promise.all([
    NutritionPlan.updateMany(
      { coachId, 'meals.options.lines.foodItemId': fromId },
      { $set: { 'meals.$[].options.$[].lines.$[line].foodItemId': toId } },
      line,
    ),
    Template.updateMany(
      { coachId, 'nutrition.meals.options.lines.foodItemId': fromId },
      { $set: { 'nutrition.meals.$[].options.$[].lines.$[line].foodItemId': toId } },
      line,
    ),
    Recipe.updateMany(
      { coachId, 'ingredients.foodItemId': fromId },
      { $set: { 'ingredients.$[line].foodItemId': toId } },
      line,
    ),
  ]);
}

/**
 * Her own item: edited in place. A system item: copy-on-write — her copy (basedOn it) takes the change and
 * replaces it in her lists and in her plans; a second edit updates the same copy. The system item never changes.
 */
export async function updateCoachFood(coachId: string, foodId: string, input: FoodItemPayload): Promise<FoodItem> {
  const config = await getEffectiveNutritionConfig(coachId);
  const own = await FoodItemModel.findOne({ _id: foodId, coachId });
  if (own) {
    applyPayload(own, input, config);
    await own.save();
    return toPublicFoodItem(own.toObject() as LeanFoodItem);
  }

  const original = await FoodItemModel.findOne({ _id: foodId, ...SYSTEM, archivedAt: null });
  if (!original) throw new FoodItemNotFoundError('food_not_found');
  const existingCopy = await FoodItemModel.findOne({ coachId, basedOn: original._id, archivedAt: null });
  if (existingCopy) {
    applyPayload(existingCopy, input, config);
    await existingCopy.save();
    return toPublicFoodItem(existingCopy.toObject() as LeanFoodItem);
  }

  const copy = new FoodItemModel({
    scope: 'coach',
    coachId,
    basedOn: original._id,
    group: original.group,
    name: original.name,
    portion: original.portion,
    grams: original.grams ?? null,
    kcal: original.kcal ?? null,
    isNewItem: original.isNewItem,
    dietTags: [...original.dietTags],
    category: original.category ?? null,
    order: original.order,
  });
  applyPayload(copy, input, config);
  await copy.save();
  await repointCoachFoodLines(coachId, original._id, copy._id);
  return toPublicFoodItem(copy.toObject() as LeanFoodItem);
}

/** Used by any plan (working copy or published version), template or recipe — or a coach's copy is based on it. */
export async function isFoodItemUsed(foodId: string | Types.ObjectId): Promise<boolean> {
  const inMeals = { 'meals.options.lines.foodItemId': foodId };
  const checks = await Promise.all([
    NutritionPlan.exists(inMeals),
    NutritionPlanVersion.exists(inMeals),
    Template.exists({ 'nutrition.meals.options.lines.foodItemId': foodId }),
    Recipe.exists({ 'ingredients.foodItemId': foodId }),
    FoodItemModel.exists({ basedOn: foodId }),
  ]);
  return checks.some((found) => found !== null);
}

/** Archive when something still uses it (it keeps resolving), else delete (PRD §5.6). */
async function archiveOrDelete(item: FoodDoc): Promise<DeleteFoodItemResult> {
  if (await isFoodItemUsed(item._id)) {
    item.archivedAt ??= new Date();
    await item.save();
    return { outcome: 'archived', item: toPublicFoodItem(item.toObject() as LeanFoodItem) };
  }
  await FoodItemModel.deleteOne({ _id: item._id });
  return { outcome: 'deleted', item: null };
}

/**
 * Her own item: deleted, or archived while used. Her edited copy: "restore to original" — her plans point
 * back at the system item and the copy goes (archived while a published version still shows it).
 */
export async function deleteCoachFood(coachId: string, foodId: string): Promise<DeleteFoodItemResult> {
  const item = await FoodItemModel.findOne({ _id: foodId, coachId });
  if (!item) throw new FoodItemNotFoundError('food_not_found');
  if (!item.basedOn) return archiveOrDelete(item);

  await repointCoachFoodLines(coachId, item._id, item.basedOn);
  const result = await archiveOrDelete(item);
  return { outcome: 'reverted', item: result.item };
}

export async function restoreCoachFood(coachId: string, foodId: string): Promise<FoodItem> {
  const item = await FoodItemModel.findOneAndUpdate(
    // An archived edited copy is not restored: the original is back in her lists.
    { _id: foodId, coachId, basedOn: null },
    { $set: { archivedAt: null } },
    { returnDocument: 'after' },
  ).lean<LeanFoodItem>();
  if (!item) throw new FoodItemNotFoundError('food_not_found');
  return toPublicFoodItem(item);
}

/** Hides a system item from her lists, or shows it again. Lines already using it keep resolving. */
export async function setSystemFoodHidden(coachId: string, foodId: string, hidden: boolean): Promise<FoodItem> {
  const item = await FoodItemModel.findOne({ _id: foodId, ...SYSTEM, archivedAt: null }).lean<LeanFoodItem>();
  if (!item) throw new FoodItemNotFoundError('food_not_found');
  await CoachProfile.updateOne(
    { userId: coachId },
    hidden ? { $addToSet: { hiddenSystemFoods: item._id } } : { $pull: { hiddenSystemFoods: item._id } },
  );
  return { ...toPublicFoodItem(item), hidden };
}

/** How many items in her lists would be above a new group value (the settings screen refuses those). */
export async function countFoodsAboveCaps(coachId: string, caps: Record<PortionGroup, number>): Promise<number> {
  const foods = await listCoachFoods(coachId);
  return foods.filter((food) => food.group !== 'vegetable' && food.kcal !== null && food.kcal > caps[food.group]).length;
}

// ---------------------------------------------------------------------------
// Admin: the system bank (checked against the default group values)
// ---------------------------------------------------------------------------

function defaultConfig(): NutritionConfig {
  return mergeNutritionConfig(null);
}

/** Every system item, archived ones included, with the default numbers they are checked against. */
export async function listSystemFoods(): Promise<{ items: FoodItem[]; config: NutritionConfig }> {
  const items = await FoodItemModel.find(SYSTEM).lean<LeanFoodItem[]>();
  return { items: sortFoods(items.map(toPublicFoodItem)), config: defaultConfig() };
}

export async function createSystemFood(input: FoodItemPayload): Promise<FoodItem> {
  const fields = newItemFields(input, defaultConfig());
  const _id = new Types.ObjectId();
  const created = await FoodItemModel.create({
    _id,
    scope: 'system',
    coachId: null,
    // Admin-made items get a key of their own; seeded ones carry the list's key.
    itemKey: `admin:${String(_id)}`,
    ...fields,
    order: input.order ?? (await nextOrder({ ...SYSTEM, group: fields.group })),
  });
  return toPublicFoodItem(created.toObject() as LeanFoodItem);
}

async function findSystemFood(foodId: string): Promise<FoodDoc> {
  const item = await FoodItemModel.findOne({ _id: foodId, ...SYSTEM });
  if (!item) throw new FoodItemNotFoundError('food_not_found');
  return item;
}

export async function updateSystemFood(foodId: string, input: FoodItemPayload): Promise<FoodItem> {
  const item = await findSystemFood(foodId);
  applyPayload(item, input, defaultConfig());
  await item.save();
  return toPublicFoodItem(item.toObject() as LeanFoodItem);
}

/** Archived while any plan, template or coach copy uses it; deleted otherwise. */
export async function deleteSystemFood(foodId: string): Promise<DeleteFoodItemResult> {
  return archiveOrDelete(await findSystemFood(foodId));
}

export async function restoreSystemFood(foodId: string): Promise<FoodItem> {
  const item = await findSystemFood(foodId);
  item.archivedAt = null;
  await item.save();
  return toPublicFoodItem(item.toObject() as LeanFoodItem);
}


import { Schema, model } from 'mongoose';
import { DIET_TAG_IDS, FOOD_GROUP_IDS, FOOD_SCOPE_IDS } from './nutrition.constants';
import type { FoodItemDocument } from './nutrition.types';

// The food bank (PRD §5.6, owner 2026-10-28): exchange-list items, one portion each.
// - system items: one app-wide bank (no coachId), seen by every coach and trainee; only the admin edits them.
// - coach items: one coach's own additions, and her edited copies of system items (basedOn → the system
//   item they replace in her lists; the system item itself is never changed by a coach).
// Names and portions are stored exactly as written (Hebrew) — never translated. An item a plan, version
// or template uses is archived, never deleted.
const foodItemSchema = new Schema<FoodItemDocument>(
  {
    // Missing on items from before the food bank = coach.
    scope: { type: String, enum: FOOD_SCOPE_IDS, default: 'coach' },
    // Set on coach items only (the service decides; system items have none).
    coachId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    basedOn: { type: Schema.Types.ObjectId, ref: 'FoodItem', default: null },
    itemKey: { type: String, default: undefined },
    group: { type: String, enum: FOOD_GROUP_IDS, required: true },
    name: { type: String, required: true, trim: true },
    portion: { type: String, required: true, trim: true },
    // Eggs, slices and spoons have no grams.
    grams: { type: Number, min: 0, default: null },
    // Optional; never above the group's value (checked in the service — the cap is per coach).
    kcal: { type: Number, min: 0, default: null },
    // The coach's "new" tag (API: isNew — a reserved Mongoose path name).
    isNewItem: { type: Boolean, default: false },
    dietTags: { type: [{ type: String, enum: DIET_TAG_IDS }], default: [] },
    // One of the group's categories (FOOD_CATEGORY_IDS — checked in the service), or none.
    category: { type: String, default: null },
    order: { type: Number, default: 0 },
    archivedAt: { type: Date, default: null },
    // Coach items seeded before the food bank (seed:nutrition now writes system items by itemKey).
    seedKey: { type: String, default: undefined },
  },
  { timestamps: true },
);

foodItemSchema.index({ coachId: 1, group: 1, archivedAt: 1, order: 1 });
foodItemSchema.index({ scope: 1, group: 1, order: 1 });
foodItemSchema.index({ coachId: 1, basedOn: 1 });
foodItemSchema.index(
  { coachId: 1, seedKey: 1 },
  { unique: true, partialFilterExpression: { seedKey: { $type: 'string' } } },
);
// No duplicate system items.
foodItemSchema.index(
  { itemKey: 1 },
  { unique: true, partialFilterExpression: { scope: 'system', itemKey: { $type: 'string' } } },
);

export const FoodItem = model<FoodItemDocument>('FoodItem', foodItemSchema);

// Private photos (Daily Pump, Phase 9; progress photos, Phase 10; meal photos, Phase 13a+) — PRD §11: personal
// data, never a public URL.

// Signed links are made per request, after the access check, and expire after this.
export const PHOTO_URL_TTL_SEC = 60 * 60;

// The phone compresses to ~200–500 KB (≤1600 px JPEG); this only stops abuse.
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

// Stored at most this big; Cloudinary re-encodes on upload, which also drops any
// metadata (e.g. GPS) a client didn't strip.
export const MAX_STORED_PHOTO_EDGE_PX = 2000;

export const PUMP_PHOTO_FOLDER = 'sistem/pump-photos';
export const PROGRESS_PHOTO_FOLDER = 'sistem/progress-photos';
export const MEAL_PHOTO_FOLDER = 'sistem/meal-photos';
export const AVATAR_PHOTO_FOLDER = 'sistem/avatars';

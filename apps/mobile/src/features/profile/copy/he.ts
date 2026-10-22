import { plural } from '@sistem/shared';

// Profile + Settings (Phase 10). DRAFT Hebrew of the English placeholders (phase-15 report).
// The profile redesign (docs/design/trainee-profile.html): Hebrew from the design where it has it;
// lines the design doesn't have are PLACEHOLDER (marked) until the owner sends wording.
export const he = {
  noEntries: 'עדיין לא תועד דבר',
  settings: 'הגדרות',
  nutritionPreferencesTitle: 'תזונה ומטרה',
  weightGoalLabel: 'המטרה שלי',
  settingsTitle: 'הגדרות',
  unitsTitle: 'יחידות',
  unitsHint: 'למשקל הגוף ולמידות שלך. האימונים נשארים בק״ג בינתיים.',
  weightUnit: 'משקל',
  lengthUnit: 'מידות',
  unitsSaveError: 'לא הצלחנו לשנות את היחידות. נסי שוב.',
  timezone: 'אזור זמן',
  account: 'חשבון',
  notSetYet: 'עדיין לא הוגדר',
  goals: 'מטרות',
  trainingFrequency: 'תדירות אימונים',
  daysPerWeek: '{min}–{max} ימים בשבוע',
  flexibleSchedule: ' · לו״ז גמיש',
  preferredActivities: 'פעילויות מועדפות',
  equipment: 'ציוד',
  redoOnboarding: 'מילוי השאלון מחדש',
  editLabel: 'עריכת {title}',
  loadError: 'לא הצלחנו לטעון את הפרופיל שלך.',
  languageTitle: 'שפה',
  languageHint: 'האפליקציה וההודעות שתקבלי יוצגו בשפה הזו.',
  languageSaveError: 'לא הצלחנו לשנות את השפה. נסי שוב.',

  // ── The Profile screen (redesign) ──
  title: 'פרופיל',
  coachChip: 'המאמנת: {name}',
  scoreLabel: 'המספרים שלי', // PLACEHOLDER (screen readers only)
  scoreWorkouts: 'אימונים',
  scoreStreak: 'שבועות ברצף',
  scorePrs: 'שיאים אישיים',
  tabsLabel: 'אזורים',
  tabs: { body: 'גוף', photos: 'תמונות', achievements: 'הישגים' },
  // Body
  weightUpdated: 'עודכן ב־{date}',
  weightChange: 'שינוי בטווח:', // PLACEHOLDER (screen readers only)
  chartLabel: 'גרף משקל, {from} עד {to}', // PLACEHOLDER (screen readers only)
  rangeLabel: 'טווח הגרף', // PLACEHOLDER (screen readers only)
  rangeMonth: 'חודש',
  rangeAll: 'מההתחלה',
  updateMeasurement: 'עדכון מדידה',
  weightHistory: 'כל השקילות', // PLACEHOLDER
  measurementsTitle: 'היקפים',
  measurementsNote: '{unit} · מההתחלה',
  measurementCount: plural({ one: 'מדידה אחת', two: '2 מדידות', other: '{count} מדידות' }),
  measurementChange: 'שינוי מההתחלה:', // PLACEHOLDER (screen readers only)
  noMeasurements: 'עדיין אין היקפים. אפשר להוסיף אותם בעדכון מדידה.', // PLACEHOLDER
  // Photos
  compareSlider: 'השוואה בין התחלה להיום',
  compareStart: 'התחלה',
  compareNow: 'היום',
  compareChosen: 'נבחרה', // PLACEHOLDER — the "after" side when it is not the latest photo
  compareNeedsTwo: 'עוד תמונה אחת, ואפשר יהיה להשוות.', // PLACEHOLDER
  privacy: 'גלוי רק לך ולמאמנת שלך',
  allPhotos: 'כל התמונות',
  photoCount: plural({ one: 'תמונה אחת', two: '2 תמונות', other: '{count} תמונות' }),
  newPhoto: 'תמונה חדשה',
  editPhotos: 'עריכה', // PLACEHOLDER
  photoTile: '{kind}, {date}',
  startingPhoto: 'תמונת התחלה',
  pumpPhoto: 'Daily Pump',
  noPhotos: 'עדיין אין תמונות. הראשונה תהיה נקודת ההתחלה שלך.', // PLACEHOLDER
  photosLoadError: 'לא הצלחנו לטעון את התמונות.', // PLACEHOLDER
  // Achievements
  // Coach
  coachSubtitle: 'המאמנת שלך',
  // Settings
  languageShort: { he: 'עב', en: 'EN' },
  questionnaireTitle: 'השאלון שלי',
  questionnaireHint: 'התשובות שהמאמנת רואה',
  logoutConfirm: 'להתנתק מהחשבון?', // PLACEHOLDER
  cancel: 'ביטול',
  // The measurement sheet
  sheetTitle: 'עדכון מדידה',
  sheetHint: 'מספיק משקל. את ההיקפים אפשר לעדכן פעם בשבועיים.',
  sheetMeasurements: 'היקפים',
  sheetOptional: '(לא חובה)',
  weightInput: 'משקל ב{unit}', // PLACEHOLDER (screen readers only)
  measurementInput: '{name} ב{unit}', // PLACEHOLDER (screen readers only)
  stepUp: 'עוד {step} {unit}',
  stepDown: 'פחות {step} {unit}',
  save: 'שמירה',
  saved: 'המדידה נשמרה',
  weightRequired: 'צריך משקל כדי לשמור.', // PLACEHOLDER
  // The small Latin mono eyebrows (decoration, aria-hidden) — the same in both languages.
  eyebrow: {
    memberSince: 'MEMBER SINCE {month} · WK{week}',
    weight: 'WEIGHT · {unit}',
    measurements: 'MEASUREMENTS',
    progress: 'PROGRESS',
    achievements: 'ACHIEVEMENTS',
    settings: 'SETTINGS',
    week: 'W{week}',
    chartStart: 'START · W{week}',
    chartMonth: '4 WEEKS AGO',
    chartNow: 'NOW',
    version: 'SISTEM · V{version}',
  },
} as const;

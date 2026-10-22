import { plural } from '@sistem/shared';

// Profile + Settings (Phase 10). DRAFT Hebrew of the English placeholders (phase-15 report).
// The profile redesign (docs/design/trainee-profile.html): Hebrew from the design where it has it;
// lines the design doesn't have are PLACEHOLDER (marked) until the owner sends wording.
export const he = {
  noEntries: 'עדיין לא תועד דבר',
  settings: 'הגדרות',
  weightGoalLabel: 'המטרה שלי',
  settingsTitle: 'הגדרות',
  unitsTitle: 'יחידות',
  unitsHint: 'למשקל הגוף ולמידות שלך. האימונים נשארים בק״ג בינתיים.',
  weightUnit: 'משקל',
  lengthUnit: 'מידות',
  unitsSaveError: 'לא הצלחנו לשנות את היחידות. נסי שוב.',
  timezone: 'אזור זמן',
  account: 'חשבון',
  flexibleSchedule: ' · לו״ז גמיש',
  redoOnboarding: 'מילוי השאלון מחדש',
  editLabel: 'עריכת {title}',
  loadError: 'לא הצלחנו לטעון את הפרופיל שלך.',
  languageTitle: 'שפה',
  languageHint: 'האפליקציה וההודעות שתקבלי יוצגו בשפה הזו.',
  languageSaveError: 'לא הצלחנו לשנות את השפה. נסי שוב.',

  // ── The Profile screen (redesign) ──
  title: 'פרופיל',
  profileCard: 'הפרופיל שלי', // screen readers only
  trainsWith: 'מתאמנת אצל',
  // From the design (docs/design/trainee-profile.html).
  communities: 'הקהילות שלי',
  editProfile: 'עריכת פרופיל',
  avatarAdd: 'הוספת תמונת פרופיל',
  avatarChange: 'החלפת תמונת פרופיל',
  avatarUploading: 'שומרת את התמונה…', // PLACEHOLDER (screen readers only)
  scoreLabel: 'המספרים שלי', // PLACEHOLDER (screen readers only)
  scoreWorkouts: 'אימונים',
  scoreStreak: 'שבועות ברצף',
  scorePrs: 'שיאים',
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
  // The profile photo sheet
  photoSheet: {
    title: 'תמונת פרופיל',
    hint: 'התמונה מוצגת לך ולמאמנת שלך.', // PLACEHOLDER — the design also names communities, which don't exist yet
    camera: 'צילום תמונה',
    gallery: 'בחירה מהגלריה',
    remove: 'הסרת התמונה',
    cropTitle: 'התאמה',
    cropHint: 'גררי כדי למקם, והגדילי עם הסרגל.',
    cropArea: 'מיקום התמונה. אפשר לגרור או להזיז בחיצים.', // PLACEHOLDER (screen readers only)
    zoom: 'הגדלה',
    cancel: 'ביטול',
    save: 'שמירה',
    saved: 'תמונת הפרופיל עודכנה',
    removed: 'התמונה הוסרה',
    notImage: 'אפשר לבחור רק קובץ תמונה.', // PLACEHOLDER
    tooLarge: 'התמונה גדולה מדי. אפשר עד 10MB.', // PLACEHOLDER
    unreadable: 'לא הצלחנו לפתוח את התמונה. נסי תמונה אחרת.', // PLACEHOLDER
    saveError: 'לא הצלחנו לשמור את התמונה. נסי שוב.', // PLACEHOLDER
    removeError: 'לא הצלחנו להסיר את התמונה. נסי שוב.', // PLACEHOLDER
  },
  // "השאלון שלי" (direction B). Wording from the brief; marked lines are PLACEHOLDER.
  questionnaire: {
    intro: 'התשובות שלך, כפי שהמאמנת רואה אותן. אפשר לעדכן בכל זמן',
    notAnswered: 'לא ענית',
    add: 'הוספה',
    addLabel: 'הוספת {title}', // PLACEHOLDER (screen readers only)
    more: 'עוד',
    less: 'פחות', // PLACEHOLDER
    saved: 'התשובות עודכנו',
    saveError: 'לא הצלחנו לשמור את התשובות. נסי שוב.', // PLACEHOLDER
    emptyText: 'עוד לא מילאת את השאלון. לפי התשובות המאמנת בונה את התוכנית שלך.', // PLACEHOLDER
    fill: 'מילוי השאלון',
    age: 'גיל', // PLACEHOLDER
    dayUp: 'עוד יום', // PLACEHOLDER (screen readers only)
    dayDown: 'פחות יום', // PLACEHOLDER (screen readers only)
    daysPips: '{days} ימים בשבוע', // PLACEHOLDER (screen readers only)
  },
  // The small Latin mono eyebrows (decoration, aria-hidden) — the same in both languages.
  eyebrow: {
    since: 'SINCE {month}',
    weight: 'WEIGHT · {unit}',
    measurements: 'MEASUREMENTS',
    progress: 'PROGRESS',
    achievements: 'ACHIEVEMENTS',
    settings: 'SETTINGS',
    week: 'W{week}',
    chartStart: 'START · W{week}',
    chartMonth: '4 WEEKS AGO',
    chartNow: 'NOW',
    questionnaire: {
      basic_profile: 'BODY',
      goals: 'GOALS',
      frequency: 'SCHEDULE',
      activities: 'ACTIVITIES',
      exercise_preferences: 'EXERCISES',
      recovery: 'HEALTH',
      equipment: 'EQUIPMENT',
      nutrition_preferences: 'NUTRITION',
    },
    units: 'UNITS',
    language: 'LANGUAGE',
    account: 'ACCOUNT',
    version: 'SISTEM · V{version}',
  },
} as const;

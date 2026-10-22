import { plural } from '@sistem/shared';
// The dashboard's own texts that belong to no feature (top bar, login). Hebrew = primary;
// DRAFT translations for the owner's review (phase-15 report).
export const he = {
  // The sidebar (coach dashboard design). Pages keep their own existing names (trainees, the
  // exercise library, the nutrition pages); these are the group labels and the new entries.
  nav: {
    main: 'ראשי',
    trainees: 'מתאמנות',
    nutrition: 'תזונה',
    training: 'אימונים',
    overview: 'סקירה',
    stats: 'סטטיסטיקה',
    allTrainees: 'כל המתאמנות',
    waiting: 'מחכות לתוכנית',
  },
  shell: {
    collapse: 'כיווץ התפריט',
    expand: 'הרחבת התפריט',
    menu: 'תפריט',
    search: 'חיפוש',
    undo: 'ביטול',
    coach: 'מאמנת',
    // {count} is spoken after the item's name: "מחכות לתוכנית, 2".
    badge: '{label}, {count}',
  },
  // The ⌘K palette. `pickTrainee` and `empty` are PLACEHOLDERS (not in the design's wording list).
  palette: {
    placeholder: 'חיפוש מתאמנת, מסך או פעולה',
    pickTrainee: 'תוכנית חדשה — לאיזו מתאמנת?',
    empty: 'לא נמצא. נסי שם של מתאמנת או של מסך.',
    screens: 'מסכים',
    actions: 'פעולות',
  },
  email: 'אימייל',
  password: 'סיסמה',
  loggingIn: 'מתחברת…',
  // The login screen (coach login design update) — the owner's wording, except where marked.
  login: {
    badge: 'COACH',
    // Around the brand word "Sisterhood", which stays in English: "ה-Sisterhood שלך."
    headlineBefore: 'ה-',
    headlineAfter: ' שלך.',
    sub: 'ניהול מתאמנות, בניית תוכניות ומעקב אחרי ההתקדמות. הכל במקום אחד.',
    // The three captions are PLACEHOLDERS: the brief gave the titles only.
    features: {
      trainees: { title: 'מתאמנות', caption: 'כל המתאמנות שלך' },
      plans: { title: 'תוכניות', caption: 'תוכניות אימון שבועיות' },
      nutrition: { title: 'תזונה', caption: 'תוכניות תזונה' },
    },
    title: 'כניסת מאמנת',
    subtitle: 'התחברי כדי לנהל את המתאמנות שלך',
    forgot: 'שכחתי',
    rememberMe: 'השאירי אותי מחוברת',
    submit: 'כניסה לדשבורד',
    traineePrompt: 'מתאמנת?',
    traineeLink: 'הכניסה שלך באפליקציה',
  },
  coachOnly: 'הדשבורד הזה מיועד לחשבונות מאמנת בלבד.',
  loginFailed: 'ההתחברות נכשלה. נסי שוב.',
  languageSaveError: 'לא הצלחנו לשמור את השפה. נסי שוב.',
  // The publish modal (workout and nutrition plans): confirm, then a celebration. Wording from the approved design.
  publish: {
    title: 'לפרסם ל{name}?',
    textPlan: 'היא תקבל התראה ותראה את התוכנית מיד באפליקציה.',
    textNutrition: 'היא תקבל התראה ותראה את תוכנית התזונה מיד באפליקציה.',
    nutritionTitle: 'תוכנית תזונה · {kcal} ליום',
    workouts: plural({ one: 'אימון אחד', two: '2 אימונים', other: '{count} אימונים' }),
    meals: plural({ one: 'ארוחה אחת', two: '2 ארוחות', other: '{count} ארוחות' }),
    now: 'פרסום עכשיו',
    notYet: 'עוד לא',
    publishing: 'מפרסם…',
    failed: 'הפרסום לא הצליח. נסי שוב.',
    published: 'פורסם',
    doneTitlePlan: 'התוכנית בדרך ל{name}',
    doneTitleNutrition: 'תוכנית התזונה בדרך ל{name}',
    doneText: 'שלחנו לה התראה עכשיו. אפשר לעקוב אחרי הביצוע בפרופיל שלה.',
    great: 'מעולה',
    toProfile: 'לפרופיל של {name}',
  },
  // The one-time "set password" link a new coach opens (accounts). PLACEHOLDER drafts.
  setPassword: {
    title: 'בחירת סיסמה',
    subtitle: 'עוד רגע והחשבון שלך מוכן. בחרי סיסמה של 8 תווים לפחות.',
    password: 'סיסמה חדשה',
    confirm: 'אימות הסיסמה',
    submit: 'שמירה וכניסה',
    saving: 'שומרת…',
    mismatch: 'הסיסמאות לא זהות. אפשר להקליד שוב.',
    tooShort: 'הסיסמה קצרה מדי. צריך לפחות 8 תווים.',
    missingToken: 'הקישור חסר או לא שלם. אפשר לבקש קישור חדש ממנהלת המערכת.',
    failed: 'לא הצלחנו לשמור את הסיסמה. אפשר לנסות שוב.',
    toLogin: 'למסך הכניסה',
  },
} as const;

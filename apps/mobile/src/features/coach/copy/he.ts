// Coach mode on the phone (Phase 6b, redesigned from docs/design/coach-app.html): the light plan actions + the coach screens. Texts both apps show are in the shared
// copy (coach.*). DRAFT Hebrew of the English placeholders (phase-15 report).
import { plural } from '@sistem/shared';

export const he = {
  plansLoadError: 'לא הצלחנו לטעון את התוכניות.',
  publishError: 'לא הצלחנו לפרסם את התוכנית. נסי שוב.',
  copySavedNotPublished: 'העותק נשמר כטיוטה, אבל לא פורסם. {message}',
  publishPlan: 'פרסום התוכנית',
  noPlanThisWeek: 'עדיין אין תוכנית לשבוע הזה.',
  duplicateLastWeek: 'שכפול השבוע שעבר ופרסום',
  fixOnDashboard: 'תקני את זה בדשבורד, ואז פרסמי.',
  plansOnDashboard: 'בונים ועורכים תוכניות בדשבורד, במחשב.',
  confirmDuplicateTitle: 'לשכפל ולפרסם?',
  confirmPublishTitle: 'לפרסם את התוכנית הזו?',
  confirmDuplicateMessage: 'התוכנית האחרונה של {name} תועתק ל־{week} ותפורסם. המתאמנת תקבל התראה.',
  confirmPublishMessage: '{name} תראה את התוכנית של {week}. המתאמנת תקבל התראה.',
  duplicateConfirm: 'שכפול ופרסום',
  publishConfirm: 'פרסום',
  nutritionLoadError: 'לא הצלחנו לטעון את תוכנית התזונה.',
  // Owner's wording (docs/phase-reports/design-coach-link.md).
  openFullDashboard: 'פתחי את הדשבורד המלא',
  // ── Coach mode (docs/design/coach-app.html). Hebrew = the spec's wording; DRAFT = not in the spec. ──
  today: {
    // DRAFT: the spec shows the morning form only.
    greeting: {
      morning: 'בוקר טוב, {name}',
      noon: 'צהריים טובים, {name}',
      evening: 'ערב טוב, {name}',
      night: 'לילה טוב, {name}',
    },
    bell: 'התראות',
    bellUnread: plural({ one: 'התראות, אחת חדשה', two: 'התראות, 2 חדשות', other: 'התראות, {count} חדשות' }),
    invite: 'הזמנה',
    scoreboard: 'השבוע', // DRAFT (screen reader label)
    scoreTrained: 'התאמנו השבוע',
    scoreWaiting: 'מחכות לתוכנית',
    scoreAttention: 'דורשות תשומת לב',
    waitingTitle: 'מחכות לתוכנית',
    seeAll: 'הכול',
    waitingTag: 'ממתינה לתוכנית',
    joined: 'הצטרפה {time}',
    questionnaireDone: 'שאלון מולא',
    questionnaireNotDone: 'שאלון לא מולא',
    feedToday: 'היום',
    feedYesterday: 'אתמול',
    emptyFeed: 'עוד אין פעילות. הזמיני את המתאמנת הראשונה שלך',
    quietFeed: 'עוד אין פעילות.', // DRAFT: she has trainees, nothing happened yet
    loadError: 'לא הצלחנו לטעון את המסך. נסי שוב.', // DRAFT
    feedLoadError: 'לא הצלחנו לטעון את הפעילות.', // DRAFT
    loadMore: 'עוד פעילות', // DRAFT
    loadMoreError: 'לא הצלחנו לטעון עוד. נסי שוב.', // DRAFT
  },
  feed: {
    workout: '{name} סיימה את {title}',
    cardio: '{name} סיימה {title}',
    mealPhotos: plural({ one: '{name} העלתה תמונת ארוחה', two: '{name} העלתה 2 תמונות ארוחה', other: '{name} העלתה {count} תמונות ארוחה' }),
    progressPhotos: plural({ one: '{name} העלתה תמונת התקדמות', two: '{name} העלתה 2 תמונות התקדמות', other: '{name} העלתה {count} תמונות התקדמות' }), // DRAFT
    pumpPhoto: '{name} העלתה Daily Pump', // DRAFT
    measurements: '{name} עדכנה מדידות',
    joined: '{name} הצטרפה דרך הקישור שלך', // DRAFT (the spec has the "filled" form only)
    joinedDone: '{name} הצטרפה דרך הקישור שלך ומילאה שאלון',
    viewQuestionnaire: 'צפייה בשאלון',
    attentionNoWorkout: plural({ one: '{name} לא התאמנה כבר יום', two: '{name} לא התאמנה כבר יומיים', other: '{name} לא התאמנה כבר {count} ימים' }),
    attentionMissed: plural({ one: '{name} דילגה על אימון השבוע', two: '{name} דילגה על 2 אימונים השבוע', other: '{name} דילגה על {count} אימונים השבוע' }), // DRAFT
    lastWorkout: 'אימון אחרון: {date}',
    sets: plural({ one: 'סט אחד', two: '2 סטים', other: '{count} סטים' }),
    setsOf: '{done}/{total} סטים',
    minutes: '{count} דק׳',
    rating: 'קושי {rating}/5',
    rounds: '{done}/{total} סבבים',
    distance: '{km} ק״מ',
    kg: '{value} ק״ג',
    reps: plural({ one: 'חזרה אחת', two: '2 חזרות', other: '{count} חזרות' }),
    record: 'שיא: {name} {value}',
    freeWorkout: 'אימון חופשי', // DRAFT
    photosPrivate: 'תמונות פרטיות — נפתחות במסך המתאמנת', // DRAFT (screen reader text for the blurred photos)
    types: {
      workout: 'אימון',
      cardio: 'אירובי',
      photo: 'תמונה',
      measurements: 'מדידות',
      joined: 'הצטרפות',
    }, // DRAFT (screen reader names of the type badges)
  },
  list: {
    searchPlaceholder: 'חיפוש מתאמנת',
    filterLabel: 'סינון',
    filters: { all: 'הכול', waiting: 'מחכות', active: 'פעילות', attention: 'תשומת לב' },
    tags: { active: 'פעילה', waiting: 'מחכה', attention: 'תשומת לב' },
    weekLine: 'שבוע {week} · {done}/{planned} אימונים',
    planLine: '{done}/{planned} אימונים', // DRAFT: before her first coaching week starts
    noPlanThisWeek: 'אין תוכנית השבוע', // DRAFT
    noWorkoutDays: plural({ one: 'לא התאמנה יום', two: 'לא התאמנה יומיים', other: 'לא התאמנה {count} ימים' }),
    missedWorkouts: plural({ one: 'דילגה על אימון', two: 'דילגה על 2 אימונים', other: 'דילגה על {count} אימונים' }),
    noMatch: 'לא נמצאו מתאמנות',
    weekProgress: '{done} מתוך {planned} אימונים השבוע', // DRAFT (screen reader text for the pips)
  },
  detail: {
    back: 'חזרה',
    since: 'בליווי מאז {date}',
    perWeek: plural({ one: 'אימון אחד בשבוע', two: '2 אימונים בשבוע', other: '{count} אימונים בשבוע' }),
    actionsLabel: 'פעולות', // DRAFT
    actions: { message: 'הודעה', plan: 'תוכנית', nutrition: 'תזונה' },
    tabsLabel: 'אזורים',
    tabs: { overview: 'סקירה', workouts: 'אימונים', nutrition: 'תזונה', body: 'גוף' },
    thisWeek: 'השבוע',
    lastWorkouts: 'אימונים אחרונים',
    all: 'הכול',
    todayPortions: 'מנות היום',
    dayPortions: 'מנות', // DRAFT: another day picked
    body: 'גוף',
    workoutLog: 'יומן אימונים',
    moreWorkouts: 'עוד אימונים', // DRAFT
    cardioLog: 'ריצות ואירובי', // DRAFT
    rating: 'קושי',
    lane: { done: 'בוצע', planned: 'מתוכנן', missed: 'פוספס', rest: 'מנוחה', today: 'היום' }, // DRAFT (screen reader)
    noPlanThisWeek: 'אין תוכנית השבוע', // DRAFT
    noWorkouts: 'עוד אין אימונים.', // DRAFT
    noPortions: 'אין תוכנית תזונה ליום הזה.', // DRAFT
    noMeasurements: 'עוד אין מדידות.', // DRAFT
    noPhotos: 'אין תמונות.', // DRAFT
    deskWorkouts: 'בניית תוכנית חדשה או שבוע מאפס נעשית בדשבורד. כאן אפשר להזיז, להחליף ולשכפל.',
    openInDashboard: 'נפתח בדשבורד',
    mealPhotos: 'תמונות ארוחה',
    mealPhotosToday: 'תמונות ארוחה · היום',
    lock: 'פרטי · רק את והיא',
    measurements: 'מדידות',
    progressPhotos: 'תמונות התקדמות',
    questionnaire: 'שאלון',
    open: 'פתיחה',
    close: 'סגירה',
    questionnaireGoals: 'מטרות: {goals}',
    questionnaireDays: '{days} ימים בשבוע',
    loadError: 'לא הצלחנו לטעון את הנתונים.', // DRAFT
    pickDay: 'בחירת יום', // DRAFT (screen reader)
    weight: 'ק״ג',
  },
  profile: {
    myLink: 'הקישור שלי',
    copy: 'העתקה',
    copied: 'הקישור הועתק',
    copyFailed: 'לא הצלחנו להעתיק. אפשר לסמן את הקישור ולהעתיק ידנית.', // DRAFT
    qr: 'QR',
    linkError: 'לא הצלחנו לטעון את הקישור.', // DRAFT
    payments: 'תשלומים',
    paymentsText: 'PayBox ו-Bit מוצגים למתאמנות שלך בכרטיס המאמנת.',
    paymentsSet: '{methods} מוגדרים', // DRAFT
    paymentsNone: 'עוד לא הוגדרו פרטי תשלום.', // DRAFT
    edit: 'עריכה',
    desk: 'בניית תוכניות, תפריטים וספריות נעשית בדשבורד במחשב. כאן עוקבים ומגיבים.',
    modeTitle: 'מצב', // DRAFT
    modeCoach: 'מצב מאמנת',
    modeTrainee: 'מצב מתאמנת',
    modeError: 'לא הצלחנו להחליף מצב. נסי שוב.', // DRAFT
    settings: 'הגדרות',
  },
} as const;

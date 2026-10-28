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
    filters: { all: 'הכול', waiting: 'מחכות', active: 'פעילות', attention: 'תשומת לב', archive: 'ארכיון' },
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
  // ── Phase B (all PLACEHOLDER unless the spec has the line: spec lines are marked SPEC). ──
  reactions: {
    label: 'תגובה', // PLACEHOLDER (screen reader: the group)
    names: { clap: 'מחיאות כפיים', fire: 'אש', heart: 'לב' }, // PLACEHOLDER (screen reader)
    error: 'לא הצלחנו לשמור את התגובה. נסי שוב.', // PLACEHOLDER
  },
  messages: {
    title: 'הודעות', // SPEC
    message: 'הודעה', // SPEC
    sendMessage: 'שליחת הודעה', // SPEC
    empty: 'עוד אין הודעות. אפשר לכתוב למתאמנת מהמסך שלה או מהפיד.', // PLACEHOLDER
    loadError: 'לא הצלחנו לטעון את ההודעות.', // PLACEHOLDER
    unread: 'לא נקרא', // SPEC (screen reader)
    youPrefix: 'את: {text}', // PLACEHOLDER
    unreadBadge: plural({ one: 'הודעה אחת חדשה', two: '2 הודעות חדשות', other: '{count} הודעות חדשות' }), // PLACEHOLDER (screen reader)
    quickTitle: 'הודעה', // SPEC
    templatesLabel: 'הודעות מוכנות', // PLACEHOLDER (screen reader)
    templates: ['כל הכבוד על האימון! 💪', 'מה שלומך? לא ראיתי אימון כמה ימים', 'שבוע חדש מוכן באפליקציה', 'זכרי לעדכן מדידות'], // SPEC, PLACEHOLDER for the owner
    cancel: 'ביטול', // SPEC
    send: 'שליחה', // SPEC
    sent: 'ההודעה נשלחה', // SPEC
    openThread: 'לכל השיחה', // PLACEHOLDER
  },
  invite: {
    title: 'הזמנת מתאמנת', // SPEC
    text: 'מתאמנת שנרשמת דרך הקישור או ה-QR מצטרפת אלייך אוטומטית, ממלאת שאלון ומחכה לתוכנית.', // SPEC
    qrLabel: 'קוד QR להצטרפות', // SPEC (screen reader)
    linkLabel: 'הקישור שלך', // PLACEHOLDER (screen reader)
    personalLabel: 'קישור אישי לשימוש אחד', // PLACEHOLDER (screen reader)
    copy: 'העתקה', // SPEC
    copied: 'הקישור הועתק', // PLACEHOLDER
    copyFailed: 'לא הצלחנו להעתיק. אפשר לסמן את הקישור ולהעתיק ידנית.', // PLACEHOLDER
    share: 'שיתוף', // SPEC
    shareTitle: 'הצטרפות ל-Sistem', // PLACEHOLDER (the share sheet title)
    personal: 'קישור אישי', // SPEC
    personalReady: 'קישור אישי נוצר · לשימוש אחד, 14 ימים', // PLACEHOLDER
    personalError: 'לא הצלחנו ליצור קישור אישי. נסי שוב.', // PLACEHOLDER
    loadError: 'לא הצלחנו לטעון את הקישור.', // PLACEHOLDER
  },
  edit: {
    title: 'עריכה קלה', // SPEC
    open: 'עריכה קלה', // SPEC
    workoutsLabel: 'האימון לעריכה', // PLACEHOLDER (screen reader)
    noDay: 'בלי יום', // PLACEHOLDER
    noPlan: 'אין תוכנית לשבוע הזה. בונים אותה בדשבורד.', // PLACEHOLDER
    move: 'הזזה ליום אחר', // SPEC
    moveHint: 'האימון עובר, השאר לא משתנה', // SPEC
    swap: 'החלפת תרגיל', // SPEC
    swapHint: 'מתוך הספרייה שלך, לפי אותו שריר', // SPEC
    duplicate: 'שכפול השבוע לשבוע הבא', // SPEC
    duplicateHint: 'טיוטה, תפרסמי כשמוכן', // SPEC
    desk: 'בנייה מאפס', // SPEC
    deskHint: 'נפתח בדשבורד במחשב', // SPEC
    doneHint: 'האימון בוצע, אפשר רק לצפות', // PLACEHOLDER
    moveTitle: 'לאיזה יום?', // SPEC
    moveCurrent: '{title} · כרגע ביום {day}', // SPEC
    moveNoDay: '{title} · בלי יום קבוע', // PLACEHOLDER
    daysLabel: 'ימי השבוע', // PLACEHOLDER (screen reader)
    moveSave: 'שמירה ועדכון אצלה', // SPEC
    moved: 'האימון הוזז · {name} תראה את השינוי', // SPEC (adapted: the server tells her by the tab dot)
    swapTitle: 'איזה תרגיל להחליף?', // PLACEHOLDER
    swapWithTitle: 'במה להחליף את {name}?', // PLACEHOLDER
    swapKeeps: 'הסטים, החזרות והמשקלים נשארים.', // PLACEHOLDER
    swapFamily: 'אותו תרגיל, ציוד אחר', // PLACEHOLDER
    swapPattern: 'אותה תנועה', // PLACEHOLDER
    swapNone: 'לא נמצאו תרגילים חלופיים בספרייה.', // PLACEHOLDER
    swapLoadError: 'לא הצלחנו לטעון תרגילים. נסי שוב.', // PLACEHOLDER
    swapped: 'התרגיל הוחלף', // PLACEHOLDER
    duplicated: 'השבוע הבא נוצר כטיוטה', // SPEC (adapted: "שבוע 7 נוצר כטיוטה")
    nextTaken: 'לשבוע הבא כבר יש תוכנית.', // PLACEHOLDER
    undo: 'ביטול', // PLACEHOLDER
    undone: 'השינוי בוטל', // PLACEHOLDER
    error: 'לא הצלחנו לשמור. נסי שוב.', // PLACEHOLDER
    back: 'חזרה', // PLACEHOLDER
    cancel: 'ביטול', // SPEC
  },
} as const;

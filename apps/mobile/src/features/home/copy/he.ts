// Her Home (direction B, docs/design/trainee-home-b.html). The wording comes from the owner's design;
// the rest is PLACEHOLDER copy — the owner sends the final text. DRAFT Hebrew (phase-15 report).
export const he = {
  greeting: 'בוקר טוב, {firstName}',
  nextWorkout: 'האימון הבא',
  todayWorkout: 'האימון של היום',
  resumeWorkout: 'המשך אימון · {title}',
  noPlanThisWeek: 'עדיין אין תוכנית לשבוע הזה.',
  noWorkoutsInPlan: 'אין אימונים בתוכנית הזו.',
  allDone: 'כל האימונים של השבוע הושלמו.',
  intervalTimer: 'טיימר אינטרוולים',
  loading: 'טוען…',
  loadError: 'לא הצלחנו לטעון את השבוע שלך.',
  dismissStartingPhotoReminder: 'סגירת התזכורת לתמונת התחלה',
  stage: {
    objectToday: 'היום:',
    objects: {
      kettlebell: 'קטלבל',
      dumbbell: 'משקולת',
      weightPlate: 'פלטה',
      medicineBall: 'כדור כוח',
      jumpRope: 'חבל קפיצה',
      shakerBottle: 'שייקר',
      stopwatch: 'סטופר',
    },
    facts: 'פרטי האימון',
    exercises: 'תרגילים',
    thisWeek: 'השבוע',
    slideToStart: 'החליקי להתחלת אימון',
    workoutStarted: 'האימון התחיל',
    restDay: 'יום מנוחה',
  },
  photo: {
    title: 'תמונת התחלה',
    subtitle: 'כדי לראות את השינוי שלך',
    take: 'צילום',
  },
  week: {
    title: 'השבוע · {range}',
    openPlan: 'התוכנית',
    days: 'ימי השבוע',
    done: '✓ בוצע',
    today: 'היום · {exercises}',
    planned: 'מתוכנן · {exercises}',
    rest: 'יום מנוחה · התאוששות',
  },
  score: {
    title: 'המספרים שלך',
    workoutsThisWeek: 'אימונים השבוע',
    weeksInRow: 'שבועות ברצף',
  },
  coach: {
    title: 'מהמאמנת',
    planReady: 'שבוע {range} מוכן',
    more: 'עוד',
    // PLACEHOLDER — the owner sends the final text (less / sent / failed).
    less: 'פחות',
    thanks: '👍 תודה!',
    thanksSent: '✓ נשלח',
    thanksFailed: 'לא נשלח. נסי שוב',
  },
  achievement: {
    title: 'ההישג הבא',
    all: 'כל ההישגים',
    others: 'הישגים קרובים',
  },
  fuel: {
    title: 'תזונה היום',
    logMeal: 'סימון ארוחה',
  },
  // Self-guided / joined later — PLACEHOLDER drafts.
  selfGuided: {
    line: 'היום הוא יום טוב להתאמן.',
    waitingLine: '{coach} בונה לך תוכנית. בינתיים אפשר להתאמן לבד.',
    waitingNoName: 'המאמנת שלך בונה לך תוכנית. בינתיים אפשר להתאמן לבד.',
    action: 'אימון חופשי',
    joined: 'הצטרפת לליווי של {coach}',
  },
  joinCoach: {
    label: 'הצטרפות למאמנת',
    text: 'יש לך מאמנת? הכניסי קוד',
    dismiss: 'הסתרה',
  },
  // Her coach ended the coaching (owner's wording for the line).
  coachingEnded: {
    label: 'הליווי הסתיים', // DRAFT
    text: '{coach} סיימה את הליווי',
    dismiss: 'הסתרה',
  },
} as const;

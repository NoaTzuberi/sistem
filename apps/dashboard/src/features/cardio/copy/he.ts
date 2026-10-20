// The coach's cardio builder (docs/design/coach-cardio-builder.html — the design's wording).
// Lines marked DRAFT are not in the design (edit mode, delete); the owner reviews them.
export const he = {
  newTitle: 'אימון קרדיו חדש',
  editTitle: 'אימון קרדיו', // DRAFT
  subtitle: 'יתווסף לתוכנית האימונים שלה, שבוע {week}',
  back: 'חזרה לתוכנית',
  saveDraft: 'שמירה כטיוטה',
  addToPlan: 'הוספה לתוכנית',
  saving: 'שומר…', // DRAFT
  more: 'עוד פעולות', // DRAFT
  remove: 'מחיקת האימון', // DRAFT
  removeConfirm: 'למחוק את אימון הקרדיו? היא לא תראה אותו יותר.', // DRAFT
  nameLabel: 'שם האימון',
  namePlaceholder: 'למשל: ריצה קלה 30 דקות',
  sportLabel: 'סוג',
  metricLabel: 'איך מודדים עצימות',
  metricGroup: 'מדד',
  total: 'זמן כולל',
  high: 'בעצימות גבוהה',
  rounds: 'סבבים',
  graphLabel: 'גרף עצימות לאורך האימון',
  structure: 'מבנה האימון',
  structureHint: 'לחיצה על שם הקטע או על עמודה בגרף פותחת אותו',
  add: { warmup: 'חימום', steady: 'קטע', repeat: 'סט חוזר', cooldown: 'שחרור' },
  lessTime: 'פחות זמן',
  moreTime: 'יותר זמן',
  minutes: 'דקות',
  lessIntensity: 'פחות עצימות',
  moreIntensity: 'יותר עצימות',
  deleteBlock: 'מחיקת הקטע',
  deleteRepeat: 'מחיקת הסט החוזר', // DRAFT
  repeatTitle: 'סט חוזר',
  lessRounds: 'פחות סבבים',
  moreRounds: 'עוד סבבים',
  perRound: '{round} לסבב · {total} סה״כ',
  kindLabel: 'סוג הקטע', // DRAFT (screen readers)
  daysTitle: 'באילו ימים',
  strength: 'כוח',
  daysHint: 'בימים המסומנים בסגול כבר יש לה אימון כוח. אפשר לשלב, הריצה תופיע כאימון נוסף באותו יום.',
  weekly: 'חוזר כל שבוע עד סוף התוכנית',
  noteTitle: 'הערה אליה',
  notePlaceholder: 'למשל: בקטעים המהירים רוצה שתרגישי שקשה לדבר. אם יש סחרחורת, עוברים להליכה.',
  previewTitle: 'כך היא תראה את זה',
  previewFallback: 'אימון קרדיו',
  toastDraft: 'נשמר כטיוטה',
  toastAdded: 'האימון נוסף לתוכנית של {name}',
  loadError: 'לא הצלחנו לטעון את אימון הקרדיו.', // DRAFT
  saveError: 'השמירה לא הצליחה. נסי שוב.', // DRAFT
  defaultNames: { run: 'ריצה רציפה 35 דקות', intervals: 'אינטרוולים 1:1', walk: 'הליכה מהירה 40 דקות', bike: 'אופניים 2:2' },
  // The plan builder's "+ workout" menu.
  menuStrength: 'אימון כוח', // DRAFT
  menuCardio: 'אימון קרדיו',
  draftTag: 'טיוטה',
};

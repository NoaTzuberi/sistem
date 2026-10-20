import { plural } from '@sistem/shared';

// Trainee cardio (docs/design/trainee-cardio.html — the design's wording). DRAFT = not in the design.
export const he = {
  back: 'חזרה',
  loading: 'טוען…',
  loadError: 'לא הצלחנו לטעון את האימון.', // DRAFT
  total: 'זמן כולל',
  rounds: 'סבבים',
  high: 'בעצימות גבוהה',
  time: 'זמן',
  eyebrowSteps: 'STEPS',
  eyebrowCardio: 'CARDIO', // mono eyebrow, the same in both languages
  steps: 'מבנה האימון',
  roundsBox: plural({ one: '× סבב אחד', two: '× 2 סבבים', other: '× {count} סבבים' }),
  voice: 'הנחיות קוליות',
  voiceHint: '"עוד 10 שניות", "עבודה!", "התאוששות"',
  vibrate: 'רטט במעבר קטע',
  slide: 'החליקי להתחלת הריצה',
  done: 'בוצע', // DRAFT — the done mark on the detail
  viewOnly: 'אפשר להתחיל רק אימון של השבוע הזה.', // DRAFT
  // Live
  endEarly: 'סיום האימון',
  previous: 'לקטע הקודם',
  next: 'לקטע הבא',
  pause: 'השהיה',
  resume: 'המשך',
  upNext: 'הבא',
  lastBlock: 'זה הקטע האחרון',
  almostThere: 'כמעט שם',
  elapsed: 'עבר',
  remaining: 'נשאר',
  effortLine: 'מאמץ',
  tenSeconds: 'עוד 10 שניות',
  workCue: '{name}!',
  blockAnnounce: '{name} · {time}', // the polite screen-reader line when a block starts
  // Finish
  closedRounds: 'סגרת {count} סבבים',
  didRounds: 'עשית {done} מתוך {total} סבבים',
  distanceQuestion: 'כמה קילומטר יצא?',
  optional: '(לא חובה)',
  km: 'ק״מ',
  moreDistance: 'עוד 100 מטר',
  lessDistance: 'פחות 100 מטר',
  rpeQuestion: 'כמה היה קשה?',
  rpeLabel: 'קושי {value} מתוך 10',
  rpeEasy: 'קליל',
  rpeMax: 'מקסימום',
  noteQuestion: 'משהו ל{name}?',
  noteQuestionNoCoach: 'משהו למאמנת?', // DRAFT — no coach name
  notePlaceholder: 'למשל: בסבב 6 הייתי צריכה ללכת',
  save: 'שמירה ושליחה ל{name}',
  saveNoCoach: 'שמירה ושליחה', // DRAFT
  saved: 'נשמר ונשלח ל{name}',
  savedNoCoach: 'נשמר', // DRAFT
  saveError: 'השמירה לא הצליחה. נסי שוב.', // DRAFT
};

// Messages between a coach and her trainee (coach mode Phase B) — both sides — and the coach's
// reactions as the trainee sees them. PLACEHOLDER unless marked SPEC (docs/design/coach-app.html).
export const he = {
  title: 'הודעות', // SPEC
  back: 'חזרה', // PLACEHOLDER
  threadLabel: 'שיחה', // PLACEHOLDER (screen reader)
  placeholder: 'כתבי הודעה…', // SPEC
  inputLabel: 'הודעה', // SPEC (screen reader)
  send: 'שליחה', // SPEC
  sendError: 'ההודעה לא נשלחה. נסי שוב.', // PLACEHOLDER
  loadError: 'לא הצלחנו לטעון את ההודעות.', // PLACEHOLDER
  older: 'הודעות קודמות', // PLACEHOLDER
  empty: 'עוד אין הודעות. אפשר לכתוב כאן.', // PLACEHOLDER
  read: 'נקראה', // PLACEHOLDER
  noCoach: 'אין לך מאמנת כרגע, אז אין למי לכתוב.', // PLACEHOLDER
  mine: 'את', // PLACEHOLDER (screen reader: who wrote a bubble)
  // Trainee Home: the coach note area.
  reply: 'תשובה', // PLACEHOLDER
  openThread: 'להודעות', // PLACEHOLDER
  reactionOn: {
    workout: '{coach} הגיבה {emoji} על {title}', // SPEC ("שקד הגיבה 🔥 על Full Body B")
    pump: '{coach} הגיבה {emoji} על ה-Daily Pump', // PLACEHOLDER
    meal: '{coach} הגיבה {emoji} על תמונות הארוחה', // PLACEHOLDER
    progress: '{coach} הגיבה {emoji} על תמונות ההתקדמות', // PLACEHOLDER
  },
  reactionOnLog: '{coach} הגיבה {emoji}', // PLACEHOLDER (a workout log page)
} as const;

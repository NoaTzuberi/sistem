// First run ("how do you want to train" → coach code → coach confirm), the join banner and the
// questionnaire's intro line, and joining a coach later from the Profile. The design's wording
// (docs/design/trainee-first-run.html) where it has it; every other line is a PLACEHOLDER draft.
// Feminine to the trainee; buttons are verbs.
export const he = {
  stepsLabel: 'שלב {step} מתוך {total}',
  back: 'חזרה',
  choice: {
    title: 'איך תרצי להתאמן?',
    sub: 'אפשר לשנות את זה בכל שלב מהפרופיל.',
    coachTitle: 'עם מאמנת',
    coachBody: 'קיבלת קוד או קישור מהמאמנת שלך. היא תבנה לך תוכנית אישית.',
    soloTitle: 'לבד, בקצב שלי',
    soloBody: 'אימונים, ריצה ותזונה בלי מאמנת. אפשר להצטרף למאמנת בכל שלב.',
    soloFailed: 'לא הצלחנו לשמור את הבחירה. אפשר לנסות שוב.', // PLACEHOLDER
  },
  code: {
    title: 'הקוד של המאמנת',
    sub: '6 תווים. אפשר גם להדביק את הקישור שקיבלת.',
    groupLabel: 'קוד מאמנת',
    charLabel: 'תו {n} מתוך 6',
    pasteLink: 'הדבקת קישור',
    pasteHint: 'הקישור שהמאמנת שלחה לך', // PLACEHOLDER (the design shows a link address)
    pasteEmpty: 'לא מצאנו קוד במה שהועתק. אפשר להקליד אותו כאן.', // PLACEHOLDER
    continue: 'המשך',
    checking: 'בודקת…', // PLACEHOLDER
    invalid: 'הקוד לא תקין או שפג תוקפו. בדקי עם המאמנת שלך.',
    notTrainee: 'הקוד מיועד למתאמנות, והחשבון הזה הוא של מאמנת.', // PLACEHOLDER
    failed: 'לא הצלחנו לבדוק את הקוד. בדקי את החיבור ונסי שוב.', // PLACEHOLDER
    noCode: 'אין לי עדיין קוד',
    noCodeNote: 'אפשר להצטרף למאמנת מאוחר יותר, מהפרופיל.', // PLACEHOLDER
  },
  confirm: {
    title: 'זאת המאמנת שלך?',
    access: '{coach} תראה את התשובות שלך בשאלון, את המדידות, את האימונים שתתעדי ואת התמונות שתעלי. אף אחד אחר לא.', // PLACEHOLDER (matches the access rules)
    yes: 'כן, זאת היא',
    no: 'לא, להכניס קוד אחר',
    joining: 'מצטרפת…', // PLACEHOLDER
    failed: 'לא הצלחנו לצרף אותך. אפשר לנסות שוב.', // PLACEHOLDER
    alreadyHers: 'את כבר בליווי של {coach}.',
    otherCoach: 'את כבר בליווי של {coach}. כרגע אפשר להיות בליווי של מאמנת אחת.', // PLACEHOLDER
    loading: 'טוענת את פרטי המאמנת…', // PLACEHOLDER
  },
  banner: 'מצטרפת לליווי של {coach}',
  intro: {
    coach: '{coach} תשתמש בתשובות כדי לבנות לך תוכנית.',
    coachNoName: 'המאמנת שלך תשתמש בתשובות כדי לבנות לך תוכנית.', // PLACEHOLDER
    self: 'נשתמש בתשובות כדי להתאים לך את האפליקציה.',
  },
  later: {
    joined: 'הצטרפת לליווי של {coach}', // PLACEHOLDER toast on Home
  },
};

// The coach's first-visit dashboard tour. DRAFT — every line waits for the owner's wording.
export const he = {
  steps: {
    trainees: {
      title: 'המתאמנות שלך',
      body: 'כאן כל המתאמנות: מי מחכה לתוכנית, מי פעילה ומי צריכה תשומת לב.',
    },
    invite: {
      title: 'ככה מצטרפים',
      body: 'שלחי למתאמנת את הקישור או את הקוד בן 6 התווים. היא מזינה אותו באפליקציה ומצטרפת אלייך.',
    },
    planBuilder: {
      title: 'בניית תוכנית',
      body: 'התבנית היא רק הצעה: אפשר להוסיף, להסיר ולשנות הכול. תני שם לכל אימון, והמתאמנת תראה אותו.',
    },
    nutrition: {
      title: 'תזונה',
      body: 'בונים תוכנית במנות או בתפריט מלא. מאגר המזונות כבר מוכן, ואפשר להוסיף ולערוך.',
    },
    settings: {
      title: 'הודעות ותשלום',
      body: 'בהגדרות שומרים הודעות ברירת מחדל לשליחת תוכניות, וקישורי PayBox ו-Bit למתאמנות.',
    },
    activity: {
      title: 'מה קורה עכשיו',
      body: 'כאן מופיעים אימונים שהסתיימו, תמונות ועדכונים מהמתאמנות. ההתראות מחכות בפעמון.',
    },
  },
  next: 'הבא',
  finish: 'סיום',
  skip: 'דילוג',
  /** Screen readers: where she is in the tour. */
  progress: 'שלב {step} מתוך {total}',
  dialogLabel: 'סיור במערכת',
  /** After the last step's "סיום". Owner's wording (2026-11-08), DRAFT. */
  finishedToast: 'זהו! המדריך תמיד מחכה לך בהגדרות ← עזרה',
  // The welcome before the tour (first visit only). Owner's wording (2026-11-08), DRAFT.
  welcome: {
    title: 'היי {name}, ברוכה הבאה!',
    titleNoName: 'היי, ברוכה הבאה!',
    intro: 'איזה כיף שאת איתנו. כאן תנהלי את המתאמנות שלך, תבני תוכניות אימון ותזונה ותעקבי אחרי ההתקדמות שלהן.',
    offer: 'רוצה סיור קצר בדשבורד? זה לוקח בערך דקה.',
    start: 'בואי נתחיל בסיור',
    later: 'אולי אחר כך',
    note: 'אפשר תמיד לחזור למדריך מתוך הגדרות ← עזרה',
    close: 'סגירה',
  },
  // Settings → עזרה (owner 2026-11-08, DRAFT): the tour again, from its first step.
  helpTitle: 'עזרה',
  guideRow: 'מדריך לדשבורד',
};

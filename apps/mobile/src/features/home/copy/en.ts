import type { CopyShape } from '@sistem/shared';
import type { he } from './he';

export const en: CopyShape<typeof he> = {
  greeting: 'Good morning, {firstName}',
  nextWorkout: 'Next workout',
  todayWorkout: "Today's workout",
  resumeWorkout: 'Resume workout · {title}',
  noPlanThisWeek: 'No plan for this week yet.',
  noWorkoutsInPlan: 'No workouts in this plan.',
  allDone: "All of this week's workouts are done.",
  intervalTimer: 'Interval timer',
  loading: 'Loading…',
  loadError: "Couldn't load your week.",
  dismissStartingPhotoReminder: 'Dismiss starting photo reminder',
  stage: {
    objectToday: 'Today:',
    objects: {
      kettlebell: 'Kettlebell',
      dumbbell: 'Dumbbell',
      weightPlate: 'Weight plate',
      medicineBall: 'Medicine ball',
      jumpRope: 'Jump rope',
      shakerBottle: 'Shaker bottle',
      stopwatch: 'Stopwatch',
    },
    facts: 'Workout details',
    exercises: 'exercises',
    thisWeek: 'this week',
    slideToStart: 'Slide to start workout',
    workoutStarted: 'Workout started',
    restDay: 'Rest day',
  },
  photo: {
    title: 'Starting photo',
    subtitle: 'To see your change',
    take: 'Take photo',
  },
  week: {
    title: 'This week · {range}',
    openPlan: 'Plan',
    days: 'Days of the week',
    done: '✓ Done',
    today: 'Today · {exercises}',
    planned: 'Planned · {exercises}',
    rest: 'Rest day · Recovery',
  },
  score: {
    title: 'Your numbers',
    workoutsThisWeek: 'Workouts this week',
    weeksInRow: 'Weeks in a row',
  },
  coach: {
    title: 'From your coach',
    planReady: 'Week {range} is ready',
    more: 'More',
    // PLACEHOLDER — the owner sends the final text (less / sent / failed).
    less: 'Less',
    thanks: '👍 Thanks!',
    thanksSent: '✓ Sent',
    thanksFailed: 'Not sent. Try again',
  },
  achievement: {
    title: 'Next achievement',
    all: 'All achievements',
    others: 'Close achievements',
  },
  fuel: {
    title: 'Nutrition today',
    logMeal: 'Log a meal',
  },
  selfGuided: {
    line: 'Today is a good day to train.',
    waitingLine: '{coach} is building your plan. Meanwhile, you can train on your own.',
    waitingNoName: 'Your coach is building your plan. Meanwhile, you can train on your own.',
    action: 'Free workout',
    joined: "You joined {coach}'s coaching",
  },
  joinCoach: {
    label: 'Join a coach',
    text: 'Have a coach? Enter a code',
    dismiss: 'Hide',
  },
  coachingEnded: {
    label: 'Coaching ended',
    text: '{coach} ended the coaching',
    dismiss: 'Hide',
  },
};

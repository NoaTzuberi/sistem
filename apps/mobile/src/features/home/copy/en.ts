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
    dragToRotate: 'Drag to rotate',
    facts: 'Workout details',
    exercises: 'exercises',
    thisWeek: 'this week',
    slideToStart: 'Slide to start workout',
    startWorkout: 'Start workout',
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
    planned: 'Planned',
    rest: 'Rest day · Recovery',
  },
  score: {
    title: 'Your numbers',
    workoutsThisWeek: 'Workouts this week',
    weeksInRow: 'Weeks in a row',
    totalVolume: 'Total volume',
    tonnes: 't',
  },
  coach: {
    title: 'From your coach',
    planReady: 'Week {range} is ready',
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
};

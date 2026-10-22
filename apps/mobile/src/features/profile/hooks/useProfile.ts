import { useEffect, useMemo, useState } from 'react';
import { todayInTimezone } from '@sistem/shared';
import { useAuth } from '../../../services/auth/AuthContext';
import { getWeek } from '../../../services/plans/plansService';
import { useMyAchievements } from '../../achievements/hooks/useMyAchievements';
import { initialsOf, memberWeek } from '../data/profileDisplay';

/**
 * Who she is and her numbers, from existing endpoints only: her account (name, join date, time zone),
 * her coach's name (GET /plans/week, as Home) and /achievements (workouts, streak, PRs, badges).
 * Anything that doesn't load is null and its part of the screen is not drawn.
 */
export function useProfile() {
  const { user } = useAuth();
  const achievements = useMyAchievements();
  const [coachName, setCoachName] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    getWeek()
      .then((week) => {
        if (isCurrent) setCoachName(week.coach?.name ?? null);
      })
      .catch(() => {
        // No coach line (the chip and the coach card are hidden).
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const timezone = user?.timezone ?? 'UTC';
  const today = todayInTimezone(timezone);
  const joinDate = useMemo(() => (user ? todayInTimezone(timezone, new Date(user.createdAt)) : null), [user, timezone]);

  return {
    user,
    name: user?.name ?? '',
    initials: initialsOf(user?.name),
    today,
    joinDate,
    /** Her week of membership today (WK06). */
    week: joinDate ? memberWeek(joinDate, today) : null,
    coach: coachName ? { name: coachName, initials: initialsOf(coachName) } : null,
    overview: achievements.data ?? null,
    achievementsError: achievements.error,
    reloadAchievements: achievements.reload,
  };
}

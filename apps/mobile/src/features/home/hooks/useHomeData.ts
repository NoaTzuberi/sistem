import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppNotification, CoachNoteId, MealLogDay, TraineeNutritionPlanResponse } from '@sistem/types';
import { useCopy, useLoad } from '@sistem/shared';
import { useAuth } from '../../../services/auth/AuthContext';
import { getWeek } from '../../../services/plans/plansService';
import { getMealLogs, getNutritionPlan } from '../../../services/nutrition/nutritionService';
import { listNotifications, markRead } from '../../../services/notifications/notificationsService';
import { refreshUnreadCount } from '../../notifications/unreadCount';
import { useMyAchievements } from '../../achievements/hooks/useMyAchievements';
import { celebrate } from '../../achievements/celebration';
import { useStartingPhotoReminder } from './useStartingPhotoReminder';
import { pickNextAchievements, stageState, weekCount } from '../data/homeDisplay';
import { homeCopy } from '../copy';

/** Recent notifications looked at for "the coach's latest update". */
const UPDATE_LOOKBACK = 10;

export interface CoachMessage {
  text: string;
  /** ISO — when it reached her (the publish of the plan / nutrition version it came with). */
  at: string;
  /** Which note it is (what "👍 Thanks!" names to the server). */
  note: CoachNoteId;
  /** One note = one key (its publish): "thanks sent" is remembered per note. */
  key: string;
  /** Not read yet: the nutrition intro she hasn't opened (the plan notes: an unread "plan published"). */
  unread: boolean;
}

type PlanPublishedNotification = Extract<AppNotification, { type: 'plan_published' }>;
type CoachingEndedNotification = Extract<AppNotification, { type: 'coaching_ended' }>;

/** A part of Home that is only drawn when its own call worked (the week is the screen's one hard need). */
function useOptionalLoad<T>(load: () => Promise<T>): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let isCurrent = true;
    load()
      .then((result) => {
        if (isCurrent) setData(result);
      })
      .catch(() => {
        // Hidden on Home; its own tab shows the error.
      });
    return () => {
      isCurrent = false;
    };
  }, [load]);
  return data;
}

const loadUpdates = () => listNotifications({ limit: UPDATE_LOOKBACK, unread: true });

/**
 * Everything Home shows, from existing endpoints only: this week (/plans/week), streak + stats +
 * progress (/achievements), today's portions (/meal-logs), the coach's notes (this week's plan notes,
 * the nutrition intro), her unread "plan published" notification and the timer's last interval
 * (this device). Anything without data is null and its section is not drawn.
 */
export function useHomeData(coachingId?: string) {
  const copy = useCopy(homeCopy);
  const { user } = useAuth();
  // Coaching-aware: one coach's week when asked (later multi-coach UI), else her current coaching.
  const loadWeek = useCallback(() => getWeek(coachingId), [coachingId]);
  const week = useLoad(loadWeek, copy.loadError);
  const { data: achievements } = useMyAchievements();
  const startingPhoto = useStartingPhotoReminder();
  const mealLogs = useOptionalLoad(getMealLogs);
  const nutrition = useOptionalLoad<TraineeNutritionPlanResponse>(getNutritionPlan);
  const updates = useOptionalLoad(loadUpdates);
  const [handledUpdateId, setHandledUpdateId] = useState<string | null>(null);

  // Anything not celebrated yet (a skipped summary, an unlock on another device) gets its moment here.
  useEffect(() => {
    if (achievements) celebrate(achievements.unlocked);
  }, [achievements]);

  const data = week.data;
  const stage = data ? stageState(data) : null;

  const today: MealLogDay | null = useMemo(() => {
    if (!mealLogs) return null;
    const day = mealLogs.days.find((entry) => entry.date === mealLogs.today);
    // No live nutrition plan today → nothing to track (FuelToday is hidden).
    if (!day || day.planVersion === null) return null;
    const planned = day.planned;
    return planned.protein + planned.carb + planned.fat + planned.snack > 0 ? day : null;
  }, [mealLogs]);

  // The newest coach-written text she has: this week's plan message (else its notes) or the nutrition intro.
  const coachMessage: CoachMessage | null = useMemo(() => {
    const candidates: CoachMessage[] = [];
    const plan = data?.plan;
    const planText = plan?.introMessage?.trim() || plan?.notes?.trim();
    if (plan && planText && plan.publishedAt) {
      candidates.push({ text: planText, at: plan.publishedAt, note: 'plan', key: `plan:${plan.id}:${plan.publishedAt}`, unread: false });
    }
    const view = nutrition?.plan;
    if (view?.intro?.trim()) {
      candidates.push({
        text: view.intro.trim(),
        at: view.publishedAt,
        note: 'nutrition',
        key: `nutrition:${view.publishedAt}`,
        unread: nutrition?.introUnseen ?? false,
      });
    }
    return candidates.sort((a, b) => b.at.localeCompare(a.at))[0] ?? null;
  }, [data, nutrition]);

  // Her coach's latest update: an unread "plan published" for this week or later.
  const planUpdate: PlanPublishedNotification | null = useMemo(() => {
    if (!updates || !data) return null;
    const found = updates.items.find(
      (item): item is PlanPublishedNotification =>
        item.type === 'plan_published' && item.data.weekStartDate >= data.weekStartDate && item.id !== handledUpdateId,
    );
    return found ?? null;
  }, [updates, data, handledUpdateId]);

  // Her coach ended the coaching: told once on Home until she hides it (it is then read).
  const coachingEnded: CoachingEndedNotification | null = useMemo(
    () => updates?.items.find((item): item is CoachingEndedNotification => item.type === 'coaching_ended' && item.id !== handledUpdateId) ?? null,
    [updates, handledUpdateId],
  );

  const markUpdateSeen = useCallback((id: string) => {
    setHandledUpdateId(id);
    void markRead(id)
      .then(() => refreshUnreadCount())
      .catch(() => undefined);
  }, []);

  return {
    user,
    week,
    stage,
    weekCount: weekCount(data?.plan ?? null),
    activeLog: data?.activeLog ?? null,
    achievements: achievements ?? null,
    nextAchievements: achievements ? pickNextAchievements(achievements.progress) : null,
    startingPhoto,
    fuel: today,
    coachMessage,
    // Her coach's name for the card (initials + name); the nutrition plan's publisher as a fallback.
    coachName: data?.coach?.name ?? nutrition?.coach?.name ?? null,
    planUpdate,
    coachingEnded,
    markUpdateSeen,
  };
}

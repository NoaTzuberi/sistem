import { useCallback, useEffect, useRef, useState } from 'react';
import type { MealLogDay, OwnNutritionTarget, PortionCounts } from '@sistem/types';
import { getMealLogs, saveMealLog } from '../../../services/nutrition/nutritionService';
import { loadNutritionCache, saveNutritionCache } from '../data/nutritionCache';

// Portion tracking on the phone (Phase 13a+), like the workout session: every tap lands in
// the phone cache first, then a debounced save of the whole day (last write wins); what
// the server hasn't confirmed is sent again on reconnect and when the app comes back.
const SAVE_DEBOUNCE_MS = 800;
const RETRY_MS = 15_000;

export type TrackerSync = 'synced' | 'saving' | 'pending';

function withPending(days: MealLogDay[], pending: Record<string, PortionCounts>): MealLogDay[] {
  return days.map((day) => (pending[day.date] ? { ...day, eaten: pending[day.date], logged: true } : day));
}

export function useMealTracker(userId: string) {
  const [days, setDays] = useState<MealLogDay[]>(() => {
    const cache = loadNutritionCache(userId);
    return withPending(cache.days, cache.pending);
  });
  const [today, setToday] = useState<string | null>(() => loadNutritionCache(userId).today);
  const [ownTarget, setOwnTarget] = useState<OwnNutritionTarget | null>(() => loadNutritionCache(userId).ownTarget);
  const [loadFailed, setLoadFailed] = useState(false);
  const [sync, setSync] = useState<TrackerSync>(() =>
    Object.keys(loadNutritionCache(userId).pending).length > 0 ? 'pending' : 'synced',
  );
  const timerRef = useRef<number | null>(null);
  const flushingRef = useRef(false);

  const flush = useCallback(async () => {
    if (flushingRef.current) return;
    const { pending } = loadNutritionCache(userId);
    const dates = Object.keys(pending);
    if (dates.length === 0) {
      setSync('synced');
      return;
    }
    flushingRef.current = true;
    setSync('saving');
    try {
      for (const date of dates) {
        const sent = pending[date];
        try {
          const saved = await saveMealLog(date, sent);
          // A tap made while this was on its way stays pending.
          const latest = loadNutritionCache(userId);
          const stillSame = JSON.stringify(latest.pending[date]) === JSON.stringify(sent);
          const nextPending = { ...latest.pending };
          if (stillSame) delete nextPending[date];
          saveNutritionCache(userId, { pending: nextPending, days: latest.days.map((day) => (day.date === date ? saved : day)) });
          if (stillSame) setDays((current) => current.map((day) => (day.date === date ? saved : day)));
        } catch (error) {
          const status = (error as { response?: { status?: number } }).response?.status;
          // No connection / server trouble: everything stays for the next try.
          if (!status || status >= 500) break;
          // Refused (outside the window, no plan that day): it would never pass — drop it.
          const latest = loadNutritionCache(userId);
          const nextPending = { ...latest.pending };
          delete nextPending[date];
          saveNutritionCache(userId, { pending: nextPending });
        }
      }
    } finally {
      flushingRef.current = false;
      setSync(Object.keys(loadNutritionCache(userId).pending).length > 0 ? 'pending' : 'synced');
    }
  }, [userId]);

  const scheduleFlush = useCallback(
    (delay: number) => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void flush();
      }, delay);
    },
    [flush],
  );

  const reload = useCallback(async () => {
    try {
      const response = await getMealLogs();
      const { pending } = loadNutritionCache(userId);
      saveNutritionCache(userId, { days: response.days, today: response.today, ownTarget: response.ownTarget });
      setDays(withPending(response.days, pending));
      setToday(response.today);
      setOwnTarget(response.ownTarget);
      setLoadFailed(false);
      if (Object.keys(pending).length > 0) scheduleFlush(0);
    } catch {
      // Offline: the cached days stay on screen.
      setLoadFailed(true);
    }
  }, [userId, scheduleFlush]);

  useEffect(() => {
    void reload();
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [reload]);

  // Back online / back in the foreground: send what is waiting right away.
  useEffect(() => {
    const retry = () => {
      if (document.visibilityState === 'visible' || navigator.onLine) void flush();
    };
    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', retry);
    const timer = window.setInterval(() => {
      if (Object.keys(loadNutritionCache(userId).pending).length > 0) void flush();
    }, RETRY_MS);
    return () => {
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', retry);
      window.clearInterval(timer);
    };
  }, [flush, userId]);

  /** One tap: the whole day's marks, kept on the phone at once and saved shortly after. */
  const setEaten = useCallback(
    (date: string, eaten: PortionCounts) => {
      const cache = loadNutritionCache(userId);
      saveNutritionCache(userId, { pending: { ...cache.pending, [date]: eaten } });
      setDays((current) => current.map((day) => (day.date === date ? { ...day, eaten, logged: true } : day)));
      setSync('pending');
      scheduleFlush(SAVE_DEBOUNCE_MS);
    },
    [userId, scheduleFlush],
  );

  /** A day the server answered for another reason (a photo upload / removal). */
  const replaceDay = useCallback(
    (saved: MealLogDay) => {
      const cache = loadNutritionCache(userId);
      saveNutritionCache(userId, { days: cache.days.map((day) => (day.date === saved.date ? saved : day)) });
      const pending = cache.pending[saved.date];
      setDays((current) => current.map((day) => (day.date === saved.date ? (pending ? { ...saved, eaten: pending } : saved) : day)));
    },
    [userId],
  );

  return { days, today, ownTarget, loadFailed, sync, setEaten, replaceDay, reload };
}

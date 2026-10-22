import type { AppNotification, CoachTraineeSummary, CoachTraineeWeek, Language } from '@sistem/types';
import { dateFormat, describeCoachNotification, fill, formatTimeAgo, formatTimeLeft, isolateAuto } from '@sistem/shared';
import { NEW_PLAN_STATE, traineePath } from '../../../app/config/routes';
import type { IconName } from '../../../components/common/Icon/iconPaths';
import { traineesCopy } from '../../trainees/copy';
import { isPlanWindowUrgent } from '../../trainees/data/traineeFacts';
import { notificationsCopy } from '../copy';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
/** Up to here a time reads "5 minutes ago"; later the same day it is the clock time. */
const RELATIVE_HOURS = 6;

/** warn / late are made here from the 48h windows; new / done are the server's notifications. */
export type NoticeType = 'warn' | 'late' | 'new' | 'done';

export interface NoticeItem {
  /** Stable across reloads (the server id, or the trainee + her deadline for a window alert). */
  id: string;
  type: NoticeType;
  icon: IconName;
  title: string;
  body?: string;
  /** Under the title, at the far end; a window alert has none (its title is the time). */
  time?: string;
  isUnread: boolean;
  /** Where pressing the item goes, and the router state that travels with it. */
  to: string;
  state?: unknown;
  /** The action button ("build plan") — same target as the item. */
  action?: string;
  /** The server notification behind it (to mark it read); undefined for a window alert. */
  serverId?: string;
  /** Every item can be dismissed (hidden in this browser). */
  canDismiss: boolean;
  group: 'attention' | 'today' | 'earlier';
}

export interface NoticeGroup {
  id: NoticeItem['group'];
  title: string;
  items: NoticeItem[];
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "now" / "2 hours ago" for recent items, the clock time for the rest of today, a short date before. */
export function noticeTime(iso: string, nowMs: number, language: Language): string {
  const at = new Date(iso);
  const agoMs = nowMs - at.getTime();
  if (agoMs < MINUTE_MS) return notificationsCopy[language].now;
  if (agoMs < RELATIVE_HOURS * HOUR_MS) return formatTimeAgo(iso, nowMs, language);
  if (isSameLocalDay(at, new Date(nowMs))) return dateFormat(language, { hour: '2-digit', minute: '2-digit' }).format(at);
  return dateFormat(language, { day: 'numeric', month: 'short' }).format(at);
}

/** The id of a 48h-window alert: a new deadline (never the case today) would be a new alert. */
export function windowAlertId(trainee: Pick<CoachTraineeSummary, 'id' | 'planDueAt'>): string {
  return `window:${trainee.id}:${trainee.planDueAt}`;
}

/**
 * The 48h windows that need the coach now, most urgent first: closing within the same 12 hours
 * the trainees table calls urgent (warn), or already passed (late). Made here from the trainees
 * list and the server's clock — the server sends no notification for them.
 */
export function buildWindowAlerts(trainees: CoachTraineeSummary[], nowMs: number, seenAlertIds: ReadonlySet<string>, language: Language): NoticeItem[] {
  const copy = notificationsCopy[language];
  const trainee = traineesCopy[language];
  return trainees
    .filter((person): person is CoachTraineeSummary & { planDueAt: string } => person.planDueAt !== null && isPlanWindowUrgent(person.planDueAt, nowMs))
    .sort((a, b) => a.planDueAt.localeCompare(b.planDueAt))
    .map((person) => {
      const left = formatTimeLeft(person.planDueAt, nowMs, language);
      const id = windowAlertId(person);
      return {
        id,
        type: left.isOverdue ? ('late' as const) : ('warn' as const),
        icon: left.isOverdue ? ('waiting' as const) : ('clock' as const),
        title: fill(copy.windowTitle, { time: left.text, name: isolateAuto(person.name) }),
        body: left.isOverdue
          ? trainee.windowPassed
          : fill(copy.windowCloses, { time: dateFormat(language, { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(person.planDueAt)) }),
        // A passed window stays unread until her plan is published (then it is gone).
        isUnread: left.isOverdue || !seenAlertIds.has(id),
        to: traineePath(person.id, 'plans'),
        state: NEW_PLAN_STATE,
        action: trainee.buildPlanShort,
        // Dismissed, a window alert stays hidden in this browser; publishing her plan removes it anyway.
        canDismiss: true,
        group: 'attention' as const,
      };
    });
}

interface ServerNoticeContext {
  nowMs: number;
  language: Language;
  /** Still waiting for her first plan (the "filled in the questionnaire…" line is still true). */
  isWaiting: (traineeId: string) => boolean;
  weekOf: (traineeId: string) => CoachTraineeWeek | undefined;
}

/** A server notification as a panel item; null for a type the coach is not shown. */
export function buildServerNotice(notification: AppNotification, { nowMs, language, isWaiting, weekOf }: ServerNoticeContext): NoticeItem | null {
  // The sentence and the target are shared with the mobile Inbox.
  const described = describeCoachNotification(notification, language);
  if (!described || (notification.type !== 'trainee_onboarded' && notification.type !== 'workout_completed' && notification.type !== 'coach_note_thanks')) {
    return null;
  }
  const copy = notificationsCopy[language];
  const createdAt = new Date(notification.createdAt);
  const isToday = isSameLocalDay(createdAt, new Date(nowMs));
  const week = weekOf(described.traineeId)?.currentPlan;

  let body: string | undefined;
  if (notification.type === 'trainee_onboarded') {
    if (isWaiting(described.traineeId)) body = copy.waitingForPlan;
  } else if (isToday && week && week.planned > 0) {
    // Her week as it stands now — only next to a workout finished today, when it still describes it.
    body = fill(traineesCopy[language].weekSummary, { done: week.completed, planned: week.planned });
  }

  return {
    id: notification.id,
    serverId: notification.id,
    type: notification.type === 'workout_completed' ? 'done' : 'new',
    icon: notification.type === 'trainee_onboarded' ? 'person' : notification.type === 'coach_note_thanks' ? 'heart' : 'check',
    title: described.text,
    body,
    time: noticeTime(notification.createdAt, nowMs, language),
    isUnread: notification.readAt === null,
    to: traineePath(described.traineeId, described.section ?? undefined),
    canDismiss: true,
    group: isToday ? 'today' : 'earlier',
  };
}

/** The panel's sections, in order; empty ones are left out. */
export function groupNotices(items: NoticeItem[], language: Language): NoticeGroup[] {
  const copy = notificationsCopy[language];
  const groups: NoticeGroup[] = [
    { id: 'attention', title: copy.groupAttention, items: [] },
    { id: 'today', title: copy.groupToday, items: [] },
    { id: 'earlier', title: copy.groupEarlier, items: [] },
  ];
  for (const item of items) groups.find((group) => group.id === item.group)?.items.push(item);
  return groups.filter((group) => group.items.length > 0);
}

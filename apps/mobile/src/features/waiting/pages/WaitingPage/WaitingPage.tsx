import { IconBell } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { Logo } from '../../../../components/common/Logo/Logo';
import { LogoutButton } from '../../../../components/common/LogoutButton/LogoutButton';
import { Spinner } from '../../../../components/common/Spinner/Spinner';
import { useAuth } from '../../../../services/auth/AuthContext';
import { getWaitingStatus } from '../../../../services/waiting/waitingService';
import { PUSH_ENABLED } from '../../../notifications/data/pushConfig';
import { usePushPermission } from '../../../notifications/hooks/usePushPermission';
import { Countdown } from '../../components/Countdown/Countdown';
import { IconSlot } from '../../components/IconSlot/IconSlot';
import { waitingCopy } from '../../copy';
import { WAITING_ICONS } from '../../data/waitingIcons';
import { useWaitingMotion } from '../../hooks/useWaitingMotion';
import './WaitingPage.css';

// How often the screen asks the server whether the plan was published. Phase 5 adds
// the push notification; the poll stays as the fallback while the app is open.
const POLL_INTERVAL_MS = 30_000;
const TICK_INTERVAL_MS = 1000;
// How long the "plan is ready" moment shows before the app moves on to Home.
const READY_MOMENT_MS = 1200;

// One server answer, pinned to the device's monotonic clock (performance.now()).
// The countdown only ever adds elapsed time to the server's "now", so a wrong or
// changed device clock cannot move it (PRD §11: the server is the source of truth).
interface ServerClock {
  dueAtMs: number;
  serverNowMs: number;
  receivedAt: number;
}

function remainingMsFrom(clock: ServerClock): number {
  return clock.dueAtMs - (clock.serverNowMs + (performance.now() - clock.receivedAt));
}

/** "Your plan is being built" (PRD §4.1): full screen, no tab bar, until a plan is published. */
export function WaitingPage() {
  const copy = useCopy(waitingCopy);
  const { updateUser } = useAuth();
  const push = usePushPermission();
  const [isReady, setIsReady] = useState(false);
  const pageRef = useWaitingMotion<HTMLDivElement>(isReady);
  const [clock, setClock] = useState<ServerClock | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  // Poll on mount, on an interval, and whenever the app comes back to the foreground
  // (which also re-syncs the clock after the device slept).
  useEffect(() => {
    let cancelled = false;
    let readyTimeoutId: number | undefined;

    async function poll() {
      try {
        const status = await getWaitingStatus();
        if (cancelled) return;

        if (status.appState !== 'waiting') {
          // The moment is already playing (a second poll came in meanwhile).
          if (readyTimeoutId !== undefined) return;
          const nextState = status.appState;

          if (nextState !== 'home') {
            updateUser({ appState: nextState });
            return;
          }

          // The plan is published: show "ready" for a moment, then AppStateGuard follows
          // the new state to Home.
          setIsReady(true);
          readyTimeoutId = window.setTimeout(() => updateUser({ appState: nextState }), READY_MOMENT_MS);
          return;
        }

        if (status.planDueAt) {
          const nextClock: ServerClock = {
            dueAtMs: new Date(status.planDueAt).getTime(),
            serverNowMs: new Date(status.serverTime).getTime(),
            receivedAt: performance.now(),
          };
          setClock(nextClock);
          setRemainingMs(remainingMsFrom(nextClock));
        }
      } catch {
        // Offline or a server hiccup: keep the last known clock and try again next time.
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') void poll();
    }

    void poll();
    const intervalId = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearTimeout(readyTimeoutId);
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // Only on mount: updateUser is a new function on every AuthProvider render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!clock) return;
    const intervalId = window.setInterval(() => setRemainingMs(remainingMsFrom(clock)), TICK_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [clock]);

  const isOverdue = remainingMs !== null && remainingMs <= 0;
  // Phase 5b flips PUSH_ENABLED; the button is for a trainee who was not asked yet.
  const showPushCta = PUSH_ENABLED && push.status === 'prompt';

  return (
    <AppShell hideTabBar>
      <div className={'waiting-page' + (showPushCta ? ' waiting-page-with-cta' : '')} ref={pageRef}>
        <div className="waiting-items">
          {WAITING_ICONS.map((icon, index) => (
            <div className={`waiting-item waiting-item-${icon.id}`} data-side={icon.side} key={icon.id}>
              <IconSlot icon={icon} position={index + 1} />
            </div>
          ))}
        </div>

        <Logo variant="mark" className="waiting-logo" />

        <div className="waiting-content">
          <h1 className="waiting-title display-title">{isReady ? copy.readyTitle : copy.title}</h1>

          {remainingMs === null && !isReady && <Spinner size="lg" />}

          {remainingMs !== null && !isOverdue && (
            <>
              <Countdown
                remainingMs={remainingMs}
                label={copy.countdownLabel}
                unitLabels={{ hours: copy.hours, minutes: copy.minutes, seconds: copy.seconds }}
              />
              {/* Kept in place (hidden) during the ready moment: "being built" no longer fits, and nothing jumps. */}
              <p className={'waiting-message' + (isReady ? ' waiting-message-hidden' : '')}>
                {copy.message} <strong className="waiting-message-note">{copy.messageNote}</strong>
              </p>
            </>
          )}

          {isOverdue && <p className="waiting-message">{copy.overdueMessage}</p>}
        </div>

        <div className="waiting-footer">
          {showPushCta && (
            <button type="button" className="waiting-cta" onClick={() => void push.request()}>
              <IconBell size={20} stroke={2.2} aria-hidden="true" />
              <span>{copy.enableNotifications}</span>
            </button>
          )}
          <LogoutButton variant="ghost" className="waiting-logout" />
        </div>
      </div>
    </AppShell>
  );
}

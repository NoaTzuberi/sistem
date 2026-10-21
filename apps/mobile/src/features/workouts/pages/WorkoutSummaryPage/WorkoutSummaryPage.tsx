import { useCallback, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { AchievementProgress, WorkoutLog } from '@sistem/types';
import { fill, getActiveLanguage, useCopy, useLoad } from '@sistem/shared';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { Toast } from '../../../../components/common/Toast/Toast';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { useToast } from '../../../../hooks/useToast';
import { appCopy } from '../../../../copy';
import { ROUTES, workoutLogPath, workoutSessionPath } from '../../../../app/config/routes';
import { getWorkoutLog, updateWorkoutSummary } from '../../../../services/workoutLogs/workoutLogsService';
import { getWeek } from '../../../../services/plans/plansService';
import { getAchievements } from '../../../../services/achievements/achievementsService';
import { UnlockedAchievements } from '../../../achievements/components/UnlockedAchievements/UnlockedAchievements';
import { SummaryStage } from '../../components/SummaryStage/SummaryStage';
import { SummaryRecap } from '../../components/SummaryRecap/SummaryRecap';
import { FeelPicker } from '../../components/FeelPicker/FeelPicker';
import { PumpPhotoField } from '../../components/PumpPhotoField/PumpPhotoField';
import { SummaryNextAchievement } from '../../components/SummaryNextAchievement/SummaryNextAchievement';
import { nextWorkoutAchievement } from '../../data/summaryDisplay';
import { workoutCopy } from '../../copy';
import './WorkoutSummaryPage.css';

const NOTES_MAX_LENGTH = 1000;
/** The "Saved and sent" toast stays this long before Home opens. */
const SAVED_TOAST_MS = 900;

/** Where she came from: right after Finish (→ Home) or her log page ("Add summary"). */
export interface SummaryLocationState {
  fromLog?: boolean;
}

/**
 * The workout summary (PRD §5.3), full screen: the pink stage with the server's numbers, what she
 * did (PRs tagged), the achievements it unlocked, "How was it?", a note for her coach, the Daily
 * Pump photo and her next achievement. Opened after Finish and again from the log page.
 */
export function WorkoutSummaryPage() {
  const copy = useCopy(workoutCopy);
  const eyebrow = useCopy(appCopy).eyebrow;
  const { logId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromLog = (location.state as SummaryLocationState | null)?.fromLog === true;
  const { toastMessage, showToast } = useToast();

  const load = useCallback(() => getWorkoutLog(logId), [logId]);
  const { data, error, reload } = useLoad(load, copy.summary.loadError);
  // The photo changes the log right away (upload / remove); rating and notes on Save.
  const [log, setLog] = useState<WorkoutLog | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [isFormReady, setIsFormReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Extras: never block the summary — on a failure they just don't show.
  const [coachName, setCoachName] = useState<string | null>(null);
  const [nextAchievement, setNextAchievement] = useState<(AchievementProgress & { threshold: number }) | null>(null);

  // The summary opens at its stage, not where the player was scrolled to.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getWeek()
      .then((week) => {
        if (!cancelled) setCoachName(week.coach?.name ?? null);
      })
      .catch(() => undefined);
    getAchievements()
      .then((overview) => {
        if (!cancelled) setNextAchievement(nextWorkoutAchievement(overview.progress));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    setLog(data);
    // Only the first load fills the form; a refetch (fresh photo link) keeps her edits.
    if (!isFormReady) {
      setRating(data.rating ?? null);
      setNotes(data.notes ?? '');
      setIsFormReady(true);
    }
  }, [data, isFormReady]);

  function leave() {
    navigate(fromLog ? workoutLogPath(logId) : ROUTES.TRAINEE_HOME, { replace: true });
  }

  async function save() {
    if (!log || isSaving) return;
    const trimmed = notes.trim();
    const changed = rating !== (log.rating ?? null) || trimmed !== (log.notes ?? '');
    setIsSaving(true);
    setSaveError(null);
    try {
      if (changed) await updateWorkoutSummary(log.id, { rating, notes: trimmed === '' ? null : trimmed });
      const text = workoutCopy[getActiveLanguage()].finish;
      showToast(coachName ? fill(text.savedFor, { name: coachName }) : text.saved);
      window.setTimeout(leave, SAVED_TOAST_MS);
    } catch {
      setSaveError(copy.summary.saveError);
      setIsSaving(false);
    }
  }

  if (log?.status === 'in_progress') return <Navigate to={workoutSessionPath(log.id)} replace />;

  return (
    <AppShell hideTabBar bleed>
      <div className="ws">
        {!log && (
          <div className="ws-state">
            {error ? <StateMessage onRetry={reload}>{error}</StateMessage> : <StateMessage>{copy.summary.loading}</StateMessage>}
          </div>
        )}
        {log && log.status !== 'completed' && (
          <div className="ws-state">
            <StateMessage>{copy.summary.notFinished}</StateMessage>
          </div>
        )}

        {log && log.status === 'completed' && (
          <>
            <SummaryStage workoutTitle={log.workoutTitle} finishedAt={log.finishedAt ?? log.startedAt} stats={log.stats} onClose={leave} />

            <div className="ws-body">
              <SummaryRecap log={log} />
              <UnlockedAchievements achievements={log.achievements ?? []} />

              <section className="ws-section">
                <h2 className="ws-section-title" id="ws-feel-title">
                  <Eyebrow>{eyebrow.feel}</Eyebrow>
                  {copy.summary.ratingQuestion}
                </h2>
                <FeelPicker value={rating} labelledBy="ws-feel-title" onChange={setRating} />
              </section>

              <section className="ws-section">
                <h2 className="ws-section-title">
                  <label htmlFor="ws-notes">{coachName ? fill(copy.finish.noteFor, { name: coachName }) : copy.finish.noteNoCoach}</label>
                </h2>
                <textarea
                  id="ws-notes"
                  className="ws-notes"
                  dir="auto"
                  rows={3}
                  maxLength={NOTES_MAX_LENGTH}
                  placeholder={copy.summary.notesPlaceholder}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </section>

              <PumpPhotoField log={log} onLogChange={setLog} onLinkExpired={reload} />

              {nextAchievement && <SummaryNextAchievement achievement={nextAchievement} />}

              {saveError && (
                <p className="ws-error" role="alert">
                  {saveError}
                </p>
              )}
              <button type="button" className="ws-save" onClick={() => void save()} disabled={isSaving} aria-busy={isSaving || undefined}>
                {coachName ? fill(copy.finish.saveFor, { name: coachName }) : copy.summary.save}
              </button>
            </div>
          </>
        )}
      </div>
      <Toast message={toastMessage} />
    </AppShell>
  );
}

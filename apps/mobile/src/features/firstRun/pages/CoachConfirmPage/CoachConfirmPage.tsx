import { useParams } from 'react-router-dom';
import { fill, useCopy } from '@sistem/shared';
import type { CoachCodeMode } from '../../../../app/config/routes';
import { Spinner } from '../../../../components/common/Spinner/Spinner';
import { FirstRunScreen } from '../../components/FirstRunScreen/FirstRunScreen';
import { CoachConfirmCard } from '../../components/CoachConfirmCard/CoachConfirmCard';
import { useCoachConfirm } from '../../hooks/useCoachConfirm';
import { firstRunCopy } from '../../copy';
import '../CoachCodePage/CoachCodePage.css';
import './CoachConfirmPage.css';

/** "Is this your coach?" — her card, who sees what, then the join (Coaching 'waiting'). */
export function CoachConfirmPage({ mode }: { mode: CoachCodeMode }) {
  const { code = '' } = useParams();
  const copy = useCopy(firstRunCopy);
  const confirm = useCoachConfirm(mode, code);
  const { preview } = confirm;

  return (
    <FirstRunScreen title={copy.confirm.title} step={mode === 'firstRun' ? 4 : undefined} onBack={confirm.backToCode}>
      {!preview ? (
        <div className="fr-confirm-loading" role="status" aria-label={copy.confirm.loading}>
          <Spinner />
        </div>
      ) : (
        <>
          <CoachConfirmCard
            name={preview.coachName}
            avatar={preview.coachAvatar}
            communities={preview.coachCommunityNames}
            access={fill(copy.confirm.access, { coach: preview.coachName })}
          />
          {confirm.error && (
            <p className="fr-code-error" role="alert">
              {confirm.error}
            </p>
          )}
          <button type="button" className="fr-cta" onClick={() => void confirm.confirm()} disabled={confirm.isJoining}>
            {confirm.isJoining ? copy.confirm.joining : copy.confirm.yes}
          </button>
          <button type="button" className="fr-link" onClick={confirm.backToCode}>
            {copy.confirm.no}
          </button>
        </>
      )}
    </FirstRunScreen>
  );
}

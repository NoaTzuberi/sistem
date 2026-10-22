import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { fill, useCopy } from '@sistem/shared';
import { Button } from '../../../../components/common/Button/Button';
import { Spinner } from '../../../../components/common/Spinner/Spinner';
import { AuthScreen } from '../../../auth/components/AuthScreen/AuthScreen';
import { joinCopy } from '../../copy';
import { useJoinInvite } from '../../hooks/useJoinInvite';
import type { JoinView } from '../../hooks/useJoinInvite';
import './JoinPage.css';

/** A coach's link: who invites her, and the one thing she can do next (every rule decided by the server). */
export function JoinPage() {
  const { code = '' } = useParams();
  const copy = useCopy(joinCopy);
  const join = useJoinInvite(code);

  return (
    <AuthScreen title={copy.title}>
      <div className="join-body" aria-live="polite">
        <JoinContent view={join.view} join={join} />
      </div>
    </AuthScreen>
  );
}

function JoinContent({ view, join }: { view: JoinView; join: ReturnType<typeof useJoinInvite> }) {
  const copy = useCopy(joinCopy);
  const continueButton = (
    <Button variant="secondary" onClick={join.goOn}>
      {copy.continue}
    </Button>
  );

  switch (view.kind) {
    case 'loading':
      return <Spinner />;
    case 'problem':
      return (
        <>
          <p className="join-lead">{copy.problems[view.problem]}</p>
          <p className="join-text">{copy.problemHint}</p>
          {continueButton}
        </>
      );
    case 'refused':
      return (
        <>
          <p className="join-lead">{view.message}</p>
          {continueButton}
        </>
      );
    case 'failed':
      return (
        <>
          <p className="join-lead">{copy.failed}</p>
          <Button onClick={join.retry}>{copy.retry}</Button>
        </>
      );
    case 'community_joined':
      return (
        <>
          <p className="join-lead">{fill(copy.communityJoined, { community: view.preview.communityName ?? '' })}</p>
          {continueButton}
        </>
      );
    case 'preview':
      break;
  }

  const { preview } = view;
  const coach = <bdi>{preview.coachName}</bdi>;
  switch (preview.action) {
    case 'sign_up':
      return (
        <>
          <p className="join-lead">{renderWithName(copy.invitedBy, '{coach}', coach)}</p>
          <p className="join-text">{copy.invitedHint}</p>
          <Button onClick={join.signUp}>{copy.signUp}</Button>
          <Button variant="ghost" onClick={join.logIn}>
            {copy.haveAccount}
          </Button>
        </>
      );
    case 'join':
      return (
        <>
          <p className="join-lead">{renderWithName(copy.confirmJoin, '{coach}', coach)}</p>
          <p className="join-text">{copy.confirmJoinText}</p>
          <Button loading={join.isJoining} onClick={join.join}>
            {copy.join}
          </Button>
        </>
      );
    case 'join_community':
      return (
        <>
          <p className="join-lead">{renderWithName(copy.communityTitle, '{community}', <bdi>{preview.communityName}</bdi>)}</p>
          <p className="join-text">{copy.communityText}</p>
          <Button loading={join.isJoining} onClick={join.join}>
            {copy.join}
          </Button>
        </>
      );
    case 'already_hers':
      return (
        <>
          <p className="join-lead">{renderWithName(copy.alreadyHers, '{coach}', coach)}</p>
          {continueButton}
        </>
      );
    case 'other_coach':
      return (
        <>
          <p className="join-lead">{renderWithName(copy.otherCoach, '{coach}', <bdi>{preview.otherCoachName}</bdi>)}</p>
          <p className="join-text">{copy.otherCoachText}</p>
          {continueButton}
        </>
      );
    case 'not_trainee':
      return (
        <>
          <p className="join-lead">{copy.notTrainee}</p>
          {continueButton}
        </>
      );
  }
}

/** A sentence with a name inside it (the name isolated with <bdi> — it may be in another script). */
function renderWithName(template: string, placeholder: string, name: ReactNode) {
  const [before, after = ''] = template.split(placeholder);
  return (
    <>
      {before}
      {name}
      {after}
    </>
  );
}

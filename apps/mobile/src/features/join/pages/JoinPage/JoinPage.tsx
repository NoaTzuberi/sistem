import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { fill, useCopy } from '@sistem/shared';
import { Spinner } from '../../../../components/common/Spinner/Spinner';
import { AuthScreen } from '../../../auth/components/AuthScreen/AuthScreen';
import { AuthSubmitButton } from '../../../auth/components/AuthSubmitButton/AuthSubmitButton';
import { JoinCoachBlock } from '../../components/JoinCoachBlock/JoinCoachBlock';
import { joinCopy } from '../../copy';
import { firstNameOf } from '../../data/joinDisplay';
import { useJoinInvite } from '../../hooks/useJoinInvite';
import type { JoinView } from '../../hooks/useJoinInvite';
import './JoinPage.css';

type Join = ReturnType<typeof useJoinInvite>;

/** A coach's link: who invites her, and the one thing she can do next (every rule decided by the server).
    The login screen's glass card, logo and buttons — the join card is its sibling. */
export function JoinPage() {
  const { code = '' } = useParams();
  const join = useJoinInvite(code);

  return (
    <AuthScreen>
      <div className="join-body" aria-live="polite">
        <JoinContent view={join.view} join={join} />
      </div>
    </AuthScreen>
  );
}

function JoinContent({ view, join }: { view: JoinView; join: Join }) {
  const copy = useCopy(joinCopy);

  function primary(label: string, onClick: () => void, loading = false) {
    return (
      <AuthSubmitButton type="button" loading={loading} onClick={onClick}>
        {label}
      </AuthSubmitButton>
    );
  }

  function secondary(label: string, onClick: () => void) {
    return (
      <AuthSubmitButton type="button" variant="secondary" onClick={onClick}>
        {label}
      </AuthSubmitButton>
    );
  }

  const continueButton = primary(copy.continue, join.goOn);

  switch (view.kind) {
    case 'loading':
      return (
        <div className="join-loading">
          <Spinner />
        </div>
      );
    case 'problem':
      return (
        <>
          <h1 className="auth-glass-title display-title">{copy.invalidTitle}</h1>
          {view.problem !== 'invalid' && <p className="join-text">{copy.problems[view.problem]}</p>}
          <p className="join-text">{copy.problemHint}</p>
          <div className="join-actions">
            {join.isSignedIn ? continueButton : primary(copy.signUpWithoutCoach, join.signUpWithoutCoach)}
            {join.canEnterCode && secondary(copy.haveCode, join.enterCode)}
          </div>
        </>
      );
    case 'refused':
      return (
        <>
          <h1 className="join-title display-title">{view.message}</h1>
          {continueButton}
        </>
      );
    case 'failed':
      return (
        <>
          <h1 className="join-title display-title">{copy.failed}</h1>
          {primary(copy.retry, join.retry)}
        </>
      );
    case 'community_joined':
      return (
        <>
          <h1 className="join-title display-title">{fill(copy.communityJoined, { community: view.preview.communityName ?? '' })}</h1>
          {continueButton}
        </>
      );
    case 'preview':
      break;
  }

  const { preview } = view;
  const firstName = <bdi>{firstNameOf(preview.coachName)}</bdi>;
  switch (preview.action) {
    case 'sign_up':
      return (
        <>
          <JoinCoachBlock name={preview.coachName} avatar={preview.coachAvatar} line={copy.invitesYou} />
          <p className="join-text">{renderWithName(copy.invitedHint, '{coach}', firstName)}</p>
          <div className="join-actions">
            {primary(copy.signUp, join.signUp)}
            {secondary(copy.haveAccount, join.logIn)}
          </div>
        </>
      );
    case 'join':
      return (
        <>
          <JoinCoachBlock name={preview.coachName} avatar={preview.coachAvatar} line={copy.invitesYou} />
          <p className="join-lead">{renderWithName(copy.confirmJoin, '{coach}', firstName)}</p>
          <p className="join-text">{copy.confirmJoinText}</p>
          {primary(copy.join, join.join, join.isJoining)}
        </>
      );
    case 'join_community':
      return (
        <>
          <h1 className="join-title display-title">
            {renderWithName(copy.communityTitle, '{community}', <bdi>{preview.communityName}</bdi>)}
          </h1>
          <p className="join-text">{copy.communityText}</p>
          {primary(copy.join, join.join, join.isJoining)}
        </>
      );
    case 'already_hers':
      return (
        <>
          <JoinCoachBlock
            name={preview.coachName}
            avatar={preview.coachAvatar}
            line={renderWithName(copy.alreadyHers, '{coach}', <bdi>{preview.coachName}</bdi>)}
          />
          {continueButton}
        </>
      );
    case 'other_coach':
      return (
        <>
          <h1 className="join-title display-title">
            {renderWithName(copy.otherCoach, '{coach}', <bdi>{preview.otherCoachName}</bdi>)}
          </h1>
          <p className="join-text">{copy.otherCoachText}</p>
          {continueButton}
        </>
      );
    case 'not_trainee':
      return (
        <>
          <h1 className="join-title display-title">{copy.notTrainee}</h1>
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

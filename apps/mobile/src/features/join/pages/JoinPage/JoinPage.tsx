import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { IconLinkOff } from '@tabler/icons-react';
import { fill, useCopy } from '@sistem/shared';
import { Spinner } from '../../../../components/common/Spinner/Spinner';
import { AuthScreen } from '../../../auth/components/AuthScreen/AuthScreen';
import { AuthButton } from '../../../auth/components/AuthButton/AuthButton';
import { JoinCoachBlock } from '../../components/JoinCoachBlock/JoinCoachBlock';
import { JoinSteps } from '../../components/JoinSteps/JoinSteps';
import { joinCopy } from '../../copy';
import { firstNameOf } from '../../data/joinDisplay';
import { useJoinInvite } from '../../hooks/useJoinInvite';
import type { JoinView } from '../../hooks/useJoinInvite';
import './JoinPage.css';

type Join = ReturnType<typeof useJoinInvite>;

/** A coach's link: who invites her, and the one thing she can do next (every rule decided by the server). */
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
  const continueButton = <AuthButton onClick={join.goOn}>{copy.continue}</AuthButton>;

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
          <span className="join-icon-tile" aria-hidden="true">
            <IconLinkOff size={26} stroke={2} />
          </span>
          <h1 className="join-title display-title">{copy.invalidTitle}</h1>
          {view.problem !== 'invalid' && <p className="join-text">{copy.problems[view.problem]}</p>}
          <p className="join-text">{copy.problemHint}</p>
          <div className="join-actions">
            {join.isSignedIn ? continueButton : <AuthButton onClick={join.signUpWithoutCoach}>{copy.signUpWithoutCoach}</AuthButton>}
            {join.canEnterCode && (
              <AuthButton variant="soft" onClick={join.enterCode}>
                {copy.haveCode}
              </AuthButton>
            )}
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
          <AuthButton onClick={join.retry}>{copy.retry}</AuthButton>
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
  switch (preview.action) {
    case 'sign_up':
      return (
        <>
          <JoinCoachBlock name={preview.coachName} avatar={preview.coachAvatar} line={copy.invitesYou} />
          <p className="join-text">{renderWithName(copy.invitedHint, '{coach}', <bdi>{firstNameOf(preview.coachName)}</bdi>)}</p>
          <JoinSteps />
          <div className="join-actions">
            <AuthButton onClick={join.signUp}>{copy.signUp}</AuthButton>
            <AuthButton variant="soft" onClick={join.logIn}>
              {copy.haveAccount}
            </AuthButton>
          </div>
        </>
      );
    case 'join':
      return (
        <>
          <JoinCoachBlock name={preview.coachName} avatar={preview.coachAvatar} line={copy.invitesYou} />
          <h2 className="join-question">{renderWithName(copy.confirmJoin, '{coach}', <bdi>{firstNameOf(preview.coachName)}</bdi>)}</h2>
          <p className="join-text">{copy.confirmJoinText}</p>
          <AuthButton loading={join.isJoining} onClick={join.join}>
            {copy.join}
          </AuthButton>
        </>
      );
    case 'join_community':
      return (
        <>
          <h1 className="join-title display-title">
            {renderWithName(copy.communityTitle, '{community}', <bdi>{preview.communityName}</bdi>)}
          </h1>
          <p className="join-text">{copy.communityText}</p>
          <AuthButton loading={join.isJoining} onClick={join.join}>
            {copy.join}
          </AuthButton>
        </>
      );
    case 'already_hers':
      return (
        <>
          <h1 className="join-title display-title">{renderWithName(copy.alreadyHers, '{coach}', <bdi>{preview.coachName}</bdi>)}</h1>
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

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InviteProblem, JoinPreview } from '@sistem/types';
import { ROUTES, coachCodePath } from '../../../app/config/routes';
import { landingPath } from '../../../app/router/landingPath';
import { useAuth } from '../../../services/auth/AuthContext';
import { JoinRequestError, acceptJoin, previewJoin } from '../../../services/invites/joinService';
import { clearPendingInvite, setPendingInvite } from '../../../services/invites/pendingInvite';

export type JoinView =
  | { kind: 'loading' }
  | { kind: 'problem'; problem: InviteProblem }
  /** The server said why in a sentence (another email, or a coach's account). */
  | { kind: 'refused'; message: string }
  | { kind: 'failed' }
  | { kind: 'preview'; preview: JoinPreview }
  | { kind: 'community_joined'; preview: JoinPreview };

/** /join/<code>: what the code is, what this viewer may do with it, and the actions. Every rule is the server's. */
export function useJoinInvite(code: string) {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<JoinView>({ kind: 'loading' });
  const [isJoining, setIsJoining] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const userId = user?.id ?? null;

  const showError = useCallback((error: unknown) => {
    if (error instanceof JoinRequestError) {
      if (error.problem) return setView({ kind: 'problem', problem: error.problem });
      if (error.status === 403 && error.message) return setView({ kind: 'refused', message: error.message });
    }
    setView({ kind: 'failed' });
  }, []);

  useEffect(() => {
    let isCurrent = true;
    setView({ kind: 'loading' });
    previewJoin(code)
      .then((preview) => isCurrent && setView({ kind: 'preview', preview }))
      .catch((error: unknown) => isCurrent && showError(error));
    return () => {
      isCurrent = false;
    };
    // Signed in / out changes what she may do with the code.
  }, [code, userId, attempt, showError]);

  /** On to where she belongs (the server's app state), or the sign-up when signed out. */
  const goOn = useCallback(() => {
    navigate(user ? landingPath(user.appState) : ROUTES.REGISTER, { replace: true });
  }, [navigate, user]);

  async function join() {
    if (view.kind !== 'preview') return;
    setIsJoining(true);
    try {
      const response = await acceptJoin(code);
      setUser(response.user);
      if (response.result === 'community_joined') {
        setView({ kind: 'community_joined', preview: view.preview });
      } else {
        navigate(landingPath(response.user.appState), { replace: true });
      }
    } catch (error) {
      // With another coach (multi-coach off): the explanation, never a silent switch.
      if (error instanceof JoinRequestError && error.status === 409 && error.otherCoachName) {
        setView({ kind: 'preview', preview: { ...view.preview, action: 'other_coach', otherCoachName: error.otherCoachName } });
      } else {
        showError(error);
      }
    } finally {
      setIsJoining(false);
    }
  }

  /** Signed out: keep the code for after the sign-up / login. */
  function continueTo(route: typeof ROUTES.REGISTER | typeof ROUTES.LOGIN) {
    setPendingInvite(code);
    navigate(route);
  }

  /** A dead link: on without this code (signed out: the sign-up, no coach attached). */
  function signUpWithoutCoach() {
    clearPendingInvite();
    navigate(ROUTES.REGISTER);
  }

  /** "I have a code": the coach-code screen. It needs an account, so signed out she signs up first
      (the first-run screen after the sign-up offers the code). Coach / admin accounts never get here. */
  function enterCode() {
    if (!user) return signUpWithoutCoach();
    navigate(coachCodePath(user.appState === 'choose_path' ? 'firstRun' : 'later'));
  }

  const canEnterCode = !user || !['coach', 'admin'].includes(user.appState);

  return {
    view,
    isSignedIn: Boolean(user),
    canEnterCode,
    signUpWithoutCoach,
    enterCode,
    isJoining,
    join,
    goOn,
    retry: () => setAttempt((count) => count + 1),
    signUp: () => continueTo(ROUTES.REGISTER),
    logIn: () => continueTo(ROUTES.LOGIN),
  };
}

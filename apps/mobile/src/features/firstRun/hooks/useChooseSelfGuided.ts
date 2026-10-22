import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveLanguage } from '@sistem/shared';
import { landingPath } from '../../../app/router/landingPath';
import { useAuth } from '../../../services/auth/AuthContext';
import { chooseSelfGuided } from '../../../services/users/usersService';
import { firstRunCopy } from '../copy';

/** "On my own" (or "I don't have a code yet"): remembered on the server, then the questionnaire. */
export function useChooseSelfGuided() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose() {
    setIsSaving(true);
    setError(null);
    try {
      const user = await chooseSelfGuided();
      setUser(user);
      navigate(landingPath(user.appState), { replace: true });
    } catch {
      setError(firstRunCopy[getActiveLanguage()].choice.soloFailed);
    } finally {
      setIsSaving(false);
    }
  }

  return { choose, isSaving, error };
}

import { useState } from 'react';
import type { AppMode } from '@sistem/types';
import { useCopy } from '@sistem/shared';
import { useAuth } from '../../../../services/auth/AuthContext';
import { updatePreferences } from '../../../../services/users/usersService';
import { SegmentedControl } from '../../../profile/components/SegmentedControl/SegmentedControl';
import { coachCopy } from '../../copy';
import './ModeSwitch.css';

/**
 * מצב מאמנת / מצב מתאמנת — only for someone with both roles (the server says so: canSwitchAppMode). The
 * choice is stored on the server (every device follows it); the answer carries the new appState, so the
 * app moves to the other side at once, no new sign-in.
 */
export function ModeSwitch() {
  const copy = useCopy(coachCopy).profile;
  const { user, updateUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!user?.canSwitchAppMode || !user.appMode) return null;

  async function choose(mode: AppMode) {
    setBusy(true);
    setFailed(false);
    try {
      updateUser(await updatePreferences({ appMode: mode }));
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <div className="mode-switch">
      <SegmentedControl
        block
        label={copy.modeTitle}
        options={[
          { value: 'coach' as const, label: copy.modeCoach },
          { value: 'trainee' as const, label: copy.modeTrainee },
        ]}
        value={user.appMode}
        disabled={busy}
        onChange={(next) => void choose(next)}
      />
      {failed && (
        <p className="mode-switch-error" role="alert">
          {copy.modeError}
        </p>
      )}
    </div>
  );
}

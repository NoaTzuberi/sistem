import { useCallback, useEffect, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconLink } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { ROUTES } from '../../../../app/config/routes';
import type { CoachCodeMode } from '../../../../app/config/routes';
import { useGoBack } from '../../../profile/hooks/useGoBack';
import { FirstRunScreen } from '../../components/FirstRunScreen/FirstRunScreen';
import { CodeBoxes } from '../../components/CodeBoxes/CodeBoxes';
import { OptionRow } from '../../components/OptionRow/OptionRow';
import { useCodeBoxes } from '../../hooks/useCodeBoxes';
import { useCoachCodeCheck } from '../../hooks/useCoachCodeCheck';
import { useChooseSelfGuided } from '../../hooks/useChooseSelfGuided';
import { firstRunCopy } from '../../copy';
import './CoachCodePage.css';

/**
 * "Your coach's code": 6 boxes (typed, pasted, or a pasted /join link), checked on the server. QR
 * scanning is not offered (no reliable camera scanning in a web view without a new library — native
 * later, see the report). In the first run "I don't have a code yet" opens the self-guided path.
 */
export function CoachCodePage({ mode }: { mode: CoachCodeMode }) {
  const copy = useCopy(firstRunCopy);
  const navigate = useNavigate();
  const errorId = useId();
  const check = useCoachCodeCheck(mode);
  const solo = useChooseSelfGuided();
  const goBackLater = useGoBack(ROUTES.PROFILE);
  const { clearError } = check;
  const boxes = useCodeBoxes(
    useCallback((code: string) => void check.check(code), [check]),
    clearError,
  );

  // The first box on arrival (focusBox is stable).
  const { focusBox } = boxes;
  useEffect(() => focusBox(0), [focusBox]);

  async function pasteLink() {
    try {
      const text = await navigator.clipboard.readText();
      if (boxes.applyText(text, 0)) return;
    } catch {
      // No clipboard permission (or no API): she pastes into the boxes herself.
    }
    boxes.focusBox(0);
  }

  const error = check.error ?? solo.error;
  return (
    <FirstRunScreen
      title={copy.code.title}
      sub={copy.code.sub}
      step={mode === 'firstRun' ? 3 : undefined}
      onBack={mode === 'firstRun' ? () => navigate(ROUTES.FIRST_RUN, { replace: true }) : goBackLater}
    >
      <form
        className="fr-code-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (boxes.isComplete && !check.isChecking) void check.check(boxes.code);
        }}
      >
        <CodeBoxes
          boxes={boxes.boxes}
          refs={boxes.refs}
          invalid={check.error !== null}
          shakeKey={check.shakeKey}
          errorId={errorId}
          onChange={boxes.handleChange}
          onKeyDown={boxes.handleKeyDown}
          onPaste={boxes.handlePaste}
        />
        <p className="fr-code-error" id={errorId} role="alert">
          {error ?? ''}
        </p>
        <div className="fr-code-options">
          <OptionRow icon={<IconLink size={17} aria-hidden="true" />} label={copy.code.pasteLink} hint={copy.code.pasteHint} onClick={() => void pasteLink()} />
        </div>
        <button type="submit" className="fr-cta" disabled={!boxes.isComplete || check.isChecking}>
          {check.isChecking ? copy.code.checking : copy.code.continue}
        </button>
      </form>
      {mode === 'firstRun' && (
        <div className="fr-code-solo">
          <button type="button" className="fr-link" onClick={() => void solo.choose()} disabled={solo.isSaving}>
            {copy.code.noCode}
          </button>
          <p className="fr-code-note">{copy.code.noCodeNote}</p>
        </div>
      )}
    </FirstRunScreen>
  );
}

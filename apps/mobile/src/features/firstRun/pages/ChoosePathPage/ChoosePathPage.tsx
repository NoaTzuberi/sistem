import { useNavigate } from 'react-router-dom';
import { IconRun, IconUsers } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { ROUTES } from '../../../../app/config/routes';
import { FirstRunScreen } from '../../components/FirstRunScreen/FirstRunScreen';
import { ChoiceCard } from '../../components/ChoiceCard/ChoiceCard';
import { useChooseSelfGuided } from '../../hooks/useChooseSelfGuided';
import { firstRunCopy } from '../../copy';
import './ChoosePathPage.css';

/** First run, after the sign-up (no invite link): with a coach (→ her code) or on my own (→ the questionnaire). */
export function ChoosePathPage() {
  const copy = useCopy(firstRunCopy);
  const navigate = useNavigate();
  const solo = useChooseSelfGuided();

  return (
    <FirstRunScreen title={copy.choice.title} sub={copy.choice.sub} step={2}>
      <div className="fr-choices">
        <ChoiceCard
          tone="coach"
          icon={<IconUsers size={26} aria-hidden="true" />}
          title={copy.choice.coachTitle}
          body={copy.choice.coachBody}
          onClick={() => navigate(ROUTES.FIRST_RUN_CODE)}
        />
        <ChoiceCard
          tone="solo"
          icon={<IconRun size={26} aria-hidden="true" />}
          title={copy.choice.soloTitle}
          body={copy.choice.soloBody}
          onClick={() => void solo.choose()}
          disabled={solo.isSaving}
        />
      </div>
      {solo.error && (
        <p className="fr-choice-error" role="alert">
          {solo.error}
        </p>
      )}
    </FirstRunScreen>
  );
}

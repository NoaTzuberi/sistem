import { useId, useState } from 'react';
import type { MyOnboarding } from '@sistem/types';
import { fill, isolateLtr, labelList, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { coachCopy } from '../../copy';
import { CoachCard } from '../CoachCard/CoachCard';
import { OnboardingAnswers } from '../OnboardingAnswers/OnboardingAnswers';
import './QuestionnaireCard.css';

/** Her questionnaire: a one-line summary (goals · days a week); "פתיחה" shows every answer. */
export function QuestionnaireCard({ onboarding }: { onboarding: MyOnboarding | null }) {
  const copy = useCopy(coachCopy).detail;
  const shared = useCopy(sharedCopy);
  const language = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const answers = onboarding?.answers;
  const frequency = answers?.trainingFrequency;
  const summary = [
    answers?.goals?.length ? fill(copy.questionnaireGoals, { goals: labelList(answers.goals, shared.onboardingOptions.goals, language) }) : null,
    frequency ? fill(copy.questionnaireDays, { days: isolateLtr(frequency.minDays === frequency.maxDays ? `${frequency.minDays}` : `${frequency.minDays}–${frequency.maxDays}`) }) : null,
  ].filter(Boolean);

  return (
    <CoachCard
      title={copy.questionnaire}
      action={
        onboarding && (
          <button type="button" className="coach-link" aria-expanded={isOpen} aria-controls={panelId} onClick={() => setIsOpen((open) => !open)}>
            {isOpen ? copy.close : copy.open}
          </button>
        )
      }
    >
      <p className="coach-card-text">{summary.length > 0 ? summary.join(' · ') : shared.coach.onboardingNotStarted}</p>
      <div id={panelId} className="questionnaire-card-answers" hidden={!isOpen}>
        {isOpen && <OnboardingAnswers onboarding={onboarding} />}
      </div>
    </CoachCard>
  );
}

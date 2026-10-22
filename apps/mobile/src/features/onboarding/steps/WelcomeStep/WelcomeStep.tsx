import { fill, useCopy } from '@sistem/shared';
import { JoinBanner } from '../../../firstRun/components/JoinBanner/JoinBanner';
import { firstRunCopy } from '../../../firstRun/copy';
import './WelcomeStep.css';

interface WelcomeStepProps {
  /** She has a coaching (a link at sign-up, or a code in the first run). */
  hasCoach: boolean;
  /** That coach's name, once loaded. */
  coachName: string | null;
}

/** The questionnaire's intro: the same questions for both paths — only this line changes. */
export function WelcomeStep({ hasCoach, coachName }: WelcomeStepProps) {
  const copy = useCopy(firstRunCopy).intro;
  const line = !hasCoach ? copy.self : coachName ? fill(copy.coach, { coach: coachName }) : copy.coachNoName;
  return (
    <>
      {hasCoach && coachName && (
        <div className="welcome-step-banner">
          <JoinBanner coachName={coachName} />
        </div>
      )}
      <p className="text-body" dir="auto">
        {line}
      </p>
    </>
  );
}

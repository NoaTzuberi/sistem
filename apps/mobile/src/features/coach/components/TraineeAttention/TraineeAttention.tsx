import type { CoachTraineeSummary } from '@sistem/types';
import { useCopy, useLanguage } from '@sistem/shared';
import { IconAlertTriangle } from '@tabler/icons-react';
import { coachCopy } from '../../copy';
import { attentionSentence } from '../../data/activityDisplay';
import { NameInSentence } from '../NameInSentence/NameInSentence';
import './TraineeAttention.css';

/** The attention rule's card (coach/coachAttention.ts on the server): the soft orange row with the reason. */
export function TraineeAttention({ trainee }: { trainee: CoachTraineeSummary }) {
  const copy = useCopy(coachCopy);
  const language = useLanguage();
  const sentence = attentionSentence(trainee, copy, language);
  if (!sentence) return null;
  return (
    <p className="trainee-attention" role="status">
      <span className="trainee-attention-icon" aria-hidden="true">
        <IconAlertTriangle size={20} />
      </span>
      <span>
        <NameInSentence sentence={sentence} name={trainee.name} />
      </span>
    </p>
  );
}

import type { ReactNode } from 'react';
import { IconPencil } from '@tabler/icons-react';
import { fill, useCopy } from '@sistem/shared';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import type { QuestionnaireTint } from '../../data/questionnaireSections';
import { profileCopy } from '../../copy';
import './QuestionnaireCard.css';

interface QuestionnaireCardProps {
  id: string;
  title: string;
  eyebrow: string;
  icon: ReactNode;
  tint: QuestionnaireTint;
  answered: boolean;
  onEdit: () => void;
  children?: ReactNode;
}

/** One questionnaire section: a tinted icon tile, the Karantina title, a round edit button, the answers. */
export function QuestionnaireCard({ id, title, eyebrow, icon, tint, answered, onEdit, children }: QuestionnaireCardProps) {
  const copy = useCopy(profileCopy);
  const titleId = `qn-title-${id}`;
  return (
    <section className={`qn-card qn-tint-${tint}`} aria-labelledby={titleId}>
      <div className="qn-card-head">
        <span className="qn-card-icon" aria-hidden="true">
          {icon}
        </span>
        <div className="qn-card-heading">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="qn-card-title display-title" id={titleId}>
            {title}
          </h2>
        </div>
        <button type="button" className="qn-card-edit" aria-label={fill(copy.editLabel, { title })} onClick={onEdit}>
          <span className="qn-card-edit-disc" aria-hidden="true">
            <IconPencil size={16} />
          </span>
        </button>
      </div>
      {answered ? (
        <div className="qn-card-body">{children}</div>
      ) : (
        <p className="qn-card-empty">
          <span>{copy.questionnaire.notAnswered}</span>
          <button type="button" className="qn-card-add" aria-label={fill(copy.questionnaire.addLabel, { title })} onClick={onEdit}>
            {copy.questionnaire.add}
          </button>
        </p>
      )}
    </section>
  );
}

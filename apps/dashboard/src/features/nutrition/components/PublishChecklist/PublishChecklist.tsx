import type { NutritionIssue } from '@sistem/types';
import { useCopy } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { nutritionCopy } from '../../copy';
import type { BuilderSection, ChecklistItem } from '../../hooks/usePublishChecklist';
import { IssueList } from '../IssueList/IssueList';
import './PublishChecklist.css';

interface PublishChecklistProps {
  items: ChecklistItem[];
  /** The server's other notes on the plan (warnings, and errors not tied to a meal), as of the last save. */
  issues: NutritionIssue[];
  onGo: (section: BuilderSection) => void;
}

/** "Before publish": each check, done or not, one press from its step. */
export function PublishChecklist({ items, issues, onGo }: PublishChecklistProps) {
  const copy = useCopy(nutritionCopy);
  const b = copy.builder;
  const labels: Record<ChecklistItem['id'], string> = {
    target: b.checkTarget,
    daily: b.checkDaily,
    meals: b.checkMeals,
    issues: b.checkIssues,
    portions: b.checkPortions,
    message: b.checkMessage,
  };

  return (
    <section className="nb-side-card" aria-labelledby="nb-checklist-title">
      <h3 className="nb-side-title" id="nb-checklist-title">
        {copy.issuesTitle}
      </h3>
      <ul className="nb-checklist">
        {items.map((item) => (
          <li key={item.id}>
            <button className="nb-check" type="button" data-state={item.state} onClick={() => onGo(item.section)}>
              <span className="nb-check-mark" aria-hidden="true">
                {item.state === 'ok' ? <Icon name="check" size="sm" /> : item.state === 'advice' ? '!' : item.state === 'todo' ? '•' : ''}
              </span>
              <span className="nb-check-label">{labels[item.id]}</span>
              {item.state === 'optional' && <small className="nb-check-optional">{b.optional}</small>}
            </button>
          </li>
        ))}
      </ul>
      <IssueList issues={issues} />
    </section>
  );
}

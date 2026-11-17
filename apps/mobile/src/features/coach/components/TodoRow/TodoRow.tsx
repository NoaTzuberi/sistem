import { Link } from 'react-router-dom';
import type { CoachTodoItem } from '@sistem/shared';
import { describeCoachTodoReason, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { coachTraineePath } from '../../../../app/config/routes';
import { CoachAvatar } from '../CoachAvatar/CoachAvatar';
import './TodoRow.css';

interface TodoRowProps {
  item: CoachTodoItem;
  onBuildPlan: (traineeId: string) => void;
  onMessage: (item: CoachTodoItem) => void;
}

/** One "דורש טיפול" row: avatar, name, the reason in a few words, one button. The name opens her page. */
export function TodoRow({ item, onBuildPlan, onMessage }: TodoRowProps) {
  const copy = useCopy(sharedCopy).coachTodo;
  const language = useLanguage();
  const { trainee, reason, action } = item;
  const tone = reason.kind === 'window_late' ? ' todo-row-why-late' : reason.kind === 'window_soon' ? ' todo-row-why-soon' : '';
  return (
    <li className="todo-row">
      <Link className="todo-row-who" to={coachTraineePath(trainee.id)}>
        <CoachAvatar name={trainee.name} seed={trainee.id} photoUrl={trainee.avatar?.url} size="today" />
        <span className="todo-row-text">
          <bdi className="todo-row-name">{trainee.name}</bdi>
          <span className={`todo-row-why${tone}`}>{describeCoachTodoReason(reason, language)}</span>
        </span>
      </Link>
      {action === 'build_plan' ? (
        <button type="button" className="todo-row-action" onClick={() => onBuildPlan(trainee.id)}>
          {copy.buildPlan}
        </button>
      ) : (
        <button type="button" className="todo-row-action todo-row-action-soft" aria-haspopup="dialog" onClick={() => onMessage(item)}>
          {copy.sendMessage}
        </button>
      )}
    </li>
  );
}

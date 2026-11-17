import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconChevronLeft } from '@tabler/icons-react';
import { describeCoachTodoSummary, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { ROUTES, coachThreadPath } from '../../../../app/config/routes';
import { Toast } from '../../../../components/common/Toast/Toast';
import { useToast } from '../../../../hooks/useToast';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { coachCopy } from '../../copy';
import { useCoachToday } from '../../hooks/useCoachToday';
import { type MessageRecipient, useQuickMessage } from '../../hooks/useQuickMessage';
import { CalmCard } from '../../components/CalmCard/CalmCard';
import { CoachScreen } from '../../components/CoachScreen/CoachScreen';
import { CoachStage } from '../../components/CoachStage/CoachStage';
import { QuickMessageSheet } from '../../components/QuickMessageSheet/QuickMessageSheet';
import { TodoRow } from '../../components/TodoRow/TodoRow';
import './TodoPage.css';

// Today's "הכול · N": the whole "דורש טיפול" list (Today shows its first 5).
export function TodoPage() {
  const copy = useCopy(coachCopy);
  const shared = useCopy(sharedCopy);
  const language = useLanguage();
  const navigate = useNavigate();
  const { toastMessage, toastAction, showToast } = useToast();
  const onSent = useCallback(
    (recipient: MessageRecipient) =>
      showToast(copy.messages.sent, { label: copy.messages.openThread, onSelect: () => navigate(coachThreadPath(recipient.id)) }),
    [showToast, navigate, copy.messages.sent, copy.messages.openThread],
  );
  const quick = useQuickMessage(onSent);
  const { today, todo, buildPlan, message } = useCoachToday(copy.today.loadError, quick);

  return (
    <CoachScreen
      inkTop
      top={
        <CoachStage labelledBy="coach-todo-title">
          <div className="coach-stage-bar">
            <Link className="coach-stage-round" to={ROUTES.COACH_TODAY} aria-label={copy.detail.back}>
              <IconChevronLeft className="flip-rtl" size={18} stroke={2.2} aria-hidden="true" />
            </Link>
          </div>
          <h1 className="coach-todo-title display-title" id="coach-todo-title">
            {shared.coachTodo.title}
          </h1>
          {today.data && <p className="coach-todo-summary">{describeCoachTodoSummary(todo.length, language)}</p>}
        </CoachStage>
      }
    >
      <div className="coach-todo-body">
        {today.error && !today.data && <StateMessage onRetry={today.reload}>{today.error}</StateMessage>}
        {today.data && todo.length === 0 && <CalmCard />}
        {todo.length > 0 && (
          <ul className="coach-todo-list">
            {todo.map((item) => (
              <TodoRow key={item.trainee.id} item={item} onBuildPlan={buildPlan} onMessage={message} />
            ))}
          </ul>
        )}
      </div>
      <QuickMessageSheet quick={quick} />
      <Toast message={toastMessage} action={toastAction} />
    </CoachScreen>
  );
}

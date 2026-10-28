import { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { MessagePage } from '@sistem/types';
import { sharedCopy, useCopy, useLoad } from '@sistem/shared';
import { ROUTES } from '../../../../app/config/routes';
import { useAuth } from '../../../../services/auth/AuthContext';
import { getTrainee } from '../../../../services/coach/coachService';
import { listTraineeMessages, markTraineeMessagesRead, sendTraineeMessage } from '../../../../services/coach/coachConnectService';
import { type ThreadSource, useThread } from '../../../messages/hooks/useThread';
import { ThreadScreen } from '../../../messages/components/ThreadScreen/ThreadScreen';
import { DEFAULT_TIMEZONE } from '../../data/coachMode';
import { coachMessageUnread } from '../../data/coachUnread';

/** The coach's conversation with one trainee (a live coaching only — the server answers 404 otherwise). */
export function ThreadPage() {
  const { traineeId = '' } = useParams();
  const shared = useCopy(sharedCopy);
  const { user } = useAuth();
  const loadTrainee = useCallback(() => getTrainee(traineeId), [traineeId]);
  const trainee = useLoad(loadTrainee, shared.coach.loadTraineeError).data?.trainee;
  const source = useMemo<ThreadSource<MessagePage>>(
    () => ({
      load: (before) => listTraineeMessages(traineeId, before),
      send: (text) => sendTraineeMessage(traineeId, text),
      markRead: () => markTraineeMessagesRead(traineeId).then((unread) => coachMessageUnread.set(unread)),
      me: 'coach',
    }),
    [traineeId],
  );
  const thread = useThread(source);

  return (
    <ThreadScreen
      name={trainee?.name ?? ''}
      avatarSeed={traineeId}
      avatarUrl={trainee?.avatar?.url}
      fallbackPath={ROUTES.COACH_MESSAGES}
      me="coach"
      timezone={user?.timezone ?? DEFAULT_TIMEZONE}
      thread={thread}
    />
  );
}

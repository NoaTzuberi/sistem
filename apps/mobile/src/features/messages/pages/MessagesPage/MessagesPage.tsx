import { useMemo } from 'react';
import type { TraineeThreadResponse } from '@sistem/types';
import { useCopy } from '@sistem/shared';
import { ROUTES } from '../../../../app/config/routes';
import { useAuth } from '../../../../services/auth/AuthContext';
import { getMyThread, markMyMessagesRead, sendMyMessage } from '../../../../services/messages/messagesService';
import { DEFAULT_TIMEZONE } from '../../../coach/data/coachMode';
import { messagesCopy } from '../../copy';
import { traineeMessageUnread } from '../../data/traineeUnread';
import { type ThreadSource, useThread } from '../../hooks/useThread';
import { ThreadScreen } from '../../components/ThreadScreen/ThreadScreen';

/** The trainee's conversation with her current coach (opened from Home's coach area). */
export function MessagesPage() {
  const copy = useCopy(messagesCopy);
  const { user } = useAuth();
  const source = useMemo<ThreadSource<TraineeThreadResponse>>(
    () => ({
      load: (before) => getMyThread(before),
      send: sendMyMessage,
      markRead: () => markMyMessagesRead().then(() => traineeMessageUnread.set(0)),
      me: 'trainee',
    }),
    [],
  );
  const thread = useThread(source);
  const coach = thread.first?.coach ?? null;

  return (
    <ThreadScreen
      name={coach?.name ?? ''}
      avatarSeed={coach?.id ?? ''}
      avatarUrl={coach?.avatar?.url}
      fallbackPath={ROUTES.TRAINEE_HOME}
      me="trainee"
      timezone={user?.timezone ?? DEFAULT_TIMEZONE}
      thread={thread}
      canWrite={thread.isLoading || coach !== null}
      cannotWriteText={copy.noCoach}
    />
  );
}

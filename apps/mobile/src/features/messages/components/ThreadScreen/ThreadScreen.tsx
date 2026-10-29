import type { MessagePage, MessageSender } from '@sistem/types';
import { IconChevronLeft } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { useGoBack } from '../../../profile/hooks/useGoBack';
import { CoachAvatar } from '../../../coach/components/CoachAvatar/CoachAvatar';
import { messagesCopy } from '../../copy';
import type { useThread } from '../../hooks/useThread';
import { MessageThread } from '../MessageThread/MessageThread';
import { MessageComposer } from '../MessageComposer/MessageComposer';
import './ThreadScreen.css';

interface ThreadScreenProps {
  /** The other side: her name (title) + avatar. */
  name: string;
  avatarSeed: string;
  avatarUrl?: string | null;
  fallbackPath: string;
  me: MessageSender;
  timezone: string;
  thread: ReturnType<typeof useThread<MessagePage>>;
  /** Writing is possible (the trainee has a coach). */
  canWrite?: boolean;
  /** Shown instead of the composer when she can't write. */
  cannotWriteText?: string;
}

/** A full-screen conversation (no dock): the header with her name, the bubbles, the composer pinned to the bottom. */
export function ThreadScreen({ name, avatarSeed, avatarUrl, fallbackPath, me, timezone, thread, canWrite = true, cannotWriteText }: ThreadScreenProps) {
  const copy = useCopy(messagesCopy);
  const goBack = useGoBack(fallbackPath);

  return (
    <AppShell bleed hideTabBar>
      <div className="cm-screen">
        <header className="cm-screen-head">
          <button type="button" className="cm-screen-back" onClick={goBack} aria-label={copy.back}>
            <IconChevronLeft className="flip-rtl" size={20} stroke={2.2} aria-hidden="true" />
          </button>
          {name && <CoachAvatar name={name} seed={avatarSeed} photoUrl={avatarUrl} />}
          <h1 className="cm-screen-title display-title">
            <bdi>{name || copy.title}</bdi>
          </h1>
        </header>

        <div className="cm-screen-body">
          {thread.isLoading && thread.messages.length === 0 ? null : thread.loadError && thread.messages.length === 0 ? (
            <StateMessage onRetry={() => void thread.reload()}>{copy.loadError}</StateMessage>
          ) : (
            <MessageThread
              messages={thread.messages}
              me={me}
              timezone={timezone}
              hasOlder={thread.hasOlder}
              isLoadingOlder={thread.isLoadingOlder}
              onLoadOlder={() => void thread.loadOlder()}
              otherName={name}
            />
          )}
        </div>

        <div className="cm-screen-foot">
          {canWrite ? (
            <MessageComposer onSend={thread.send} isSending={thread.isSending} sendError={thread.sendError} />
          ) : (
            <p className="cm-screen-cannot">{cannotWriteText}</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

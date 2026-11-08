import { useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPlural, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import type { NoticeItem } from '../../data/notificationItems';
import { useNotifications } from '../../hooks/useNotifications';
import { useNotificationsPanel } from '../../hooks/useNotificationsPanel';
import { notificationsCopy } from '../../copy';
import { NotificationsPanel } from '../NotificationsPanel/NotificationsPanel';
import './NotificationBell.css';

/** The top line's bell: a red dot while something is unread, and the notifications panel under it. */
export function NotificationBell() {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(notificationsCopy);
  const navigate = useNavigate();
  const panel = useNotificationsPanel();
  const notifications = useNotifications(panel.isOpen);
  const panelId = useId();
  const { unreadCount } = notifications;

  // Pressing a notification: read at once, then to the screen it is about.
  function handleOpenItem(item: NoticeItem) {
    void notifications.markItemRead(item);
    panel.close();
    navigate(item.to, item.state !== undefined ? { state: item.state } : undefined);
  }

  return (
    <div className="notification-bell">
      <button
        ref={panel.bellRef}
        className="bell-button"
        data-tour="notifications"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={panel.isOpen}
        aria-controls={panel.isOpen ? panelId : undefined}
        aria-label={unreadCount > 0 ? formatPlural(language, copy.bellLabel, unreadCount) : shared.coach.inbox.notificationsTitle}
        onClick={panel.toggle}
      >
        <Icon name="bell" />
        {/* The count is in the button's name; the dot only says "something new". */}
        {unreadCount > 0 && <span className="bell-dot" aria-hidden="true" />}
      </button>

      {panel.isOpen && (
        <NotificationsPanel
          id={panelId}
          panelRef={panel.panelRef}
          items={notifications.items}
          unreadCount={unreadCount}
          isLoading={notifications.isLoading}
          error={notifications.error}
          onKeyDown={panel.keepFocusInside}
          onClose={panel.close}
          onOpenItem={handleOpenItem}
          onDismiss={notifications.dismiss}
          onMarkAllRead={() => void notifications.markEverythingRead()}
        />
      )}
    </div>
  );
}

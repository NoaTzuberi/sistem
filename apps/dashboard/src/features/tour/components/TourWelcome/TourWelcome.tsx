import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCopy, useI18n } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { Logo } from '../../../../components/common/Logo/Logo';
import { useDrawerTransition } from '../../../../hooks/useDrawerTransition';
import { useAuth } from '../../../../services/auth/AuthContext';
import { tourCopy } from '../../copy';
import { useTour } from '../../hooks/useTour';
import { useTourKeyboard } from '../../hooks/useTourKeyboard';
import './TourWelcome.css';

// = the CSS closing fade (--transition-drawer-out).
const CLOSE_MS = 200;

/**
 * The first-visit welcome before the tour: a centered card over the tour's scrim. "Let's start" = the
 * tour from step 1; "Maybe later" / Esc / × = closed for good (useTour.dismissWelcome).
 */
export function TourWelcome() {
  const { isWelcomeOpen, startFromWelcome, dismissWelcome } = useTour();
  const copy = useCopy(tourCopy).welcome;
  const { direction } = useI18n();
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const { isMounted, isShown } = useDrawerTransition(isWelcomeOpen, CLOSE_MS);

  // Focus on "let's start", Tab kept inside, Esc = later, focus back where it was.
  useTourKeyboard(cardRef, 'welcome', {
    isActive: isWelcomeOpen,
    isCardMounted: isMounted,
    isRtl: direction === 'rtl',
    onSkip: dismissWelcome,
  });

  if (!isMounted) return null;

  const firstName = user?.name.trim().split(/\s+/)[0];
  const photoUrl = user?.avatar?.url;
  // Her name is her own text: isolated (<bdi>) inside the sentence.
  const [titleBefore, titleAfter = ''] = copy.title.split('{name}');

  return createPortal(
    <div className="tour-welcome" data-shown={isShown}>
      <div className="tour-welcome-scrim" aria-hidden="true" />
      <div
        ref={cardRef}
        className="tour-welcome-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-welcome-title"
        aria-describedby="tour-welcome-body"
      >
        <button type="button" className="tour-welcome-close" aria-label={copy.close} onClick={dismissWelcome}>
          <Icon name="close" size="sm" />
        </button>
        {photoUrl ? (
          <img className="tour-welcome-photo" src={photoUrl} alt="" decoding="async" />
        ) : (
          <Logo variant="mark" className="tour-welcome-mark" />
        )}
        <h2 className="tour-welcome-title" id="tour-welcome-title">
          {firstName ? (
            <>
              {titleBefore}
              <bdi>{firstName}</bdi>
              {titleAfter}
            </>
          ) : (
            copy.titleNoName
          )}
        </h2>
        <div className="tour-welcome-body" id="tour-welcome-body">
          <p>{copy.intro}</p>
          <p>{copy.offer}</p>
        </div>
        <div className="tour-welcome-actions">
          <button type="button" className="tour-welcome-start" data-tour-primary onClick={startFromWelcome}>
            {copy.start}
          </button>
          <button type="button" className="tour-welcome-later" onClick={dismissWelcome}>
            {copy.later}
          </button>
        </div>
        <p className="tour-welcome-note">{copy.note}</p>
      </div>
    </div>,
    document.body,
  );
}

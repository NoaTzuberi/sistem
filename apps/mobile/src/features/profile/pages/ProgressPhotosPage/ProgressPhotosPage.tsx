import { useRef } from 'react';
import { IconLock, IconPlus } from '@tabler/icons-react';
import { directionOf, fill, formatDateOnly, poseLabel, useCopy, useI18n } from '@sistem/shared';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { GalleryViewer } from '../../../../components/common/GalleryViewer/GalleryViewer';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { Toast } from '../../../../components/common/Toast/Toast';
import { useToast } from '../../../../hooks/useToast';
import { ROUTES } from '../../../../app/config/routes';
import { bodyCopy } from '../../../bodyTracking/copy';
import { SubScreenHeader } from '../../components/SubScreenHeader/SubScreenHeader';
import { PhotoCompareFrame } from '../../components/PhotoCompareFrame/PhotoCompareFrame';
import { PpStartingCard } from '../../components/PpStartingCard/PpStartingCard';
import { PpTimeline } from '../../components/PpTimeline/PpTimeline';
import { PpAddSheet } from '../../components/PpAddSheet/PpAddSheet';
import { usePhotoCompare } from '../../hooks/usePhotoCompare';
import type { ProfilePhoto } from '../../hooks/usePhotoCompare';
import { useProgressPhotosScreen } from '../../hooks/useProgressPhotosScreen';
import { profileCopy } from '../../copy';
import './ProgressPhotosPage.css';

const STARTING_KEY = 'starting';

/**
 * Progress photos (PRD §5.5; direction B like the Profile): the starting photo, before / after, the
 * timeline by month, a viewer (swipe, delete, compare with the start) and the add sheet. Private:
 * only she and her coach see them, EXIF stripped on the phone, signed links only.
 */
export function ProgressPhotosPage() {
  const copy = useCopy(profileCopy);
  const body = useCopy(bodyCopy);
  const { language } = useI18n();
  const rtl = directionOf(language) === 'rtl';
  const { toastMessage, showToast } = useToast();
  const screen = useProgressPhotosScreen(showToast);
  const compare = usePhotoCompare(screen.comparePhotos, rtl);
  const compareRef = useRef<HTMLElement>(null);
  const pp = copy.pp;

  const describe = (photo: ProfilePhoto) => (photo.kind === 'starting' ? copy.startingPhoto : poseLabel(photo.pose ?? 'front', language));
  const viewerItems = [
    ...screen.items.map((item) => ({ ...item, id: item.key, label: poseLabel(item.pose, language) })),
    ...(screen.starting ? [{ id: STARTING_KEY, key: STARTING_KEY, date: screen.starting.date, photo: screen.starting.photo, pose: null, label: pp.startTitle }] : []),
  ];
  const viewerIndex = viewerItems.findIndex((item) => item.id === screen.viewerKey);

  return (
    <AppShell bleed>
      <div className="pp-screen">
        <SubScreenHeader
          title={body.photosTitle}
          fallbackPath={ROUTES.PROFILE}
          action={
            <button type="button" className="pp-add-pill" onClick={() => screen.openSheet('pose')} aria-label={pp.addLabel}>
              <IconPlus size={16} stroke={3} aria-hidden="true" />
              {pp.add}
            </button>
          }
        />

        <div className="pp-content">
          {screen.isLoading && !screen.list && <StateMessage>{body.loading}</StateMessage>}
          {screen.error && !screen.list && <StateMessage onRetry={screen.reload}>{screen.error}</StateMessage>}

          {screen.list && (
            <>
              <PpStartingCard
                starting={screen.starting}
                selfGuided={screen.selfGuided}
                disabled={screen.upload.isBusy}
                onPick={(file) => void screen.pick(file, { kind: 'starting' })}
                onReplace={() => screen.openSheet('starting')}
                onOpen={() => screen.setViewerKey(STARTING_KEY)}
                onLinkExpired={screen.reload}
              />
              {!screen.starting && screen.upload.status && (
                <p className="pp-status" role="status">
                  {screen.upload.status}
                </p>
              )}
              {!screen.starting && screen.upload.error && !screen.sheet && (
                <p className="pp-error" role="alert">
                  {screen.upload.error}
                </p>
              )}

              {compare.canCompare && (
                <section ref={compareRef} className="pp-section" aria-labelledby="pp-compare-title" tabIndex={-1}>
                  <h2 className="pp-section-title" id="pp-compare-title">
                    {pp.compareTitle}
                  </h2>
                  <PhotoCompareFrame compare={compare} weekOf={screen.weekOf} onLinkExpired={screen.reload} describe={describe} />
                </section>
              )}

              {screen.items.length > 0 ? (
                <section className="pp-section" aria-labelledby="pp-timeline-title">
                  <h2 className="pp-section-title" id="pp-timeline-title">
                    {pp.timelineTitle}
                  </h2>
                  <PpTimeline
                    groups={screen.groups}
                    weekOf={screen.weekOf}
                    onOpen={(item) => screen.setViewerKey(item.key)}
                    onAdd={() => screen.openSheet('pose')}
                    onLinkExpired={screen.reload}
                  />
                </section>
              ) : (
                screen.starting && (
                  <section className="pp-empty">
                    <p className="pp-empty-text">{pp.emptyText}</p>
                    <button type="button" className="pp-empty-action" onClick={() => screen.openSheet('pose')}>
                      {pp.firstPhoto}
                    </button>
                  </section>
                )
              )}

              {/* The one privacy line on the screen. */}
              <p className="pp-lock">
                <IconLock size={13} stroke={2.2} aria-hidden="true" />
                {screen.selfGuided ? pp.lockSelf : pp.lock}
              </p>
            </>
          )}
        </div>
      </div>

      <PpAddSheet
        isOpen={screen.sheet !== null}
        mode={screen.sheet ?? 'pose'}
        selfGuided={screen.selfGuided}
        isBusy={screen.upload.isBusy}
        status={screen.upload.status}
        error={screen.upload.error}
        onClose={screen.closeSheet}
        onPick={(file, target) => void screen.pick(file, target)}
      />

      {viewerIndex >= 0 && (
        <GalleryViewer
          items={viewerItems.map((item) => {
            const date = formatDateOnly(item.date, language);
            return { id: item.id, src: item.photo.url, alt: fill(pp.photoAlt, { pose: item.label, date }), caption: `${item.label} · ${date}` };
          })}
          index={viewerIndex}
          onIndexChange={(index) => screen.setViewerKey(viewerItems[index]?.id ?? null)}
          onClose={() => screen.setViewerKey(null)}
          labels={{ close: pp.close, previous: pp.previous, next: pp.next }}
          onLinkExpired={screen.reload}
          renderActions={(shown) => {
            const item = viewerItems.find((candidate) => candidate.id === shown.id);
            if (!item || item.pose === null) return null;
            const pose = item.pose;
            return (
              <>
                {screen.starting && (
                  <button
                    type="button"
                    className="gallery-viewer-action"
                    onClick={() => {
                      compare.choose(`pose:${item.date}:${pose}`);
                      screen.setViewerKey(null);
                      window.requestAnimationFrame(() => compareRef.current?.focus());
                    }}
                  >
                    {pp.compareWithStart}
                  </button>
                )}
                <button type="button" className="gallery-viewer-action" data-tone="danger" disabled={screen.upload.isBusy} onClick={() => void screen.remove(item.date, pose)}>
                  {pp.delete}
                </button>
              </>
            );
          }}
        />
      )}
      <Toast message={toastMessage} />
    </AppShell>
  );
}

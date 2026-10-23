import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconChevronLeft, IconChevronRight, IconX } from '@tabler/icons-react';
import { useI18n } from '@sistem/shared';
import { useGallerySwipe } from '../../../hooks/useGallerySwipe';
import './GalleryViewer.css';

export interface GalleryItem {
  id: string;
  src: string;
  alt: string;
  /** The line under the photo (its date / meal). */
  caption?: ReactNode;
}

interface GalleryViewerProps {
  items: GalleryItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  labels: { close: string; previous: string; next: string };
  /** The photo's actions (delete, compare…), under the caption. */
  renderActions?: (item: GalleryItem) => ReactNode;
  /** The signed link expired: fetch fresh ones. */
  onLinkExpired?: () => void;
}

/**
 * Private photos full screen: swipe / arrow keys / buttons between them, Esc closes, focus returns to
 * what opened it. Portaled to <body> (the page-enter transform on <main> would pin it).
 */
export function GalleryViewer({ items, index, onIndexChange, onClose, labels, renderActions, onLinkExpired }: GalleryViewerProps) {
  const { direction } = useI18n();
  const isRtl = direction === 'rtl';
  const closeRef = useRef<HTMLButtonElement>(null);
  const item = items[index];
  const hasPrevious = index > 0;
  const hasNext = index < items.length - 1;
  const next = () => hasNext && onIndexChange(index + 1);
  const previous = () => hasPrevious && onIndexChange(index - 1);
  const swipe = useGallerySwipe(isRtl, next, previous);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      // physical: arrow keys point at screen sides; in RTL the next photo is to the left
      else if (event.key === 'ArrowLeft') (isRtl ? next : previous)();
      else if (event.key === 'ArrowRight') (isRtl ? previous : next)();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  if (!item) return null;

  return createPortal(
    <div className="gallery-viewer" role="dialog" aria-modal="true" aria-label={item.alt}>
      <button ref={closeRef} type="button" className="gallery-viewer-close" aria-label={labels.close} onClick={onClose}>
        <IconX size={24} aria-hidden="true" />
      </button>
      <div className="gallery-viewer-stage" {...swipe}>
        <img key={item.id} className="gallery-viewer-image" src={item.src} alt={item.alt} draggable={false} onError={onLinkExpired} />
      </div>
      {items.length > 1 && (
        <>
          <button type="button" className="gallery-viewer-nav gallery-viewer-previous" onClick={previous} disabled={!hasPrevious} aria-label={labels.previous}>
            <IconChevronLeft className="flip-rtl" size={22} aria-hidden="true" />
          </button>
          <button type="button" className="gallery-viewer-nav gallery-viewer-next" onClick={next} disabled={!hasNext} aria-label={labels.next}>
            <IconChevronRight className="flip-rtl" size={22} aria-hidden="true" />
          </button>
        </>
      )}
      <div className="gallery-viewer-footer">
        {item.caption && <p className="gallery-viewer-caption">{item.caption}</p>}
        {renderActions && <div className="gallery-viewer-actions">{renderActions(item)}</div>}
      </div>
    </div>,
    document.body,
  );
}

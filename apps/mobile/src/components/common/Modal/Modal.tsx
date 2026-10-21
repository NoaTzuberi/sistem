import { sharedCopy, useCopy } from '@sistem/shared';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  className?: string;
  variant?: 'default' | 'flat';
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, className, variant = 'default', children }: ModalProps) {
  const copy = useCopy(sharedCopy);
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    // The page behind a sheet must not scroll with it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const panelClassNames = ['modal-panel', variant === 'flat' && 'modal-panel--flat', className]
    .filter(Boolean)
    .join(' ');

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={panelClassNames}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label={copy.common.close}>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M5 5L15 15M15 5L5 15"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {title && (
          <h3 id="modal-title" className="modal-title">
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { sharedCopy, useCopy } from '@sistem/shared';
import { useBottomSheet } from '../../../hooks/useBottomSheet';
import './BottomSheet.css';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** The id of the sheet's visible title, or `label` when it has none. */
  labelledBy?: string;
  label?: string;
  /** The sticky primary action under the scrolling body. */
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * A native-style bottom sheet: slides up (300 ms) / down (200 ms), drag the handle down to close,
 * scrim tap / Esc / the handle close it, focus is trapped and returned. Portaled to <body> so the
 * page-enter transform on <main> can't pin it.
 */
export function BottomSheet({ isOpen, onClose, labelledBy, label, footer, className, children }: BottomSheetProps) {
  const shared = useCopy(sharedCopy);
  const { mounted, phase, sheetRef, handleProps } = useBottomSheet(isOpen, onClose);
  if (!mounted) return null;

  return createPortal(
    <div className="bottom-sheet-layer" data-phase={phase}>
      <div className="bottom-sheet-scrim" onClick={onClose} aria-hidden="true" />
      <section
        ref={sheetRef}
        className={'bottom-sheet' + (className ? ` ${className}` : '')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        tabIndex={-1}
      >
        <button type="button" className="bottom-sheet-handle" aria-label={shared.common.close} {...handleProps} />
        <div className="bottom-sheet-body">{children}</div>
        {footer && <div className="bottom-sheet-footer">{footer}</div>}
      </section>
    </div>,
    document.body,
  );
}

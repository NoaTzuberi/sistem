import { type ReactNode, useId } from 'react';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import './CoachSheet.css';

interface CoachSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** The muted line under the title. */
  subtitle?: ReactNode;
  children: ReactNode;
}

/**
 * Coach mode's sheets (invite, quick message, light edit): the app's BottomSheet (300 ms in / 200 ms
 * out, Esc, scrim, focus kept inside and returned) with the Karantina title of the spec.
 */
export function CoachSheet({ isOpen, onClose, title, subtitle, children }: CoachSheetProps) {
  const titleId = useId();
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} labelledBy={titleId} className="ch-sheet">
      <h2 className="ch-sheet-title display-title" id={titleId}>
        {title}
      </h2>
      {subtitle && <p className="ch-sheet-subtitle">{subtitle}</p>}
      {children}
    </BottomSheet>
  );
}

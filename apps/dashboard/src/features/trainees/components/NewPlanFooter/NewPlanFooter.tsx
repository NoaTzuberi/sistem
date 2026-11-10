import { Icon } from '../../../../components/common/Icon/Icon';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import type { NewPlanFooter as Footer } from '../../hooks/useNewPlanFooter';
import './NewPlanFooter.css';

interface NewPlanFooterProps {
  footer: Footer;
  cancelLabel: string;
  onCancel: () => void;
  /** Something is on its way: "ביטול" waits too. */
  busy: boolean;
}

/**
 * The popover's notice + buttons. Create: the pink pill beside "ביטול". A draft (or drafts in a
 * multi-week range): the pink pill full width, the soft "… במקום הטיוטה" under it, then a small "ביטול".
 */
export function NewPlanFooter({ footer, cancelLabel, onCancel, busy }: NewPlanFooterProps) {
  const { primary, replace, note, isStacked } = footer;

  return (
    <>
      {note && (
        <p className="new-plan-notice" role="status">
          <Icon name="info" size="sm" className="new-plan-notice-icon" />
          <span>{note}</span>
        </p>
      )}
      <div className={isStacked ? 'new-plan-footer new-plan-footer-stacked' : 'new-plan-footer'}>
        <PillButton variant="primary" className="new-plan-footer-primary" disabled={primary.disabled} onClick={primary.onClick}>
          {primary.label}
        </PillButton>
        {replace && (
          <PillButton variant="soft" className="new-plan-footer-replace" disabled={replace.disabled} onClick={replace.onClick}>
            {replace.label}
          </PillButton>
        )}
        {isStacked ? (
          <button className="new-plan-footer-cancel" type="button" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </button>
        ) : (
          <PillButton variant="fill" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </PillButton>
        )}
      </div>
    </>
  );
}

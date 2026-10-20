import { Link } from 'react-router-dom';
import { fill, useCopy } from '@sistem/shared';
import { ActionMenu, type ActionMenuItem } from '../../../../components/common/ActionMenu/ActionMenu';
import { Avatar } from '../../../../components/common/Avatar/Avatar';
import { Icon } from '../../../../components/common/Icon/Icon';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { cardioCopy } from '../../copy';
import './CardioBuilderHeader.css';

interface CardioBuilderHeaderProps {
  traineeId: string;
  traineeName: string;
  weekNumber: number;
  backTo: string;
  isNew: boolean;
  isSaving: boolean;
  menuItems: ActionMenuItem[];
  onSaveDraft: () => void;
  onAdd: () => void;
}

/** The sticky bar: back to the plan, who it is for, which week, and the two saves. */
export function CardioBuilderHeader(props: CardioBuilderHeaderProps) {
  const { traineeId, traineeName, weekNumber, backTo, isNew, isSaving, menuItems, onSaveDraft, onAdd } = props;
  const copy = useCopy(cardioCopy);

  return (
    <header className="cb-header">
      <Link className="cb-header-back" to={backTo} aria-label={copy.back}>
        <Icon name="chevron" className="cb-header-back-icon" />
      </Link>
      <Avatar name={traineeName} seed={traineeId} />
      <div className="cb-header-text">
        <h1 className="cb-header-title">
          {isNew ? copy.newTitle : copy.editTitle} <span className="cb-header-name">· <bdi>{traineeName}</bdi></span>
        </h1>
        <p className="cb-header-sub">{fill(copy.subtitle, { week: weekNumber })}</p>
      </div>
      <div className="cb-header-actions">
        {menuItems.length > 0 && <ActionMenu label={copy.more} items={menuItems} />}
        <PillButton variant="fill" disabled={isSaving} onClick={onSaveDraft}>
          {copy.saveDraft}
        </PillButton>
        <PillButton variant="primary" disabled={isSaving} aria-busy={isSaving || undefined} onClick={onAdd}>
          {isSaving ? copy.saving : copy.addToPlan}
        </PillButton>
      </div>
    </header>
  );
}

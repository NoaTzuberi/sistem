import { useId } from 'react';
import { createPortal } from 'react-dom';
import { useCopy } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import type { IconName } from '../../../../components/common/Icon/iconPaths';
import { cardioCopy } from '../../../cardio/copy';
import { useAddWorkoutMenu } from '../../hooks/useAddWorkoutMenu';
import { planBuilderCopy } from '../../copy';
import './AddWorkoutMenu.css';

interface AddWorkoutMenuProps {
  onAddStrength: () => void;
  onAddCardio: () => void;
}

/** "+ אימון": a strength workout or a cardio workout, both added to this week (in a portal, never clipped). */
export function AddWorkoutMenu({ onAddStrength, onAddCardio }: AddWorkoutMenuProps) {
  const copy = useCopy(planBuilderCopy);
  const cardio = useCopy(cardioCopy);
  const menu = useAddWorkoutMenu();
  const menuId = useId();
  const rows: { id: string; tone: 'strength' | 'cardio'; icon: IconName; label: string; hint: string; onSelect: () => void }[] = [
    { id: 'strength', tone: 'strength', icon: 'dumbbell', label: cardio.menuStrength, hint: cardio.menuStrengthHint, onSelect: onAddStrength },
    { id: 'cardio', tone: 'cardio', icon: 'pulse', label: cardio.menuCardio, hint: cardio.menuCardioHint, onSelect: onAddCardio },
  ];

  return (
    <>
      <button
        ref={menu.triggerRef}
        className="workout-tab-add"
        type="button"
        aria-haspopup="menu"
        aria-expanded={menu.isOpen}
        aria-controls={menu.isOpen ? menuId : undefined}
        onClick={menu.toggle}
      >
        {copy.addWorkoutShort}
      </button>
      {menu.isOpen &&
        createPortal(
          <div ref={menu.menuRef} className="awm" id={menuId} role="menu" aria-label={cardio.menuLabel} style={menu.style} onKeyDown={menu.onMenuKeyDown}>
            {rows.map((row) => (
              <button key={row.id} className="awm-row" type="button" role="menuitem" onClick={() => menu.select(row.onSelect)}>
                <span className={`awm-icon awm-icon-${row.tone}`} aria-hidden="true">
                  <Icon name={row.icon} />
                </span>
                <span className="awm-text">
                  <span className="awm-label">{row.label}</span>
                  <span className="awm-hint">{row.hint}</span>
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

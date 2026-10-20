import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useCopy } from '@sistem/shared';
import { cardioCopy } from '../../../cardio/copy';
import { planBuilderCopy } from '../../copy';
import './WorkoutAddMenu.css';

interface WorkoutAddMenuProps {
  onAddStrength: () => void;
  onAddCardio: () => void;
}

/** "+ אימון": a small menu — a strength workout (added here) or a cardio session (its own builder). */
export function WorkoutAddMenu({ onAddStrength, onAddCardio }: WorkoutAddMenuProps) {
  const copy = useCopy(planBuilderCopy);
  const cardio = useCopy(cardioCopy);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    containerRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setIsOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (event.key === 'Tab') {
      setIsOpen(false);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = [...(containerRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const current = items.indexOf(document.activeElement as HTMLElement);
    items[(current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  }

  function select(action: () => void) {
    setIsOpen(false);
    action();
  }

  return (
    <div className="workout-add-menu" ref={containerRef} onKeyDown={isOpen ? handleKeyDown : undefined}>
      <button
        ref={buttonRef}
        className="workout-tab-add"
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((open) => !open)}
      >
        {copy.addWorkoutShort}
      </button>
      {isOpen && (
        <div className="workout-add-menu-list" id={menuId} role="menu">
          <button className="workout-add-menu-item" type="button" role="menuitem" onClick={() => select(onAddStrength)}>
            {cardio.menuStrength}
          </button>
          <button className="workout-add-menu-item" type="button" role="menuitem" onClick={() => select(onAddCardio)}>
            {cardio.menuCardio}
          </button>
        </div>
      )}
    </div>
  );
}

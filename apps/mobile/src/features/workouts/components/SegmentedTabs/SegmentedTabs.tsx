import type { CSSProperties, KeyboardEvent } from 'react';
import './SegmentedTabs.css';

export interface SegmentedTab<T extends string> {
  id: T;
  label: string;
}

interface SegmentedTabsProps<T extends string> {
  tabs: SegmentedTab<T>[];
  selected: T;
  onSelect: (id: T) => void;
  label: string;
  /** Tab id → the id of the panel it controls. */
  panelId: (id: T) => string;
}

/** An iOS-style segmented control: a white thumb slides under the selected tab. Arrow keys move between tabs. */
export function SegmentedTabs<T extends string>({ tabs, selected, onSelect, label, panelId }: SegmentedTabsProps<T>) {
  const index = Math.max(0, tabs.findIndex((tab) => tab.id === selected));

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const isRtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const forward = (event.key === 'ArrowRight') !== isRtl;
    const next = tabs[(index + (forward ? 1 : tabs.length - 1)) % tabs.length];
    onSelect(next.id);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-tab="${next.id}"]`)?.focus();
  }

  return (
    <div
      className="segmented-tabs"
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      style={{ '--segment-count': tabs.length, '--segment-index': index } as CSSProperties}
    >
      <span className="segmented-tabs-thumb" aria-hidden="true" />
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`tab-${tab.id}`}
          data-tab={tab.id}
          className="segmented-tabs-tab"
          aria-selected={tab.id === selected}
          aria-controls={panelId(tab.id)}
          tabIndex={tab.id === selected ? 0 : -1}
          onClick={() => onSelect(tab.id)}
        >
          <span className="segmented-tabs-label display-title">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

import type { ReactNode } from 'react';
import { IconChevronRight } from '@tabler/icons-react';
import './ChoiceCard.css';

interface ChoiceCardProps {
  tone: 'coach' | 'solo';
  icon: ReactNode;
  title: string;
  body: string;
  onClick: () => void;
  disabled?: boolean;
}

/** One big choice of "How do you want to train?" — a real button: the whole card is the target. */
export function ChoiceCard({ tone, icon, title, body, onClick, disabled }: ChoiceCardProps) {
  return (
    <button type="button" className="fr-choice" data-tone={tone} onClick={onClick} disabled={disabled}>
      <span className="fr-choice-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="fr-choice-go" aria-hidden="true">
        <IconChevronRight className="flip-rtl" size={16} stroke={2.6} />
      </span>
      <span className="fr-choice-title">{title}</span>
      <span className="fr-choice-body">{body}</span>
    </button>
  );
}

import { Link } from 'react-router-dom';
import { formatNumber, useCopy, useLanguage } from '@sistem/shared';
import { ROUTES, coachTraineesPath } from '../../../../app/config/routes';
import { coachCopy } from '../../copy';
import './TodayChips.css';

interface TodayChipsProps {
  active: number;
  waiting: number;
  unreadMessages: number;
}

/** Three small numbers on the stage: active trainees, waiting for a plan, unread messages. Each opens its list. */
export function TodayChips({ active, waiting, unreadMessages }: TodayChipsProps) {
  const copy = useCopy(coachCopy).today;
  const language = useLanguage();
  const chips = [
    { id: 'active', to: coachTraineesPath('active'), value: active, label: copy.chipActive },
    { id: 'waiting', to: coachTraineesPath('waiting'), value: waiting, label: copy.chipWaiting },
    { id: 'messages', to: ROUTES.COACH_MESSAGES, value: unreadMessages, label: copy.chipMessages },
  ];
  return (
    <nav className="today-chips" aria-label={copy.chipsLabel}>
      {chips.map((chip) => (
        <Link key={chip.id} className={`today-chip today-chip-${chip.id}`} to={chip.to}>
          <b className="today-chip-value">{formatNumber(chip.value, language)}</b>
          {chip.label}
        </Link>
      ))}
    </nav>
  );
}

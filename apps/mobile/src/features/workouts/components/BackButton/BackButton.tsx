import { useCopy } from '@sistem/shared';
import { useLocation, useNavigate } from 'react-router-dom';
import { IconChevronLeft } from '@tabler/icons-react';
import { ROUTES } from '../../../../app/config/routes';
import { workoutCopy } from '../../copy';
import './BackButton.css';

// React Router gives the first entry of a session the key 'default'.
const FIRST_ENTRY_KEY = 'default';

/** Back to where the trainee came from (Home or Workouts); Workouts when opened directly. */
interface BackButtonProps {
  /** 'disc' = the round white button of the direction-B screens (on the soft page surface). */
  variant?: 'plain' | 'disc';
}

export function BackButton({ variant = 'plain' }: BackButtonProps = {}) {
  const copy = useCopy(workoutCopy);
  const navigate = useNavigate();
  const location = useLocation();

  function goBack() {
    if (location.key === FIRST_ENTRY_KEY) navigate(ROUTES.WORKOUTS, { replace: true });
    else navigate(-1);
  }

  return (
    <button className={variant === 'disc' ? 'back-button back-button-disc' : 'back-button'} type="button" onClick={goBack} aria-label={copy.list.back}>
      {variant === 'disc' ? (
        <span className="back-button-face" aria-hidden="true">
          <IconChevronLeft className="flip-rtl" size={20} />
        </span>
      ) : (
        <IconChevronLeft className="flip-rtl" size={24} aria-hidden="true" />
      )}
    </button>
  );
}

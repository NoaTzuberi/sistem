import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { hasOpenNewPlanState } from '../../../app/config/routes';

/**
 * Today's "בניית תוכנית" arrives with OPEN_NEW_PLAN_STATE: once her plans are loaded, "תוכנית חדשה" opens by itself.
 * The state is cleared at once, so going back / reloading doesn't open it again.
 */
export function useOpenNewPlanOnArrival(isReady: boolean, open: () => void) {
  const location = useLocation();
  const navigate = useNavigate();
  const shouldOpen = hasOpenNewPlanState(location.state);
  useEffect(() => {
    if (!isReady || !shouldOpen) return;
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    open();
  }, [isReady, shouldOpen, open, navigate, location.pathname, location.search]);
}

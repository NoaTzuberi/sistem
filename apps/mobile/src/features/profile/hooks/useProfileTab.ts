import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export const PROFILE_TABS = ['body', 'photos', 'achievements'] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];

function isProfileTab(value: string | null): value is ProfileTab {
  return (PROFILE_TABS as readonly (string | null)[]).includes(value);
}

/** The selected Profile tab lives in the URL (?tab=), so back / a shared link / a reload keep it. */
export function useProfileTab() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: ProfileTab = isProfileTab(raw) ? raw : 'body';

  const selectTab = useCallback(
    (next: ProfileTab) => {
      setParams(
        (current) => {
          const updated = new URLSearchParams(current);
          updated.set('tab', next);
          return updated;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { tab, selectTab };
}

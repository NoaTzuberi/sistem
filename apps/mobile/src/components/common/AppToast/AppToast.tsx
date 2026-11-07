import { useEffect } from 'react';
import { useLanguage } from '@sistem/shared';
import { hideAppToast, useAppToast } from '../../../services/toast/appToast';
import { Toast } from '../Toast/Toast';

const APP_TOAST_MS = 2600;

/** The app-wide toast (services/toast/appToast) — mounted once, next to the achievement celebration. */
export function AppToast() {
  const entry = useAppToast();
  const language = useLanguage();

  useEffect(() => {
    if (!entry) return;
    const timer = window.setTimeout(() => hideAppToast(entry.id), APP_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [entry]);

  return <Toast message={entry ? entry.text(language) : undefined} />;
}

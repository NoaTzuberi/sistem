import { useCallback, useEffect, useState } from 'react';
import type { CoachInvite } from '@sistem/types';
import { getActiveLanguage } from '@sistem/shared';
import { createPersonalInvite, getInvites } from '../../../services/coach/coachService';
import { useCopyText } from '../../profile/hooks/useCopyText';
import { coachCopy } from '../copy';

/**
 * The invite sheet: her permanent link (loaded when the sheet opens), copy, share (Web Share, else
 * copy) and a personal single-use link (the existing POST /coach/invites), which then becomes the
 * link the sheet shows and shares.
 */
export function useInvite(isOpen: boolean, notify: (text: string) => void) {
  const [permanent, setPermanent] = useState<CoachInvite | null>(null);
  const [personal, setPersonal] = useState<CoachInvite | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const copyText = useCopyText();

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      setPermanent((await getInvites()).permanent);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setPersonal(null);
    void load();
  }, [isOpen, load]);

  const link = personal ?? permanent;

  const copy = useCallback(async () => {
    if (!link) return;
    const text = coachCopy[getActiveLanguage()].invite;
    notify((await copyText(link.url)) ? text.copied : text.copyFailed);
  }, [link, copyText, notify]);

  const share = useCallback(async () => {
    if (!link) return;
    const text = coachCopy[getActiveLanguage()].invite;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: text.shareTitle, url: link.url });
        return;
      } catch (error) {
        // She closed the share sheet: nothing to do. Any other failure falls back to copying.
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    await copy();
  }, [link, copy]);

  const createPersonal = useCallback(async () => {
    const text = coachCopy[getActiveLanguage()].invite;
    setIsCreating(true);
    try {
      setPersonal(await createPersonalInvite());
      notify(text.personalReady);
    } catch {
      notify(text.personalError);
    } finally {
      setIsCreating(false);
    }
  }, [notify]);

  return { link, isPersonal: personal !== null, loadError, reload: load, copy, share, createPersonal, isCreating };
}

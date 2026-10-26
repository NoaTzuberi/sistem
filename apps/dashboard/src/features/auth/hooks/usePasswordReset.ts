import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthApiError } from '@sistem/api-client';
import { getActiveLanguage } from '@sistem/shared';
import { appCopy } from '../../../copy';
import { checkResetToken, requestPasswordReset, resetPassword } from '../../../services/auth/authService';

// Same rules as the server (auth.validation); the server checks them again.
export const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_MS = 60 * 1000;

const resetCopy = () => appCopy[getActiveLanguage()].passwordReset;

/** Whole seconds until `endsAt` (0 when passed), ticking once a second. */
function useSecondsLeft(endsAt: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endsAt <= Date.now()) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

/**
 * "Forgot password": send the link, then ALWAYS the same "sent" state (the server answers the same
 * for every email), with "send again" after a 60-second cooldown.
 */
export function usePasswordResetRequest(initialEmail: string) {
  const [email, setEmail] = useState(initialEmail);
  const [isSent, setIsSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string>();
  const [cooldownEndsAt, setCooldownEndsAt] = useState(0);
  const secondsLeft = useSecondsLeft(cooldownEndsAt);

  async function send() {
    const address = email.trim();
    if (!EMAIL_PATTERN.test(address)) {
      setError(resetCopy().emailInvalid);
      return;
    }
    setError(undefined);
    setIsSending(true);
    try {
      await requestPasswordReset(address, 'dashboard');
      setIsSent(true);
      setCooldownEndsAt(Date.now() + RESEND_COOLDOWN_MS);
    } catch (sendError) {
      setError((sendError instanceof Error && sendError.message) || resetCopy().sendFailed);
    } finally {
      setIsSending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send();
  }

  return {
    email,
    setEmail,
    isSent,
    isSending,
    error,
    secondsLeft,
    submit,
    resend: () => void send(),
  };
}

type LinkState = 'checking' | 'valid' | 'invalid' | 'done';

/**
 * The emailed link's screen: checks the token first, then two password fields with inline rules.
 * `onSaved` runs after a successful save (the page hides the shown passwords).
 */
export function usePasswordReset(onSaved: () => void) {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [linkState, setLinkState] = useState<LinkState>(token ? 'checking' : 'invalid');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isAttempted, setIsAttempted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!token) return;
    let isCurrent = true;
    checkResetToken(token)
      .then((valid) => isCurrent && setLinkState(valid ? 'valid' : 'invalid'))
      // No answer (offline): let her try — the save reports a bad link.
      .catch(() => isCurrent && setLinkState('valid'));
    return () => {
      isCurrent = false;
    };
  }, [token]);

  const isLongEnough = password.length >= MIN_PASSWORD_LENGTH;
  const isMatching = confirm.length > 0 && confirm === password;
  // Inline errors only after the first save attempt; the rules list shows progress before that.
  const passwordError = isAttempted && !isLongEnough ? resetCopy().tooShort : undefined;
  const confirmError = isAttempted && isLongEnough && !isMatching ? resetCopy().mismatch : undefined;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAttempted(true);
    if (!isLongEnough || !isMatching) return;
    setError(undefined);
    setIsSaving(true);
    try {
      await resetPassword(token, password, confirm);
      setPassword('');
      setConfirm('');
      onSaved();
      setLinkState('done');
    } catch (saveError) {
      if (saveError instanceof AuthApiError && saveError.code === 'reset_token_invalid') {
        setLinkState('invalid');
        return;
      }
      setError((saveError instanceof Error && saveError.message) || resetCopy().saveFailed);
    } finally {
      setIsSaving(false);
    }
  }

  return {
    linkState,
    password,
    setPassword,
    confirm,
    setConfirm,
    isLongEnough,
    isMatching,
    passwordError,
    confirmError,
    isSaving,
    error,
    submit,
  };
}

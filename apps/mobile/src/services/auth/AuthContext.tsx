import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getActiveLanguage, useUserLanguage } from '@sistem/shared';
import {
  login as loginRequest,
  register as registerRequest,
  fetchCurrentUser,
} from './authService';
import type { AuthUser } from './authService';
import { getToken, setToken, clearToken } from './tokenStorage';
import { clearPendingInvite, getPendingInvite } from '../invites/pendingInvite';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterResult {
  /** The code that went with the sign-up, if any. */
  inviteCode: string | null;
  /** Set when that code could not be used — the account exists anyway. */
  inviteError: string | null;
  /** Her new account (its appState decides the next screen). */
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  /** Sign-up; an invite code she opened before is sent with it (see RegisterResult). */
  register: (payload: RegisterPayload) => Promise<RegisterResult>;
  /** A fresh user from the server (e.g. after joining a coach). */
  setUser: (user: AuthUser) => void;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
}

// Sent on sign-up so weeks are computed in the trainee's zone; the server falls back
// to its default (Asia/Jerusalem) if this is missing or unknown.
function getDeviceTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Her saved language (Settings) wins over the device's once she is signed in (Phase 15).
  useUserLanguage(user?.language);

  useEffect(() => {
    async function restoreSession() {
      if (!getToken()) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
      } catch {
        clearToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  async function login(payload: LoginPayload) {
    const { token, user: loggedInUser } = await loginRequest(payload);
    setToken(token);
    setUser(loggedInUser);
  }

  async function register(payload: RegisterPayload): Promise<RegisterResult> {
    const inviteCode = getPendingInvite();
    const { token, user: registeredUser, inviteError } = await registerRequest({
      ...payload,
      timezone: getDeviceTimezone(),
      language: getActiveLanguage(),
      ...(inviteCode ? { inviteCode } : {}),
    });
    clearPendingInvite();
    setToken(token);
    setUser(registeredUser);
    return { inviteCode, inviteError: inviteError?.message ?? null, user: registeredUser };
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  function updateUser(patch: Partial<AuthUser>) {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    register,
    setUser,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}

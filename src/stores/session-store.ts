/**
 * Authentication session state.
 *
 * Holds the signed-in user, institution and tokens, and exposes the RBAC
 * helpers the routing layer uses to gate access. Tokens live in memory only;
 * persisting them to disk would leave a credential on shared lab machines,
 * so a restart requires signing in again.
 */

import { create } from 'zustand';
import { api } from '../api';
import type { Id, Permission, User, UserRole } from '../types/domain';
import { hasPermission } from '../types/domain';
import type { LoginCredentials, LoginResult, Session } from '../types/auth';

interface SessionState {
  session: Session | null;
  /** True while a login or restore request is in flight. */
  loading: boolean;
  error: string | null;
  /** Set when the backend demanded a second factor. */
  totpChallengeId: Id | null;

  login(credentials: LoginCredentials): Promise<LoginResult>;
  submitTotp(code: string): Promise<LoginResult>;
  logout(): Promise<void>;
  clearError(): void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  loading: false,
  error: null,
  totpChallengeId: null,

  async login(credentials) {
    set({ loading: true, error: null });
    try {
      const result = await api.auth.login(credentials);
      switch (result.outcome) {
        case 'SUCCESS':
          set({ session: result.session, loading: false, totpChallengeId: null });
          break;
        case 'TOTP_REQUIRED':
          set({ loading: false, totpChallengeId: result.challengeId });
          break;
        case 'INVALID_CREDENTIALS':
          set({ loading: false, error: 'Incorrect credentials. Please try again.' });
          break;
        case 'ACCOUNT_LOCKED':
          set({
            loading: false,
            error: `Account locked until ${new Date(result.until).toLocaleString()}.`,
          });
          break;
      }
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to reach the server.';
      set({ loading: false, error: message });
      throw error;
    }
  },

  async submitTotp(code) {
    const challengeId = get().totpChallengeId;
    if (!challengeId) {
      throw new Error('No authentication challenge is pending.');
    }
    set({ loading: true, error: null });
    try {
      const result = await api.auth.verifyTotp(challengeId, code);
      if (result.outcome === 'SUCCESS') {
        set({ session: result.session, loading: false, totpChallengeId: null });
      } else {
        set({ loading: false, error: 'That code was not accepted.' });
      }
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to reach the server.';
      set({ loading: false, error: message });
      throw error;
    }
  },

  async logout() {
    await api.auth.logout().catch(() => undefined);
    set({ session: null, totpChallengeId: null, error: null });
  },

  clearError() {
    set({ error: null });
  },
}));

/* ---------- Selectors ---------- */

export const useCurrentUser = (): User | null =>
  useSessionStore((s) => s.session?.user ?? null);

export const useIsAuthenticated = (): boolean =>
  useSessionStore((s) => s.session !== null);

export const useUserRole = (): UserRole | null =>
  useSessionStore((s) => s.session?.user.role ?? null);

/** Checks a capability against the current session. */
export function useHasPermission(permission: Permission): boolean {
  return useSessionStore((s) =>
    hasPermission(s.session?.user, permission, s.session?.extraPermissions ?? []),
  );
}

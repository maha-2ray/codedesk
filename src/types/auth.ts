/**
 * Authentication and session types.
 */

import type { Id, Institution, Permission, User } from './domain';

export interface LoginCredentials {
  /** Email address or institutional identifier (matric/staff number). */
  identifier: string;
  password: string;
  /** Populated when the account has 2FA enrolled. */
  totpCode?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds at which `accessToken` expires. */
  expiresAt: number;
}

export interface Session {
  user: User;
  institution: Institution;
  tokens: AuthTokens;
  /** Grants beyond the role default, e.g. a lecturer invigilating. */
  extraPermissions: Permission[];
}

/** Response from the login endpoint; may demand a second factor. */
export type LoginResult =
  | { outcome: 'SUCCESS'; session: Session }
  | { outcome: 'TOTP_REQUIRED'; challengeId: Id }
  | { outcome: 'INVALID_CREDENTIALS' }
  | { outcome: 'ACCOUNT_LOCKED'; until: string };

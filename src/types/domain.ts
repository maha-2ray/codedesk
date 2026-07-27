/**
 * Core domain primitives: identity, roles and organisational structures.
 *
 * These types are the contract between the desktop client and the backend.
 * Keep them free of UI concerns so they can be shared with a future
 * mobile companion app or generated backend clients.
 */

/** Unique identifier. Backend issues UUIDv4 strings. */
export type Id = string;

/** ISO-8601 timestamp string, always UTC (e.g. `2026-07-27T09:30:00Z`). */
export type IsoDateTime = string;

/**
 * Roles recognised by the platform. A user has exactly one primary role;
 * elevated capabilities are granted through {@link Permission}s so that,
 * for example, a lecturer can also invigilate their own exam.
 */
export const USER_ROLES = [
  'STUDENT',
  'LECTURER',
  'INVIGILATOR',
  'ADMIN',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/**
 * Fine-grained capabilities used by the RBAC layer. The backend is the
 * source of truth; the client uses these only to hide or disable UI that
 * would fail server-side anyway.
 */
export const PERMISSIONS = [
  'exam:take',
  'exam:create',
  'exam:publish',
  'exam:grade',
  'exam:monitor',
  'exam:force-submit',
  'question-bank:read',
  'question-bank:write',
  'analytics:view',
  'user:manage',
  'institution:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Default capability grants per role, mirrored from the backend RBAC matrix. */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  STUDENT: ['exam:take'],
  LECTURER: [
    'exam:create',
    'exam:publish',
    'exam:grade',
    'exam:monitor',
    'question-bank:read',
    'question-bank:write',
    'analytics:view',
  ],
  INVIGILATOR: ['exam:monitor', 'exam:force-submit'],
  ADMIN: [
    'exam:monitor',
    'analytics:view',
    'user:manage',
    'institution:manage',
    'question-bank:read',
  ],
};

export interface Institution {
  id: Id;
  name: string;
  /** Short code used in exam references, e.g. `UTG`. */
  code: string;
  timezone: string;
}

export interface Department {
  id: Id;
  institutionId: Id;
  name: string;
  code: string;
}

export interface User {
  id: Id;
  institutionId: Id;
  role: UserRole;
  email: string;
  firstName: string;
  lastName: string;
  /** Matriculation number for students, staff number for employees. */
  identifier: string;
  departmentId?: Id;
  avatarUrl?: string;
  /** Whether the account has two-factor authentication enrolled. */
  twoFactorEnabled: boolean;
  createdAt: IsoDateTime;
}

export interface Course {
  id: Id;
  departmentId: Id;
  code: string;
  title: string;
  /** Academic level, e.g. 200 for a second-year course. */
  level: number;
  creditHours: number;
  lecturerIds: Id[];
}

/** Convenience helper for rendering a user's display name. */
export function fullName(user: Pick<User, 'firstName' | 'lastName'>): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

/** Checks a capability against the role matrix plus any explicit grants. */
export function hasPermission(
  user: Pick<User, 'role'> | null | undefined,
  permission: Permission,
  extraGrants: readonly Permission[] = [],
): boolean {
  if (!user) return false;
  if (extraGrants.includes(permission)) return true;
  return ROLE_PERMISSIONS[user.role].includes(permission);
}

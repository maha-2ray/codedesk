/**
 * Route protection.
 *
 * Client-side guards are a usability measure, not a security boundary: the
 * backend re-checks every request. Their job is to keep users out of screens
 * that would only fail, and to send them somewhere sensible instead.
 */

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROLE_HOME, ROUTES } from '../../constants/routes';
import { useSessionStore } from '../../stores/session-store';
import { hasPermission, type Permission, type UserRole } from '../../types/domain';

/** Requires an authenticated session. */
export const RequireAuth: React.FC = () => {
  const session = useSessionStore((s) => s.session);
  const location = useLocation();

  if (!session) {
    // Remember where they were headed so login can return them there.
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />;
  }
  return <Outlet />;
};

/** Restricts a branch of the route tree to specific roles. */
export const RequireRole: React.FC<{ roles: UserRole[] }> = ({ roles }) => {
  const session = useSessionStore((s) => s.session);

  if (!session) return <Navigate to={ROUTES.login} replace />;
  if (!roles.includes(session.user.role)) {
    return <Navigate to={ROLE_HOME[session.user.role]} replace />;
  }
  return <Outlet />;
};

/** Restricts a route to holders of a specific capability. */
export const RequirePermission: React.FC<{ permission: Permission }> = ({
  permission,
}) => {
  const session = useSessionStore((s) => s.session);

  if (!session) return <Navigate to={ROUTES.login} replace />;
  if (!hasPermission(session.user, permission, session.extraPermissions)) {
    return <Navigate to={ROLE_HOME[session.user.role]} replace />;
  }
  return <Outlet />;
};

/** Sends an already-authenticated user away from the login screen. */
export const RedirectIfAuthenticated: React.FC = () => {
  const session = useSessionStore((s) => s.session);
  if (session) return <Navigate to={ROLE_HOME[session.user.role]} replace />;
  return <Outlet />;
};

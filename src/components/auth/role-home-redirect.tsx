/** Sends the caller to the landing screen appropriate to their role. */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { ROLE_HOME, ROUTES } from '../../constants/routes';
import { useSessionStore } from '../../stores/session-store';

export const RoleHomeRedirect: React.FC = () => {
  const session = useSessionStore((s) => s.session);
  return (
    <Navigate
      to={session ? ROLE_HOME[session.user.role] : ROUTES.login}
      replace
    />
  );
};

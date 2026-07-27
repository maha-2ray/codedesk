/**
 * Dashboard shell: sidebar navigation, header and content outlet.
 *
 * The exam runner deliberately does NOT use this shell — during an exam the
 * candidate must not see navigation that would take them out of the attempt.
 */

import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { NAV_ITEMS, ROUTES } from '../../constants/routes';
import { useSessionStore } from '../../stores/session-store';
import { useUiStore } from '../../stores/ui-store';
import { cn, initials } from '../../lib/utils';
import { fullName, hasPermission } from '../../types/domain';
import { Icon, type IconName } from '../icons';
import { Button } from '../ui/primitives';
import { ConnectionIndicator } from './connection-indicator';

export const AppShell: React.FC = () => {
  const session = useSessionStore((s) => s.session);
  const logout = useSessionStore((s) => s.logout);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const navigate = useNavigate();

  if (!session) return null;

  const { user, institution } = session;
  const items = NAV_ITEMS[user.role].filter(
    (item) =>
      !item.permission ||
      hasPermission(user, item.permission, session.extraPermissions),
  );

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <aside
        className={cn(
          'flex flex-col border-r border-slate-800 bg-slate-900 transition-[width] duration-200',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-4">
          <div className="grid size-8 shrink-0 place-items-center rounded bg-sky-600">
            <Icon name="code" className="size-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">CodeDesk</p>
              <p className="truncate text-xs text-slate-400">{institution.code}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-2" aria-label="Main navigation">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500',
                  isActive
                    ? 'bg-sky-950 text-sky-300'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon name={item.icon as IconName} className="size-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-2">
          <NavLink
            to={ROUTES.settings}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-sky-950 text-sky-300'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
              )
            }
            title={collapsed ? 'Settings' : undefined}
          >
            <Icon name="settings" className="size-5 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </NavLink>
          <button
            type="button"
            onClick={toggleSidebar}
            className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Icon name="code" className="size-5 shrink-0" />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-800 bg-slate-900/50 px-6">
          <ConnectionIndicator />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-100">
                {fullName(user)}
              </p>
              <p className="text-xs text-slate-400">
                {user.role.charAt(0) + user.role.slice(1).toLowerCase()} ·{' '}
                {user.identifier}
              </p>
            </div>
            <div className="grid size-9 place-items-center rounded-full bg-slate-700 text-sm font-medium text-slate-200">
              {initials(user.firstName, user.lastName)}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <Icon name="logout" className="size-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

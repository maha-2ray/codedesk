/**
 * Login screen, including the optional TOTP second factor.
 */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROLE_HOME } from '../constants/routes';
import { useSessionStore } from '../stores/session-store';
import { useAppInfo } from '../hooks/use-app-info';
import { USING_MOCK_API } from '../api';
import { DEMO_PASSWORD, users } from '../api/mock/fixtures';
import { Button, Card, Input } from '../components/ui/primitives';
import { Icon } from '../components/icons';

export const LoginScreen: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const login = useSessionStore((s) => s.login);
  const submitTotp = useSessionStore((s) => s.submitTotp);
  const loading = useSessionStore((s) => s.loading);
  const error = useSessionStore((s) => s.error);
  const totpChallengeId = useSessionStore((s) => s.totpChallengeId);

  const navigate = useNavigate();
  const location = useLocation();
  const appInfo = useAppInfo();

  const redirectAfterLogin = (role: keyof typeof ROLE_HOME) => {
    const from = (location.state as { from?: Location } | null)?.from;
    navigate(from?.pathname ?? ROLE_HOME[role], { replace: true });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await login({ identifier, password });
    if (result.outcome === 'SUCCESS') {
      redirectAfterLogin(result.session.user.role);
    }
  };

  const handleTotp = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await submitTotp(totpCode);
    if (result.outcome === 'SUCCESS') {
      redirectAfterLogin(result.session.user.role);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="grid size-14 place-items-center rounded-xl bg-sky-600">
            <Icon name="code" className="size-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">CodeDesk</h1>
            <p className="mt-1 text-sm text-slate-400">
              Secure examination platform for Computer Science
            </p>
          </div>
        </div>

        <Card as="section">
          {totpChallengeId ? (
            <form onSubmit={handleTotp} className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-medium text-white">
                  Two-factor authentication
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Enter the six-digit code from your authenticator app.
                </p>
              </div>
              <Input
                label="Authentication code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                error={error ?? undefined}
                autoFocus
                required
              />
              <Button type="submit" loading={loading} size="lg">
                Verify and sign in
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Email or student/staff ID"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="2021/CS/0142"
                autoFocus
                required
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={error ?? undefined}
                required
              />
              <Button type="submit" loading={loading} size="lg">
                Sign in
              </Button>
            </form>
          )}
        </Card>

        {USING_MOCK_API && !totpChallengeId && (
          <Card className="mt-4 border-amber-900/50 bg-amber-950/20">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-400">
              Demo mode — mock backend
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Sign in with any account below. Password:{' '}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sky-300">
                {DEMO_PASSWORD}
              </code>
            </p>
            <ul className="mt-3 space-y-1.5">
              {users.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setIdentifier(user.identifier);
                      setPassword(DEMO_PASSWORD);
                    }}
                    className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm text-slate-300 transition-colors hover:bg-slate-800"
                  >
                    <span>
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="text-xs text-slate-500">
                      {user.role.toLowerCase()}
                      {user.twoFactorEnabled && ' · 2FA'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              Accounts with 2FA accept any six-digit code.
            </p>
          </Card>
        )}

        {appInfo && (
          <p className="mt-6 text-center text-xs text-slate-600">
            v{appInfo.version} · Electron {appInfo.electronVersion} ·{' '}
            {appInfo.platform}
          </p>
        )}
      </div>
    </div>
  );
};

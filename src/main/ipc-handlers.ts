/**
 * Main-process IPC handlers.
 *
 * Every channel declared in the shared contract is registered exactly once
 * here. Handlers are thin: they validate input, delegate to a module and
 * return plain data. Errors are logged and rethrown so the renderer's
 * `invoke` promise rejects with a useful message rather than hanging.
 */

import { app, BrowserWindow, ipcMain, screen } from 'electron';
import { createHash } from 'node:crypto';
import { hostname, userInfo } from 'node:os';
import type { AppInfo, AttemptSnapshot } from '../shared/ipc';
import type { SyncEnvelope } from '../types/answer';
import { buildEnvironmentReport } from './environment';
import {
  acknowledgeEnvelopes,
  clearSnapshot,
  drainEnvelopes,
  enqueueEnvelope,
  listSnapshots,
  loadSnapshot,
  saveSnapshot,
} from './storage';

/**
 * Stable per-installation identifier.
 *
 * Derived from hostname plus username and hashed, so it is consistent across
 * launches for device binding without transmitting personal data in clear.
 */
function machineId(): string {
  let seed = 'codedesk';
  try {
    seed = `${hostname()}:${userInfo().username}`;
  } catch {
    // userInfo() can throw in minimal containers; the fallback is fine.
  }
  return createHash('sha256').update(seed).digest('hex').slice(0, 32);
}

function appInfo(): AppInfo {
  return {
    version: app.getVersion(),
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    platform: process.platform,
    arch: process.arch,
    packaged: app.isPackaged,
    machineId: machineId(),
  };
}

/** Broadcasts an event to every open renderer. */
function broadcast(channel: string, ...args: unknown[]): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, ...args);
    }
  }
}

function assertSnapshot(value: unknown): asserts value is AttemptSnapshot {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as AttemptSnapshot).attemptId !== 'string'
  ) {
    throw new Error('Malformed attempt snapshot');
  }
}

function assertEnvelope(value: unknown): asserts value is SyncEnvelope {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as SyncEnvelope).attemptId !== 'string' ||
    typeof (value as SyncEnvelope).revision !== 'number'
  ) {
    throw new Error('Malformed sync envelope');
  }
}

/** Registers every request handler. Call once, after `app.whenReady()`. */
export function registerIpcHandlers(): void {
  ipcMain.handle('app:get-info', () => appInfo());

  ipcMain.handle('attempt:save-snapshot', async (_event, snapshot: unknown) => {
    assertSnapshot(snapshot);
    await saveSnapshot(snapshot);
  });

  ipcMain.handle('attempt:load-snapshot', async (_event, attemptId: string) => {
    return loadSnapshot(attemptId);
  });

  ipcMain.handle('attempt:clear-snapshot', async (_event, attemptId: string) => {
    await clearSnapshot(attemptId);
  });

  ipcMain.handle('attempt:list-snapshots', async () => listSnapshots());

  ipcMain.handle('sync:enqueue', async (_event, envelope: unknown) => {
    assertEnvelope(envelope);
    await enqueueEnvelope(envelope);
  });

  ipcMain.handle('sync:drain', async (_event, limit?: number) =>
    drainEnvelopes(typeof limit === 'number' ? limit : undefined),
  );

  ipcMain.handle(
    'sync:acknowledge',
    async (_event, attemptId: string, revision: number) => {
      await acknowledgeEnvelopes(attemptId, revision);
    },
  );

  ipcMain.handle('environment:report', (event) => {
    return buildEnvironmentReport(BrowserWindow.fromWebContents(event.sender));
  });

  ipcMain.handle('exam-window:set-locked', (event, locked: unknown) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return;
    const shouldLock = Boolean(locked);
    // Kiosk mode is the strongest cross-platform lockdown Electron offers.
    // Full lockdown (blocking OS-level app switching) is out of scope for
    // this milestone and is tracked with the proctoring work.
    window.setFullScreen(shouldLock);
    window.setKiosk(shouldLock);
    window.setAlwaysOnTop(shouldLock);
  });
}

/**
 * Wires main-process events that the renderer subscribes to.
 * Call once, after the first window exists.
 */
export function registerIpcEventSources(window: BrowserWindow): void {
  window.on('focus', () => broadcast('window:focus-changed', true));
  window.on('blur', () => broadcast('window:focus-changed', false));

  const emitDisplays = () => {
    broadcast('environment:displays-changed', buildEnvironmentReport(window));
  };
  screen.on('display-added', emitDisplays);
  screen.on('display-removed', emitDisplays);
  screen.on('display-metrics-changed', emitDisplays);

  // Detach the screen listeners with the window to avoid leaks on reload.
  window.on('closed', () => {
    screen.removeListener('display-added', emitDisplays);
    screen.removeListener('display-removed', emitDisplays);
    screen.removeListener('display-metrics-changed', emitDisplays);
  });
}

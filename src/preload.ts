/**
 * Preload bridge.
 *
 * Runs with context isolation enabled, so the renderer receives only the
 * explicitly listed functions below — never `ipcRenderer` itself. Channels
 * are validated against the shared allow-list so a compromised renderer
 * cannot reach arbitrary main-process handlers.
 *
 * See https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import {
  IPC_EVENT_CHANNELS,
  IPC_REQUEST_CHANNELS,
  type AppInfo,
  type AttemptSnapshot,
  type CodeDeskBridge,
  type EnvironmentReport,
  type IpcEventChannel,
  type IpcRequestChannel,
  type Unsubscribe,
} from './shared/ipc';
import type { SyncEnvelope } from './types/answer';

const requestChannels = new Set<string>(IPC_REQUEST_CHANNELS);
const eventChannels = new Set<string>(IPC_EVENT_CHANNELS);

/** Invokes a main-process handler after checking the channel allow-list. */
function invoke<C extends IpcRequestChannel>(
  channel: C,
  ...args: unknown[]
): Promise<unknown> {
  if (!requestChannels.has(channel)) {
    throw new Error(`Blocked IPC request on unregistered channel: ${channel}`);
  }
  return ipcRenderer.invoke(channel, ...args);
}

/** Subscribes to a main-process event, returning an unsubscribe handle. */
function subscribe(
  channel: IpcEventChannel,
  listener: (...args: never[]) => void,
): Unsubscribe {
  if (!eventChannels.has(channel)) {
    throw new Error(`Blocked IPC subscription on unregistered channel: ${channel}`);
  }
  const handler = (_event: IpcRendererEvent, ...args: unknown[]) => {
    (listener as (...a: unknown[]) => void)(...args);
  };
  ipcRenderer.on(channel, handler);
  return () => {
    ipcRenderer.removeListener(channel, handler);
  };
}

const bridge: CodeDeskBridge = {
  getAppInfo: () => invoke('app:get-info') as Promise<AppInfo>,

  attempt: {
    saveSnapshot: (snapshot: AttemptSnapshot) =>
      invoke('attempt:save-snapshot', snapshot) as Promise<void>,
    loadSnapshot: (attemptId: string) =>
      invoke('attempt:load-snapshot', attemptId) as Promise<AttemptSnapshot | null>,
    clearSnapshot: (attemptId: string) =>
      invoke('attempt:clear-snapshot', attemptId) as Promise<void>,
    listSnapshots: () =>
      invoke('attempt:list-snapshots') as Promise<AttemptSnapshot[]>,
  },

  sync: {
    enqueue: (envelope: SyncEnvelope) =>
      invoke('sync:enqueue', envelope) as Promise<void>,
    drain: (limit?: number) => invoke('sync:drain', limit) as Promise<SyncEnvelope[]>,
    acknowledge: (attemptId: string, revision: number) =>
      invoke('sync:acknowledge', attemptId, revision) as Promise<void>,
  },

  environment: {
    report: () => invoke('environment:report') as Promise<EnvironmentReport>,
    onDisplaysChanged: (listener: (report: EnvironmentReport) => void) =>
      subscribe('environment:displays-changed', listener as (...a: never[]) => void),
  },

  examWindow: {
    setLocked: (locked: boolean) =>
      invoke('exam-window:set-locked', locked) as Promise<void>,
  },

  onFocusChanged: (listener: (focused: boolean) => void) =>
    subscribe('window:focus-changed', listener as (...a: never[]) => void),

  onNetworkStatusChanged: (listener: (online: boolean) => void) =>
    subscribe('network:status-changed', listener as (...a: never[]) => void),
};

contextBridge.exposeInMainWorld('codedesk', bridge);

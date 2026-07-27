/**
 * Typed IPC contract shared by the main process, the preload bridge and the
 * renderer.
 *
 * Design rules:
 *  - The renderer never receives Node or Electron primitives; every channel
 *    exchanges plain serialisable data.
 *  - Channel names are namespaced `domain:action` and centralised here so the
 *    preload allow-list cannot drift from the main-process handlers.
 *  - Request/response channels are declared in {@link IpcRequestMap}; push
 *    notifications from main to renderer live in {@link IpcEventMap}.
 */

import type { SyncEnvelope } from '../types/answer';

/** Persisted attempt snapshot, written to disk for crash recovery. */
export interface AttemptSnapshot {
  attemptId: string;
  examId: string;
  studentId: string;
  /** Serialised answer map. */
  answers: unknown;
  revision: number;
  savedAt: string;
}

export interface AppInfo {
  version: string;
  electronVersion: string;
  chromeVersion: string;
  platform: NodeJS.Platform;
  arch: string;
  /** True when running from a packaged build. */
  packaged: boolean;
  /** Stable per-installation identifier, used for device binding. */
  machineId: string;
}

/** A connected display, used by the multi-monitor policy check. */
export interface DisplayInfo {
  id: number;
  bounds: { x: number; y: number; width: number; height: number };
  scaleFactor: number;
  internal: boolean;
  primary: boolean;
}

/** Snapshot of the environment checks an exam policy may require. */
export interface EnvironmentReport {
  displays: DisplayInfo[];
  displayCount: number;
  isFullscreen: boolean;
  /** Best-effort remote-session detection; see the proctoring milestone. */
  remoteSession: boolean;
  capturedAt: string;
}

/**
 * Request/response channels: `renderer → main`, awaited via `ipcRenderer.invoke`.
 * Each entry maps the channel to its argument tuple and resolved value.
 */
export interface IpcRequestMap {
  'app:get-info': { args: []; result: AppInfo };

  /** Persist an attempt snapshot atomically to the user-data directory. */
  'attempt:save-snapshot': { args: [snapshot: AttemptSnapshot]; result: void };
  /** Read back the most recent snapshot for crash recovery. */
  'attempt:load-snapshot': {
    args: [attemptId: string];
    result: AttemptSnapshot | null;
  };
  /** Remove a snapshot once the attempt is confirmed submitted. */
  'attempt:clear-snapshot': { args: [attemptId: string]; result: void };
  /** List snapshots left behind by a previous crash. */
  'attempt:list-snapshots': { args: []; result: AttemptSnapshot[] };

  /** Append a batch of unsynced answers to the durable outbox. */
  'sync:enqueue': { args: [envelope: SyncEnvelope]; result: void };
  /** Read pending envelopes, oldest first. */
  'sync:drain': { args: [limit?: number]; result: SyncEnvelope[] };
  /** Acknowledge envelopes the server accepted. */
  'sync:acknowledge': { args: [attemptId: string, revision: number]; result: void };

  /** Inspect the runtime environment against exam policy. */
  'environment:report': { args: []; result: EnvironmentReport };

  /** Enter or leave kiosk-style fullscreen for an exam session. */
  'exam-window:set-locked': { args: [locked: boolean]; result: void };
}

/** Push channels: `main → renderer`, delivered to subscriber callbacks. */
export interface IpcEventMap {
  /** Window focus changed; the payload is `true` when focus was gained. */
  'window:focus-changed': [focused: boolean];
  /** The set of connected displays changed. */
  'environment:displays-changed': [report: EnvironmentReport];
  /** The OS reported a network connectivity transition. */
  'network:status-changed': [online: boolean];
}

export type IpcRequestChannel = keyof IpcRequestMap;
export type IpcEventChannel = keyof IpcEventMap;

/** Every request channel the preload bridge is permitted to forward. */
export const IPC_REQUEST_CHANNELS = [
  'app:get-info',
  'attempt:save-snapshot',
  'attempt:load-snapshot',
  'attempt:clear-snapshot',
  'attempt:list-snapshots',
  'sync:enqueue',
  'sync:drain',
  'sync:acknowledge',
  'environment:report',
  'exam-window:set-locked',
] as const satisfies readonly IpcRequestChannel[];

/** Every event channel the renderer may subscribe to. */
export const IPC_EVENT_CHANNELS = [
  'window:focus-changed',
  'environment:displays-changed',
  'network:status-changed',
] as const satisfies readonly IpcEventChannel[];

/** Unsubscribe handle returned by every `on*` bridge method. */
export type Unsubscribe = () => void;

/**
 * The API surface exposed on `window.codedesk` by the preload script.
 */
export interface CodeDeskBridge {
  getAppInfo(): Promise<AppInfo>;

  attempt: {
    saveSnapshot(snapshot: AttemptSnapshot): Promise<void>;
    loadSnapshot(attemptId: string): Promise<AttemptSnapshot | null>;
    clearSnapshot(attemptId: string): Promise<void>;
    listSnapshots(): Promise<AttemptSnapshot[]>;
  };

  sync: {
    enqueue(envelope: SyncEnvelope): Promise<void>;
    drain(limit?: number): Promise<SyncEnvelope[]>;
    acknowledge(attemptId: string, revision: number): Promise<void>;
  };

  environment: {
    report(): Promise<EnvironmentReport>;
    onDisplaysChanged(listener: (report: EnvironmentReport) => void): Unsubscribe;
  };

  examWindow: {
    setLocked(locked: boolean): Promise<void>;
  };

  onFocusChanged(listener: (focused: boolean) => void): Unsubscribe;
  onNetworkStatusChanged(listener: (online: boolean) => void): Unsubscribe;
}

/**
 * Runtime environment inspection.
 *
 * Supplies the raw signals that the (deferred) proctoring module will consume:
 * connected displays, fullscreen state and a best-effort remote-session check.
 * Gathering them here keeps all `electron`/Node access in the main process.
 *
 * Note on remote-session detection: this is intentionally conservative and
 * heuristic. It reads well-known environment markers only and never claims
 * certainty — treat the result as a signal for human review, not a hard block.
 */

import { BrowserWindow, screen } from 'electron';
import type { DisplayInfo, EnvironmentReport } from '../shared/ipc';

function toDisplayInfo(
  display: Electron.Display,
  primaryId: number,
): DisplayInfo {
  return {
    id: display.id,
    bounds: display.bounds,
    scaleFactor: display.scaleFactor,
    internal: display.internal,
    primary: display.id === primaryId,
  };
}

/** Enumerates connected displays. */
export function listDisplays(): DisplayInfo[] {
  const primaryId = screen.getPrimaryDisplay().id;
  return screen.getAllDisplays().map((d) => toDisplayInfo(d, primaryId));
}

/**
 * Best-effort remote-desktop detection.
 *
 * Windows sets `SESSIONNAME` to an `RDP-*` value inside a Terminal Services
 * session. Linux X11 forwarding and common VNC/NX setups leave their own
 * markers. macOS Screen Sharing is not reliably detectable from a sandboxed
 * process, so it always reports `false` there.
 */
export function detectRemoteSession(): boolean {
  const env = process.env;
  if (process.platform === 'win32') {
    const session = env.SESSIONNAME ?? '';
    return /^rdp-/i.test(session);
  }
  if (process.platform === 'linux') {
    if (env.SSH_CONNECTION || env.SSH_CLIENT) return true;
    // NX, X2Go and several VNC servers advertise themselves this way.
    if (env.NXSESSIONID || env.X2GO_SESSION) return true;
    const display = env.DISPLAY ?? '';
    // VNC servers conventionally occupy display numbers from :1 upward while
    // a local session is usually :0.
    return /^:(?!0\b)\d+/.test(display) && Boolean(env.VNCDESKTOP);
  }
  return false;
}

/** Captures a full environment report for the focused exam window. */
export function buildEnvironmentReport(
  window?: BrowserWindow | null,
): EnvironmentReport {
  const displays = listDisplays();
  const target = window ?? BrowserWindow.getFocusedWindow();
  return {
    displays,
    displayCount: displays.length,
    isFullscreen: target?.isFullScreen() ?? false,
    remoteSession: detectRemoteSession(),
    capturedAt: new Date().toISOString(),
  };
}

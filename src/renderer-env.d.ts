/** Ambient declarations for the renderer process. */

import type { CodeDeskBridge } from './shared/ipc';

declare global {
  interface Window {
    /**
     * Native bridge injected by the preload script. Undefined when the
     * renderer runs outside Electron, e.g. in a browser-based test harness,
     * so always feature-detect before use.
     */
    codedesk?: CodeDeskBridge;
  }
}

export {};

/**
 * Reads build and platform metadata from the main process.
 *
 * Returns `null` outside Electron so the UI can degrade gracefully in a
 * browser-based harness.
 */

import { useEffect, useState } from 'react';
import type { AppInfo } from '../shared/ipc';

export function useAppInfo(): AppInfo | null {
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.codedesk
      ?.getAppInfo()
      .then((value) => {
        if (!cancelled) setInfo(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return info;
}

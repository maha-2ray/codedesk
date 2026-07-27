/**
 * Tracks connectivity.
 *
 * Combines the browser's `online`/`offline` events with the main process's
 * own signal, because the renderer's view of connectivity can lag behind the
 * OS. Either source reporting a change updates the value.
 */

import { useEffect, useState } from 'react';

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = window.codedesk?.onNetworkStatusChanged(setOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe?.();
    };
  }, []);

  return online;
}

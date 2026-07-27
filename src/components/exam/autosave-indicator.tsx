/**
 * Autosave status.
 *
 * Candidates lose confidence when saving is invisible, so every state is
 * shown explicitly — including the offline case, which is phrased as safe
 * rather than as an error because answers are still persisted locally.
 */

import React from 'react';
import { useAttemptStore } from '../../stores/attempt-store';
import { Spinner } from '../ui/primitives';
import { Icon } from '../icons';

export const AutosaveIndicator: React.FC = () => {
  const syncState = useAttemptStore((s) => s.syncState);
  const lastSavedAt = useAttemptStore((s) => s.lastSavedAt);

  const savedLabel = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  const content = (() => {
    switch (syncState) {
      case 'SYNCING':
        return (
          <>
            <Spinner className="size-3.5 text-sky-400" />
            <span className="text-slate-400">Saving…</span>
          </>
        );
      case 'PENDING':
        return (
          <>
            <span className="size-2 rounded-full bg-amber-400" />
            <span className="text-slate-400">Unsaved changes</span>
          </>
        );
      case 'OFFLINE':
        return (
          <>
            <Icon name="wifi-off" className="size-3.5 text-amber-400" />
            <span className="text-amber-300">Offline — saved on this device</span>
          </>
        );
      case 'ERROR':
        return (
          <>
            <span className="size-2 rounded-full bg-red-500" />
            <span className="text-red-300">Save failed — retrying</span>
          </>
        );
      default:
        return (
          <>
            <span className="size-2 rounded-full bg-emerald-400" />
            <span className="text-slate-400">
              {savedLabel ? `Saved ${savedLabel}` : 'All changes saved'}
            </span>
          </>
        );
    }
  })();

  return (
    <div
      className="flex items-center gap-2 text-xs"
      role="status"
      aria-live="polite"
    >
      {content}
    </div>
  );
};

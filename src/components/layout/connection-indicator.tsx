/**
 * Online/offline indicator.
 *
 * Offline is a normal, supported state during an exam rather than an error,
 * so the wording reassures the candidate that answers are still being kept.
 */

import React from 'react';
import { Icon } from '../icons';
import { useOnlineStatus } from '../../hooks/use-online-status';

export const ConnectionIndicator: React.FC = () => {
  const online = useOnlineStatus();

  return (
    <div
      className="flex items-center gap-2 text-sm"
      role="status"
      aria-live="polite"
    >
      <Icon
        name={online ? 'wifi' : 'wifi-off'}
        className={online ? 'size-4 text-emerald-400' : 'size-4 text-amber-400'}
      />
      <span className={online ? 'text-slate-400' : 'text-amber-300'}>
        {online ? 'Connected' : 'Offline — work is saved on this device'}
      </span>
    </div>
  );
};

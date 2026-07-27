/**
 * Countdown against the server-issued deadline.
 *
 * The remaining time is always recomputed from `expiresAt` rather than by
 * decrementing a counter, so the countdown stays correct if the machine
 * sleeps, the tab is throttled, or a tick is missed.
 */

import { useEffect, useMemo, useState } from 'react';

export interface ExamTimer {
  remainingMs: number;
  expired: boolean;
  /** True in the final five minutes, for the visual warning state. */
  critical: boolean;
}

export function useExamTimer(expiresAt: string | null): ExamTimer {
  const deadline = useMemo(
    () => (expiresAt ? new Date(expiresAt).getTime() : null),
    [expiresAt],
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!deadline) {
    return { remainingMs: 0, expired: false, critical: false };
  }

  const remainingMs = Math.max(0, deadline - now);
  return {
    remainingMs,
    expired: remainingMs === 0,
    critical: remainingMs > 0 && remainingMs <= 5 * 60_000,
  };
}

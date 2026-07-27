/** Small shared helpers used across the UI. */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges conditional class names, resolving Tailwind conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Formats a duration in milliseconds as `H:MM:SS` or `MM:SS`. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/** Formats an ISO timestamp for display, e.g. `27 Jul 2026, 09:00`. */
export function formatDateTime(iso: string, locale = 'en-GB'): string {
  return new Date(iso).toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Relative phrasing such as `in 3 days` or `2 hours ago`. */
export function formatRelative(iso: string, locale = 'en-GB'): string {
  const target = new Date(iso).getTime();
  const diffMs = target - Date.now();
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(diffMs) >= size) {
      return formatter.format(Math.round(diffMs / size), unit);
    }
  }
  return formatter.format(Math.round(diffMs / 1000), 'second');
}

/** Initials for an avatar placeholder. */
export function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

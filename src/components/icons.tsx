/**
 * Inline icon set.
 *
 * Hand-rolled rather than pulled from an icon package: the foundation needs
 * only a handful of glyphs, and inlining keeps the bundle small and avoids
 * another dependency in an offline-capable desktop app.
 */

import React from 'react';

export type IconName =
  | 'home'
  | 'clipboard'
  | 'award'
  | 'database'
  | 'check'
  | 'chart'
  | 'eye'
  | 'users'
  | 'building'
  | 'settings'
  | 'logout'
  | 'code'
  | 'wifi'
  | 'wifi-off'
  | 'clock';

const paths: Record<IconName, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5M5.25 9.75V21h13.5V9.75" />,
  clipboard: (
    <>
      <path d="M9 4.5h6a1.5 1.5 0 0 1 1.5 1.5v.75h-9V6A1.5 1.5 0 0 1 9 4.5Z" />
      <path d="M7.5 6.75H6a1.5 1.5 0 0 0-1.5 1.5v11.25A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5V8.25A1.5 1.5 0 0 0 18 6.75h-1.5" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="5.25" />
      <path d="m8.25 13.5-1.5 6.75L12 18l5.25 2.25-1.5-6.75" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="6" rx="7.5" ry="3" />
      <path d="M4.5 6v12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V6M4.5 12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3" />
    </>
  ),
  check: <path d="m4.5 12.75 5.25 5.25L19.5 6.75" />,
  chart: <path d="M4.5 19.5h15M7.5 16.5v-6M12 16.5v-9M16.5 16.5v-4.5" />,
  eye: (
    <>
      <path d="M2.25 12S5.25 5.25 12 5.25 21.75 12 21.75 12 18.75 18.75 12 18.75 2.25 12 2.25 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.25" r="3.75" />
      <path d="M2.25 20.25a6.75 6.75 0 0 1 13.5 0M17.25 20.25a5.25 5.25 0 0 0-3-4.74M16.5 5.03a3.75 3.75 0 0 1 0 6.44" />
    </>
  ),
  building: (
    <>
      <path d="M4.5 21V4.5A1.5 1.5 0 0 1 6 3h9a1.5 1.5 0 0 1 1.5 1.5V21M16.5 10.5H19a1.5 1.5 0 0 1 1.5 1.5v9M3 21h18" />
      <path d="M8.25 7.5h1.5M8.25 11.25h1.5M8.25 15h1.5M12.75 7.5h1.5M12.75 11.25h1.5M12.75 15h1.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </>
  ),
  logout: <path d="M15.75 8.25V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v12A1.5 1.5 0 0 0 6 19.5h8.25a1.5 1.5 0 0 0 1.5-1.5v-2.25M18 15l3-3-3-3M9.75 12h11.25" />,
  code: <path d="m9 8.25-4.5 3.75L9 15.75M15 8.25l4.5 3.75L15 15.75" />,
  wifi: (
    <>
      <path d="M2.25 9a15 15 0 0 1 19.5 0M5.25 12.75a10.5 10.5 0 0 1 13.5 0M8.25 16.5a6 6 0 0 1 7.5 0" />
      <circle cx="12" cy="20.25" r="0.75" fill="currentColor" />
    </>
  ),
  'wifi-off': (
    <>
      <path d="M3 3l18 18M8.25 16.5a6 6 0 0 1 6.32-1.06M5.25 12.75a10.5 10.5 0 0 1 4.2-2.6M2.25 9a15 15 0 0 1 5.1-3.2M14.4 5.1A15 15 0 0 1 21.75 9M16.2 12.1a10.5 10.5 0 0 1 2.55 1.65" />
      <circle cx="12" cy="20.25" r="0.75" fill="currentColor" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.75V12l3.75 2.25" />
    </>
  ),
};

export const Icon: React.FC<{
  name: IconName;
  className?: string;
  title?: string;
}> = ({ name, className = 'size-5', title }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    role={title ? 'img' : undefined}
    aria-hidden={title ? undefined : true}
  >
    {title && <title>{title}</title>}
    {paths[name]}
  </svg>
);

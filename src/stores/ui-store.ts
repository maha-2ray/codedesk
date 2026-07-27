/**
 * UI preferences.
 *
 * Persisted to `localStorage` because these settings are per-machine comfort
 * choices, not exam data. Accessibility settings live here so they survive a
 * restart mid-session — a candidate who needs a large high-contrast interface
 * should not have to reconfigure it after a crash.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface UiState {
  theme: ThemeMode;
  /** Editor font size in pixels. */
  editorFontSize: number;
  /** Scales the interface for readability. */
  uiScale: number;
  highContrast: boolean;
  /** Suppresses non-essential animation. */
  reducedMotion: boolean;
  sidebarCollapsed: boolean;

  setTheme(theme: ThemeMode): void;
  setEditorFontSize(size: number): void;
  setUiScale(scale: number): void;
  toggleHighContrast(): void;
  toggleReducedMotion(): void;
  toggleSidebar(): void;
}

export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 28;

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'dark',
      editorFontSize: 14,
      uiScale: 1,
      highContrast: false,
      reducedMotion: false,
      sidebarCollapsed: false,

      setTheme: (theme) => set({ theme }),
      setEditorFontSize: (size) =>
        set({
          editorFontSize: Math.max(MIN_FONT_SIZE, Math.min(size, MAX_FONT_SIZE)),
        }),
      setUiScale: (scale) => set({ uiScale: Math.max(0.8, Math.min(scale, 1.6)) }),
      toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
      toggleReducedMotion: () => set((s) => ({ reducedMotion: !s.reducedMotion })),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: 'codedesk-ui-preferences' },
  ),
);

/** Resolves `system` to a concrete theme using the OS preference. */
export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode;
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

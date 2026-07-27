/**
 * Settings, covering the accessibility requirements from the PRD.
 */

import React from 'react';
import {
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  useUiStore,
  type ThemeMode,
} from '../stores/ui-store';
import { useAppInfo } from '../hooks/use-app-info';
import { Card, PageHeader } from '../components/ui/primitives';
import { USING_MOCK_API } from '../api';

const Row: React.FC<{
  label: string;
  description?: string;
  children: React.ReactNode;
  htmlFor?: string;
}> = ({ label, description, children, htmlFor }) => (
  <div className="flex items-center justify-between gap-6 py-4">
    <div className="min-w-0">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-slate-100"
      >
        {label}
      </label>
      {description && (
        <p className="mt-0.5 text-sm text-slate-400">{description}</p>
      )}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const Toggle: React.FC<{
  id: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}> = ({ id, checked, onChange, label }) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    className={`relative h-6 w-11 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
      checked ? 'bg-sky-600' : 'bg-slate-700'
    }`}
  >
    <span
      className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-0.5'
      }`}
    />
  </button>
);

export const SettingsScreen: React.FC = () => {
  const {
    theme,
    editorFontSize,
    uiScale,
    highContrast,
    reducedMotion,
    setTheme,
    setEditorFontSize,
    setUiScale,
    toggleHighContrast,
    toggleReducedMotion,
  } = useUiStore();
  const appInfo = useAppInfo();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Settings"
        description="Preferences are stored on this device."
      />

      <Card className="mb-6 divide-y divide-slate-800 py-0">
        <Row label="Theme" htmlFor="theme-select">
          <select
            id="theme-select"
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeMode)}
            className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus:outline focus:outline-2 focus:outline-sky-500"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">Match system</option>
          </select>
        </Row>

        <Row
          label="Editor font size"
          description={`${editorFontSize}px`}
          htmlFor="font-size"
        >
          <input
            id="font-size"
            type="range"
            min={MIN_FONT_SIZE}
            max={MAX_FONT_SIZE}
            value={editorFontSize}
            onChange={(e) => setEditorFontSize(Number(e.target.value))}
            className="w-48 accent-sky-500"
          />
        </Row>

        <Row
          label="Interface scale"
          description={`${Math.round(uiScale * 100)}%`}
          htmlFor="ui-scale"
        >
          <input
            id="ui-scale"
            type="range"
            min={0.8}
            max={1.6}
            step={0.1}
            value={uiScale}
            onChange={(e) => setUiScale(Number(e.target.value))}
            className="w-48 accent-sky-500"
          />
        </Row>

        <Row
          label="High contrast"
          description="Increases contrast for improved legibility."
        >
          <Toggle
            id="high-contrast"
            checked={highContrast}
            onChange={toggleHighContrast}
            label="High contrast"
          />
        </Row>

        <Row
          label="Reduce motion"
          description="Suppresses non-essential animation."
        >
          <Toggle
            id="reduced-motion"
            checked={reducedMotion}
            onChange={toggleReducedMotion}
            label="Reduce motion"
          />
        </Row>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          About
        </h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-slate-400">Version</dt>
          <dd className="text-slate-200">{appInfo?.version ?? '—'}</dd>
          <dt className="text-slate-400">Electron</dt>
          <dd className="text-slate-200">{appInfo?.electronVersion ?? '—'}</dd>
          <dt className="text-slate-400">Platform</dt>
          <dd className="text-slate-200">
            {appInfo ? `${appInfo.platform} (${appInfo.arch})` : '—'}
          </dd>
          <dt className="text-slate-400">Backend</dt>
          <dd className="text-slate-200">
            {USING_MOCK_API ? 'Mock (in-memory)' : 'Remote'}
          </dd>
        </dl>
      </Card>
    </div>
  );
};

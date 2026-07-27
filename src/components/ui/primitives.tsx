/**
 * Minimal UI primitives.
 *
 * Deliberately small and dependency-free: enough to build the foundation
 * screens consistently without committing to a component library before the
 * design language is settled.
 */

import React from 'react';
import { cn } from '../../lib/utils';

/* ---------- Button ---------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-sky-600 text-white hover:bg-sky-500 focus-visible:outline-sky-400 disabled:bg-sky-900 disabled:text-slate-400',
  secondary:
    'bg-slate-800 text-slate-100 hover:bg-slate-700 focus-visible:outline-slate-500 border border-slate-700',
  ghost:
    'bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline-slate-500',
  danger:
    'bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-400 disabled:bg-red-900',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}) => (
  <button
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-60',
      buttonVariants[variant],
      buttonSizes[size],
      className,
    )}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...props}
  >
    {loading && <Spinner className="size-4" />}
    {children}
  </button>
);

/* ---------- Spinner ---------- */

export const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn('animate-spin', className)}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    />
  </svg>
);

/* ---------- Input ---------- */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  className,
  id,
  ...props
}) => {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-200">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        className={cn(
          'h-10 rounded-md border bg-slate-900 px-3 text-sm text-slate-100',
          'placeholder:text-slate-500',
          'focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-sky-500',
          error ? 'border-red-500' : 'border-slate-700',
          className,
        )}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="text-sm text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
};

/* ---------- Card ---------- */

export const Card: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { as?: 'div' | 'section' | 'article' }
> = ({ className, as: Tag = 'div', ...props }) => (
  <Tag
    className={cn(
      'rounded-lg border border-slate-800 bg-slate-900/60 p-5 shadow-sm',
      className,
    )}
    {...props}
  />
);

/* ---------- Badge ---------- */

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-slate-800 text-slate-300 border-slate-700',
  success: 'bg-emerald-950 text-emerald-300 border-emerald-800',
  warning: 'bg-amber-950 text-amber-300 border-amber-800',
  danger: 'bg-red-950 text-red-300 border-red-800',
  info: 'bg-sky-950 text-sky-300 border-sky-800',
};

export const Badge: React.FC<
  React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }
> = ({ tone = 'neutral', className, ...props }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
      badgeTones[tone],
      className,
    )}
    {...props}
  />
);

/* ---------- Empty state ---------- */

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-800 px-6 py-14 text-center">
    <h3 className="text-base font-medium text-slate-200">{title}</h3>
    {description && (
      <p className="max-w-md text-sm text-slate-400">{description}</p>
    )}
    {action}
  </div>
);

/* ---------- Page header ---------- */

export const PageHeader: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
}> = ({ title, description, actions }) => (
  <header className="mb-6 flex items-start justify-between gap-4">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
      {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </header>
);

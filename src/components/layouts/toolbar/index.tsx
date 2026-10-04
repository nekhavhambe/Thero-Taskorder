import type { ButtonHTMLAttributes, FC, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

/** Event fired by the Layout toolbar so the active page can handle actions. */
export const TOOLBAR_ACTION_EVENT = 'toolbar:action';

export type ToolbarAction = 'new' | 'generate' | 'issue';

export interface ToolbarActionDetail {
  action: ToolbarAction;
  /** Lets a handler keep the toolbar button in loading state until async work finishes. */
  waitUntil: (promise: Promise<unknown>) => void;
}

/**
 * Fires a toolbar action and resolves once every handler's registered
 * `waitUntil` promise settles — drive button loading states from this.
 */
export function fireToolbarAction(action: ToolbarAction): Promise<void> {
  const pending: Promise<unknown>[] = [];
  window.dispatchEvent(
    new CustomEvent<ToolbarActionDetail>(TOOLBAR_ACTION_EVENT, {
      detail: { action, waitUntil: (promise) => pending.push(promise) },
    }),
  );
  return Promise.allSettled(pending).then(() => undefined);
}

export interface ToolbarProps {
  /** Left-side action buttons. */
  children?: ReactNode;
  /** Right-side content (e.g. a status pill). */
  aside?: ReactNode;
  className?: string;
}

/**
 * Page action toolbar: actions left, optional status/content right.
 */
export const Toolbar: FC<ToolbarProps> = ({ children, aside, className = '' }) => {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 py-2 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {aside && <div className="flex items-center">{aside}</div>}
    </div>
  );
};

export interface ToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant: blue filled or grey filled. No borders. */
  variant?: 'blue' | 'grey';
  /** Shows a spinner and disables the button until the action completes. */
  loading?: boolean;
}

export const ToolbarButton: FC<ToolbarButtonProps> = ({
  variant = 'grey',
  type = 'button',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}) => {
  const variants: Record<string, string> = {
    blue: 'bg-blue-700 hover:bg-blue-800 text-white font-semibold',
    grey: 'bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium',
  };
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`px-3 py-1.5 text-xs rounded flex items-center gap-1.5 ${variants[variant]} ${className} ${
        loading ? 'opacity-70 cursor-wait' : ''
      }`}
      {...rest}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
};

export interface StatusChipProps {
  status: 'under' | 'over';
  label?: string;
}

/** Non-interactive status indicator — display only, no toggle. */
export const StatusChip: FC<StatusChipProps> = ({ status, label }) => {
  const isOver = status === 'over';
  const text = label ?? (isOver ? 'Over' : 'Active');
  return (
    <span
      className={`px-3 py-1 text-xs font-semibold whitespace-nowrap rounded-full text-white ${
        isOver ? 'bg-red-600' : 'bg-green-600'
      }`}
    >
      {text}
    </span>
  );
};

export interface StatusPillProps {
  options: string[];
  active: string;
  onSelect?: (option: string) => void;
}

export const StatusPill: FC<StatusPillProps> = ({ options, active, onSelect }) => {
  return (
    <div className="flex items-center rounded-sm bg-white overflow-hidden">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect?.(option)}
          className={`px-2.5 py-1 text-xs whitespace-nowrap transition-colors ${
            option === active
              ? option.toLowerCase() === 'over'
                ? 'bg-red-600 font-semibold text-white'
                : 'bg-green-600 font-semibold text-white'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

export default Toolbar;

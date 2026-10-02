import type { ButtonHTMLAttributes, FC, ReactNode } from 'react';

/** Event fired by the Layout toolbar so the active page can handle actions. */
export const TOOLBAR_ACTION_EVENT = 'toolbar:action';

export type ToolbarAction = 'new' | 'generate' | 'issue';

export function fireToolbarAction(action: ToolbarAction): void {
  window.dispatchEvent(new CustomEvent(TOOLBAR_ACTION_EVENT, { detail: action }));
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
}

export const ToolbarButton: FC<ToolbarButtonProps> = ({
  variant = 'grey',
  type = 'button',
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
      className={`px-3 py-1.5 text-xs rounded flex items-center gap-1.5 ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
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

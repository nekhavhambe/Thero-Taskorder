import type { FC, ReactNode } from 'react';
import { Label } from '../label';

export interface FieldProps {
  label: string;
  htmlFor?: string;
  tooltip?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  error?: string;
  helpText?: string;
  labelWidth?: string;
  orientation?: 'responsive' | 'row';
}


export const Field: FC<FieldProps> = ({
  label,
  htmlFor,
  tooltip,
  required = false,
  children,
  className = '',
  error,
  helpText,
  labelWidth = 'w-36 sm:w-44',
  orientation = 'responsive',
}) => {
  const direction =
    orientation === 'row' ? 'flex-row items-center' : 'flex-col sm:flex-row sm:items-center';
  return (
    <div className={`flex ${direction} py-1.5 sm:py-2 min-h-9.5 ${className}`}>
      <div className={`${labelWidth} shrink-0 pr-3 mb-1 sm:mb-0`}>
        <Label
          label={label}
          htmlFor={htmlFor}
          tooltip={tooltip}
          required={required}
        />
      </div>
      <div className="flex-1 min-w-0 relative">
        {children}
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        {helpText && !error && <p className="text-[11px] text-slate-500 mt-0.5">{helpText}</p>}
      </div>
    </div>
  );
};

export default Field;

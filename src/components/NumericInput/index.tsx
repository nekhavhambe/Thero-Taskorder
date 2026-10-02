import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { X } from 'lucide-react';

export interface NumericInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: number | '' | null;
  onChange: (value: number | null) => void;
  variant?: 'underline' | 'outline';
  clearable?: boolean;
  onClear?: () => void;
  hasError?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Numeric-only input (no ERP prefix).
 * Emits `number | null` instead of a string event.
 */
export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      id,
      name,
      value,
      onChange,
      placeholder,
      variant = 'underline',
      clearable = false,
      onClear,
      hasError = false,
      disabled = false,
      className = '',
      min,
      max,
      step,
      ...rest
    },
    ref
  ) => {
    const baseStyles = 'w-full text-sm text-slate-800 transition-all duration-150 py-1.5 focus:outline-none';
    const variantStyles =
      variant === 'underline'
        ? `bg-transparent border-b ${
            hasError
              ? 'border-red-500 focus:border-red-600'
              : 'border-slate-300 hover:border-slate-400 focus:border-[#008784]'
          } rounded-none px-0.5`
        : `bg-white border ${
            hasError
              ? 'border-red-400 focus:ring-1 focus:ring-red-500'
              : 'border-slate-200 hover:border-slate-300 focus:border-[#008784] focus:ring-1 focus:ring-[#008784]'
          } rounded px-2.5 shadow-xs`;

    const stringValue = value === null || value === '' ? '' : String(value);
    const showClear = clearable && stringValue !== '' && !disabled;

    return (
      <div className="relative flex items-center w-full group">
        <input
          ref={ref}
          id={id}
          name={name}
          type="number"
          inputMode="decimal"
          value={stringValue}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              onChange(null);
              return;
            }
            const parsed = Number(raw);
            onChange(Number.isNaN(parsed) ? null : parsed);
          }}
          className={`${baseStyles} ${variantStyles} ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          } ${className} placeholder:text-slate-400 placeholder:font-normal`}
          {...rest}
        />
        {showClear && (
          <button
            type="button"
            onClick={() => {
              onClear?.();
              onChange(null);
            }}
            className="text-slate-400 hover:text-slate-600 p-0.5 ml-1 rounded-full focus:outline-none"
            title="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }
);
NumericInput.displayName = 'NumericInput';

export default NumericInput;

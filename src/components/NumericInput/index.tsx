import { forwardRef, useState } from 'react';
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

/** Digits with an optional leading minus and a single decimal point (allows intermediate states like '12.'). */
const NUMERIC_PATTERN = /^-?\d*\.?\d*$/;
const INCOMPLETE_PATTERN = /^(-|\.|-?\.)$/;

/**
 * Numeric-only input rendered as type="text" (no native spinners).
 * Validates on change: complete numbers emit `number`, empty emits `null`,
 * anything else is shown but reverts on blur.
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
      onBlur,
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

    // Local draft preserves intermediate typing ('12.') that props alone would collapse.
    const [draft, setDraft] = useState<string | null>(null);
    const displayValue = draft ?? stringValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === '') {
        setDraft(null);
        onChange(null);
        return;
      }
      if (!NUMERIC_PATTERN.test(raw) || INCOMPLETE_PATTERN.test(raw)) {
        // Invalid: show it but don't emit; blur snaps back to the last valid value.
        setDraft(raw);
        return;
      }
      setDraft(raw);
      onChange(Number(raw));
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setDraft(null);
      onBlur?.(e);
    };

    return (
      <div className="relative flex items-center w-full group">
        <input
          ref={ref}
          id={id}
          name={name}
          type="text"
          inputMode="decimal"
          value={displayValue}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          placeholder={placeholder}
          onChange={handleChange}
          onBlur={handleBlur}
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

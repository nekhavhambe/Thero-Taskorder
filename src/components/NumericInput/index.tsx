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
  /**
   * When true, the blurred display is masked with thousand separators and
   * exactly 2 decimals (1760 -> '1,760.00', 0.2 -> '0.20'). Editing is raw.
   */
  mask?: boolean;
  /**
   * When true, nothing is emitted while typing — the parsed value commits on
   * blur only. Keeps parents from re-rendering (and stealing focus) mid-type.
   */
  commitOnBlur?: boolean;
}

/** Digits with an optional leading minus and a single decimal point (allows intermediate states like '12.'). */
const NUMERIC_PATTERN = /^-?\d*\.?\d*$/;
const INCOMPLETE_PATTERN = /^(-|\.|-?\.)$/;

const parseValid = (raw: string): number | null | undefined => {
  if (raw === '') return null;
  if (!NUMERIC_PATTERN.test(raw) || INCOMPLETE_PATTERN.test(raw)) return undefined;
  return Number(raw);
};

export const formatMasked = (value: number | '' | null): string => {
  if (value === null || value === '') return '';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

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
      mask = false,
      commitOnBlur = false,
      onBlur,
      onFocus,
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

    // Editing session: raw draft while focused, masked/committed value when blurred.
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const displayValue = editing ? draft : mask ? formatMasked(value) : stringValue;

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setDraft(stringValue);
      setEditing(true);
      onFocus?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const parsed = parseValid(raw);
      if (parsed === undefined) {
        // Invalid: show it but never emit; blur snaps back to the last valid value.
        setDraft(raw);
        return;
      }
      setDraft(raw);
      if (!commitOnBlur) onChange(parsed);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (!commitOnBlur) {
        setEditing(false);
      } else {
        const parsed = parseValid(draft);
        setEditing(false);
        if (parsed !== undefined) onChange(parsed);
      }
      onBlur?.(e);
    };

    const handleClear = () => {
      onClear?.();
      setDraft('');
      setEditing(false);
      onChange(null);
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
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`${baseStyles} ${variantStyles} ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          } ${className} placeholder:text-slate-400 placeholder:font-normal`}
          {...rest}
        />
        {showClear && (
          <button
            type="button"
            onClick={handleClear}
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

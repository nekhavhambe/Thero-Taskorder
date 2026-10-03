import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { X } from 'lucide-react';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'underline' | 'outline' | 'ghost';
  clearable?: boolean;
  onClear?: () => void;
  hasError?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
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
        : variant === 'ghost'
        ? `bg-transparent border-b ${
            hasError
              ? 'border-red-500 focus:border-red-600'
              : 'border-transparent hover:border-slate-300 focus:border-[#008784]'
          } rounded-none px-0.5`
        : `bg-white border ${
            hasError
              ? 'border-red-400 focus:ring-1 focus:ring-red-500'
              : 'border-slate-200 hover:border-slate-300 focus:border-[#008784] focus:ring-1 focus:ring-[#008784]'
          } rounded px-2.5 shadow-xs`;

    return (
      <div className="relative flex items-center w-full group">
        <input
          ref={ref}
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`${baseStyles} ${variantStyles} ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          } ${className} placeholder:text-slate-400 placeholder:font-normal`}
          {...rest}
        />
        {clearable && value && !disabled && (
          <button
            type="button"
            onClick={onClear}
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
TextInput.displayName = 'TextInput';

export default TextInput;

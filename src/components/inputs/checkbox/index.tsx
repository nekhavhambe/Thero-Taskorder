import type { FC } from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps {
  id?: string;
  name?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
}

export const Checkbox: FC<CheckboxProps> = ({
  id,
  name,
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  hasError = false,
}) => {
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-2 select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
    >
      <div className="relative flex items-center justify-center">
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-[17px] h-[17px] rounded-[3px] border transition-all duration-150 flex items-center justify-center ${
            checked
              ? 'bg-[#008784] border-[#008784] text-white'
              : hasError
              ? 'border-red-400 bg-white'
              : 'border-slate-400 bg-white hover:border-slate-600'
          } ${disabled ? 'bg-slate-100' : ''}`}
        >
          {checked && <Check className="w-3.5 h-3.5 stroke-[2.5] text-white" />}
        </div>
      </div>
      {label && <span className="text-sm font-medium text-slate-800">{label}</span>}
    </label>
  );
};

export default Checkbox;

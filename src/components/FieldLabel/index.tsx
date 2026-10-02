import type { FC } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

export interface FieldLabelProps {
  label: string;
  htmlFor?: string;
  tooltip?: string;
  required?: boolean;
  className?: string;
}

/**
 * Label + cyan (?) help tooltip.
 * Primary name is `FieldLabel` (no ERP prefix).
 */
export const FieldLabel: FC<FieldLabelProps> = ({
  label,
  htmlFor,
  tooltip,
  required = false,
  className = '',
}) => {
  return (
    <label
      htmlFor={htmlFor}
      className={`inline-flex items-center text-sm font-semibold text-slate-800 tracking-tight select-none ${className}`}
    >
      <span>{label}</span>
      {required && <span className="text-red-500 ml-0.5 text-xs">*</span>}

      {tooltip && (
        <Tooltip.Provider delayDuration={150}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                aria-label={`Help explanation for ${label}`}
                className="text-[#008784] hover:text-[#005f5d] font-bold text-xs select-none leading-none px-1 ml-0.5 focus:outline-none focus:ring-1 focus:ring-[#008784] rounded cursor-pointer"
              >
                ?
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="top"
                sideOffset={6}
                className="z-50 px-2.5 py-1.5 text-xs text-white bg-slate-900 rounded shadow-lg whitespace-normal min-w-[180px] max-w-[280px] animate-in fade-in zoom-in-95 duration-150"
              >
                {tooltip}
                <Tooltip.Arrow className="fill-slate-900" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      )}
    </label>
  );
};

// Backwards-compatible aliases (old names)
export const FieldLabelWithTooltip = FieldLabel;
export type FieldLabelWithTooltipProps = FieldLabelProps;

export default FieldLabel;

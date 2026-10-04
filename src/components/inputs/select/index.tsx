import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { formatDisplayFields, useCollectionItems } from '../../../collections/helpers';
import type { AnyCollection } from '../../../collections/helpers';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface SelectProps<T extends object = Record<string, unknown>> {
  id?: string;
  /** Form field name — picked up by native form submission (FormData). */
  name?: string;
  value: string;
  onChange: (value: string) => void;
  /** Static options (use this OR collection, not both). */
  options?: SelectOption[];
  /** TanStack collection to list — swap for any backend (localStorage, query, sync). */
  collection?: AnyCollection;
  /** Collection fields shown to the user, joined with '--', e.g. ['id','name']. */
  displayFields?: string[];
  /** Unique key of a collection row (defaults to row.id). */
  getKey?: (item: T) => string;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
}

function SelectInner<T extends object>({
  id,
  name,
  value,
  onChange,
  options,
  collection,
  displayFields = ['label'],
  getKey = (item: T) => {
    const record = item as Record<string, unknown>;
    return String(record.id ?? record.value ?? '');
  },
  placeholder = 'Select...',
  disabled = false,
  hasError = false,
  className = '',
}: SelectProps<T>) {
  const collectionItems = useCollectionItems<T>(collection as AnyCollection);

  // Collection mode derives options from live rows: '1000--Deco Addict'.
  const resolved: SelectOption[] =
    collection != null
      ? collectionItems.map((item) => ({
          value: getKey(item),
          label: formatDisplayFields(item, displayFields),
        }))
      : options ?? [];

  return (
    <div className={`relative w-full ${className}`}>
      <RadixSelect.Root
        value={value || undefined}
        onValueChange={onChange}
        disabled={disabled}
      >
        <RadixSelect.Trigger
          id={id}
          className={`w-full flex items-center justify-between text-left text-sm font-medium text-slate-900 border-b py-1.5 px-0.5 focus:outline-none transition-colors data-[state=open]:border-[#008784] [&_[data-placeholder]]:text-slate-400 [&_[data-placeholder]]:font-normal ${
            hasError
              ? 'border-red-500 data-[state=open]:border-red-600'
              : 'border-slate-300 hover:border-slate-400 focus:border-[#008784]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon asChild>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            sideOffset={4}
            position="popper"
            className="z-50 w-[var(--radix-select-trigger-width)] min-w-[200px] bg-white border border-slate-200 rounded shadow-lg max-h-56 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          >
            <RadixSelect.Viewport className="py-1">
              {resolved.map((opt) => (
                <RadixSelect.Item
                  key={opt.value}
                  value={opt.value}
                  className="relative px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:bg-[#008784]/10 focus:text-slate-900 outline-none cursor-pointer flex items-center justify-between select-none data-[state=checked]:font-semibold data-[state=checked]:text-[#008784]"
                >
                  <div className="truncate pr-4">
                    <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                    {opt.description && (
                      <div className="text-xs text-slate-500 truncate font-normal">
                        {opt.description}
                      </div>
                    )}
                  </div>
                  <RadixSelect.ItemIndicator>
                    <Check className="w-4 h-4 text-[#008784] shrink-0" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {/* Hidden input guarantees the value is in FormData (single source). */}
      {name && (
        <input type="hidden" name={name} value={value ?? ''} disabled={disabled} />
      )}
    </div>
  );
}

// Generic function preserves <Select<Vendor> usage in JSX.
export function Select<T extends object = Record<string, unknown>>(
  props: SelectProps<T>
) {
  return SelectInner(props);
}

export default Select;

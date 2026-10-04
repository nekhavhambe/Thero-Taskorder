import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import { formatDisplayFields, useCollectionItems } from '../../../collections/helpers';
import type { AnyCollection } from '../../../collections/helpers';

export interface AutocompleteProps<T extends object = Record<string, unknown>> {
  id?: string;
  /** Form field name — submitted value is the selected row key (hidden input). */
  name?: string;
  /** TanStack collection to search — swap for any backend (localStorage, query, sync). */
  collection: AnyCollection;
  /** Fields shown to the user, concatenated with '--', e.g. ['id','name'] → '1000--Deco Addict'. */
  displayFields: string[];
  /** Unique key of a row (defaults to row.id). Submitted on form submit. */
  getKey?: (item: T) => string;
  /** Fields searched while typing (defaults to displayFields). */
  searchFields?: string[];
  /** Selected row key (or null). */
  value: string | null;
  onChange: (key: string | null, item: T | null) => void;
  /** Creates a new collection row from the typed text; result is auto-selected. */
  onCreate?: (name: string) => T;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
}

function AutocompleteInner<T extends object>({
  id,
  name,
  collection,
  displayFields,
  getKey = (item: T) => String((item as Record<string, unknown>).id ?? ''),
  searchFields = displayFields,
  value,
  onChange,
  onCreate,
  placeholder = 'Type to search...',
  disabled = false,
  hasError = false,
  className = '',
}: AutocompleteProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useCollectionItems<T>(collection);
  const selected = useMemo(() => {
    if (value == null || value === '') return null;
    // Primary match on the submitted key (e.g. Intacct RECORDNO), with
    // fallbacks to `id` / `recordNo` (and raw `TASKID` / `RECORDNO`) so
    // legacy key values still resolve after the collection syncs RECORDNOs
    // in — and to `name` / `NAME` so values stored as display names
    // (e.g. rows created by the old select dropdown or imports)
    // resolve to the fetched row.
    const needle = value.trim().toLowerCase();
    return (
      items.find((item) => getKey(item) === value) ??
      items.find((item) => {
        const record = item as Record<string, unknown>;
        return (
          String(record.id ?? '') === value ||
          String(record.recordNo ?? '') === value ||
          String(record.RECORDNO ?? '') === value ||
          String(record.TASKID ?? '') === value
        );
      }) ??
      items.find((item) => {
        const record = item as Record<string, unknown>;
        return (
          String(record.name ?? '').trim().toLowerCase() === needle ||
          String(record.NAME ?? '').trim().toLowerCase() === needle ||
          String(record.id ?? '').trim().toLowerCase() === needle ||
          String(record.TASKID ?? '').trim().toLowerCase() === needle
        );
      }) ??
      null
    );
  }, [items, value, getKey]);

  const filtered = items.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    const record = item as Record<string, unknown>;
    return searchFields.some((field) =>
      String(record[field] ?? '').toLowerCase().includes(q)
    );
  });

  const actionableCount = filtered.length + (query.trim() && onCreate ? 1 : 0);

  const handleSelect = (item: T) => {
    onChange(getKey(item), item);
    setQuery('');
    setIsOpen(false);
  };

  const handleCreate = () => {
    if (!onCreate || !query.trim()) return;
    const item = onCreate(query.trim());
    setQuery('');
    setIsOpen(false);
    onChange(getKey(item), item);
  };

  const handleClear = (e: MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
    setQuery('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setIsOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(actionableCount, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(
        (prev) => (prev - 1 + Math.max(actionableCount, 1)) % Math.max(actionableCount, 1)
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex < filtered.length) {
        handleSelect(filtered[highlightedIndex]);
      } else {
        handleCreate();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <Popover.Root open={isOpen && !disabled} onOpenChange={setIsOpen}>
      <div className={`relative w-full ${className}`}>
        {/* Hidden input so native form submission (FormData) picks up the selected key. */}
        {name && (
          <input type="hidden" name={name} value={value ?? ''} disabled={disabled} />
        )}
        <Popover.Anchor asChild>
          <div
            className={`flex items-center w-full min-h-[34px] border-b ${
              hasError
                ? 'border-red-500'
                : isOpen
                ? 'border-[#008784]'
                : 'border-slate-300 hover:border-slate-400'
            } transition-colors bg-transparent ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`}
            onClick={() => {
              if (!disabled) {
                setIsOpen(true);
                inputRef.current?.focus();
              }
            }}
          >
            {selected ? (
              <div className="flex items-center justify-between w-full py-1 text-sm">
                <span className="font-medium text-slate-900 truncate">
                  {formatDisplayFields(selected, displayFields)}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-slate-400 hover:text-slate-600 p-0.5 ml-2 rounded"
                    title="Remove selection"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center w-full">
                <input
                  ref={inputRef}
                  id={id}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setIsOpen(true);
                    setHighlightedIndex(0);
                  }}
                  onFocus={() => setIsOpen(true)}
                  onKeyDown={handleKeyDown}
                  disabled={disabled}
                  placeholder={placeholder}
                  className="w-full text-sm font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal bg-transparent py-1.5 focus:outline-none"
                />
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ml-1 ${
                    isOpen ? 'rotate-180 text-[#008784]' : ''
                  }`}
                />
              </div>
            )}
          </div>
        </Popover.Anchor>

        <Popover.Portal>
          <Popover.Content
            sideOffset={4}
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="z-50 w-[var(--radix-popover-trigger-width)] min-w-[280px] bg-white border border-slate-200 rounded shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
          >
            {filtered.length > 0 ? (
              <ul className="py-1 text-sm divide-y divide-slate-100">
                {filtered.map((item, idx) => {
                  const key = getKey(item);
                  return (
                    <li
                      key={key}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => handleSelect(item)}
                      className={`px-3 py-2 cursor-pointer flex items-center justify-between ${
                        highlightedIndex === idx ? 'bg-[#008784]/10 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-medium truncate">
                        {formatDisplayFields(item, displayFields)}
                      </span>
                      {value === key && <Check className="w-4 h-4 text-[#008784] shrink-0 ml-2" />}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-3 text-xs text-slate-500 text-center">
                No matches found for &ldquo;{query}&rdquo;
              </div>
            )}

            {query.trim().length > 0 && onCreate && (
              <div className="border-t border-slate-100 bg-slate-50 p-1.5">
                <button
                  type="button"
                  onClick={handleCreate}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-[#008784] hover:bg-white rounded font-medium flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create &ldquo;<strong>{query.trim()}</strong>&rdquo;</span>
                </button>
              </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </div>
    </Popover.Root>
  );
}

// Generic function preserves <Autocomplete<Vendor> usage in JSX.
export function Autocomplete<T extends object = Record<string, unknown>>(
  props: AutocompleteProps<T>
) {
  return AutocompleteInner(props);
}

export default Autocomplete;

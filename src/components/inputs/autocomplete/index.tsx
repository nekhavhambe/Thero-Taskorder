import { useEffect, useMemo, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronDown } from 'lucide-react';
import { useLiveQuery } from '@tanstack/react-db';
import type { InitialQueryBuilder } from '@tanstack/react-db';
import { formatDisplayFields } from '../../../collections/helpers';
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
  placeholder?: string;
  disabled?: boolean;
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
  placeholder = 'Type to search...',
  disabled = false,
  className = '',
}: AutocompleteProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusedRef = useRef(false);
  const revertOnCloseRef = useRef(false);
  // Set on every explicit commit (click / Enter / Tab / outside-click).
  // The deferred blur-commit must not re-fire afterwards with stale state —
  // that second onChange could overwrite the just-picked value (or clear it).
  // Cleared as soon as the user edits the text again.
  const committedDisplayRef = useRef<string | null>(null);

  const { data } = useLiveQuery((q: InitialQueryBuilder) =>
    q.from({ c: collection }).select(({ c }) => c),
  );

  const items = useMemo(() => {
    const rows = (data ?? []) as Array<
      T | { row?: T | null } | undefined | null
    >;
    return rows.flatMap((r) => {
      if (r == null) return [];
      if (
        typeof r === 'object' &&
        'row' in r &&
        (r as { row?: unknown }).row != null
      ) {
        return [(r as { row: T }).row];
      }
      return [r as T];
    });
  }, [data]);

  const selected = useMemo(() => {
    if (value == null || value === '') return null;

    const needle = value.trim().toLowerCase();
    return (
      items.find((item) => getKey(item) === value) ??
      items.find((item) => {
        const record = item as Record<string, unknown>;
        return (
          String(record.id ?? '') === value ||
          String(record.recordNo ?? '') === value ||
          String(record.RECORDNO ?? '') === value ||
          String(record.STANDARDTASKID ?? '') === value
        );
      }) ??
      items.find((item) => {
        const record = item as Record<string, unknown>;
        return (
          String(record.name ?? '').trim().toLowerCase() === needle ||
          String(record.NAME ?? '').trim().toLowerCase() === needle ||
          String(record.id ?? '').trim().toLowerCase() === needle ||
          String(record.STANDARDTASKID ?? '').trim().toLowerCase() === needle
        );
      }) ??
      null
    );
  }, [items, value, getKey]);

  const selectedDisplay = useMemo(
    () => (selected ? formatDisplayFields(selected, displayFields) : ''),
    [selected, displayFields],
  );

  // Keep the textbox in sync with the external value while the user is not
  // actively editing (initial mount, async collection load, form reset, ...).
  useEffect(() => {
    if (!focusedRef.current) {
      setInputValue(selectedDisplay);
    }
  }, [selectedDisplay]);

  // Showing the untouched selection text → present the full list so the user
  // can pick something else. Once they edit a character, filter by the text.
  const isShowingSelection = selectedDisplay !== '' && inputValue === selectedDisplay;
  const effectiveQuery = isShowingSelection ? '' : inputValue;

  const filtered = useMemo(() => {
    const raw = effectiveQuery.toLowerCase().trim();
    if (!raw) return items;
    // Split on whitespace/dashes so partial edits of "ID--Name" display
    // strings (e.g. deleting the ID half) still match the remainder.
    const tokens = raw.split(/[\s–—-]+/).filter(Boolean);
    return items.filter((item) => {
      const record = item as Record<string, unknown>;
      const haystacks = [
        formatDisplayFields(item, displayFields).toLowerCase(),
        ...searchFields.map((field) =>
          String(record[field] ?? '').toLowerCase(),
        ),
      ];
      return tokens.every((token) =>
        haystacks.some((hay) => hay.includes(token)),
      );
    });
  }, [items, effectiveQuery, displayFields, searchFields]);

  // Keep keyboard highlight inside the list as results shrink/grow.
  useEffect(() => {
    setHighlightedIndex((prev) => {
      if (filtered.length === 0) return 0;
      return Math.min(prev, filtered.length - 1);
    });
  }, [filtered.length]);

  const actionableCount = filtered.length;

  const commitSelection = (item: T) => {
    revertOnCloseRef.current = false;
    const display = formatDisplayFields(item, displayFields);
    committedDisplayRef.current = display;
    onChange(getKey(item), item);
    setInputValue(display);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  /** True when the textbox still shows freshly-committed text (nothing edited since). */
  const hasUnconsumedCommit = () =>
    committedDisplayRef.current != null &&
    inputRef.current?.value === committedDisplayRef.current;

  /** Default to the first match when the user typed ≥1 char but never picked. */
  const commitDefault = () => {
    if (disabled) return;
    const typed = inputValue.trim();
    if (typed === '') {
      if (value != null && value !== '') onChange(null, null);
      setInputValue('');
      return;
    }
    // Untouched selection text → nothing to resolve.
    if (isShowingSelection) return;
    if (filtered.length > 0) {
      const fallback =
        highlightedIndex >= 0 && highlightedIndex < filtered.length
          ? filtered[highlightedIndex]
          : filtered[0];
      commitSelection(fallback);
    } else if (!selected) {
      // No match — leave the typed text visible but report no selection.
      if (value != null && value !== '') onChange(null, null);
    } else {
      // Had a previous selection but typed something unmatchable: revert.
      setInputValue(selectedDisplay);
      if (value == null || value === '') onChange(null, null);
    }
  };

  const handleFocus = () => {
    focusedRef.current = true;
    revertOnCloseRef.current = false;
    if (!disabled) {
      setHighlightedIndex(0);
      setIsOpen(true);
    }
  };

  const handleBlur = (_e: FocusEvent<HTMLInputElement>) => {
    focusedRef.current = false;
    // Defer so a pointer selection (mousedown → click) wins over blur-commit.
    window.setTimeout(() => {
      if (focusedRef.current) return;
      if (revertOnCloseRef.current) {
        revertOnCloseRef.current = false;
        committedDisplayRef.current = null;
        setInputValue(selectedDisplay);
        setIsOpen(false);
        return;
      }
      // An explicit commit already persisted this text — never re-fire
      // onChange with stale highlight/filter state.
      if (hasUnconsumedCommit()) {
        setIsOpen(false);
        return;
      }
      if (isOpen) commitDefault();
      setIsOpen(false);
    }, 120);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setHighlightedIndex(0);
        setIsOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(actionableCount, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(
        (prev) => (prev - 1 + Math.max(actionableCount, 1)) % Math.max(actionableCount, 1),
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex < filtered.length && filtered.length > 0) {
        // Defaults to filtered[0] when the user just typed (highlight = 0).
        commitSelection(filtered[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      revertOnCloseRef.current = true;
      setInputValue(selectedDisplay);
      setHighlightedIndex(0);
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Tab') {
      commitDefault();
      setIsOpen(false);
    }
  };

  return (
    <Popover.Root
      open={isOpen && !disabled}
      onOpenChange={(open) => {
        if (!open && focusedRef.current && !hasUnconsumedCommit()) {
          // Radix may close on outside pointer-down before blur fires.
          commitDefault();
        }
        setIsOpen(open);
      }}
    >
      <div className={`relative w-full ${className}`}>
        {/* Hidden input so native form submission (FormData) picks up the selected key. */}
        {name && (
          <input type="hidden" name={name} value={value ?? ''} disabled={disabled} />
        )}
        <Popover.Anchor asChild>
          <div
            className={`flex items-center w-full min-h-[34px] bg-transparent ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`}
            onClick={() => {
              if (!disabled) {
                setIsOpen(true);
                inputRef.current?.focus();
              }
            }}
          >
            <div className="flex items-center w-full">
              <input
                ref={inputRef}
                id={id}
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  revertOnCloseRef.current = false;
                  committedDisplayRef.current = null;
                  setIsOpen(true);
                  setHighlightedIndex(0);
                }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                placeholder={placeholder}
                autoComplete="off"
                className="w-full text-sm font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal bg-transparent py-1.5 focus:outline-none"
              />
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ml-1 shrink-0 ${
                  isOpen ? 'rotate-180 text-[#008784]' : ''
                }`}
              />
            </div>
          </div>
        </Popover.Anchor>

        <Popover.Portal>
          <Popover.Content
            sideOffset={4}
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            className="z-50 w-[var(--radix-popover-trigger-width)] min-w-[280px] bg-white border border-slate-200 rounded shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
          >
            {filtered.length > 0 ? (
              <ul className="py-1 text-sm divide-y divide-slate-100">
                {filtered.map((item, idx) => {
                  const key = getKey(item);
                  return (
                    <li
                      key={key}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => commitSelection(item)}
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
                {effectiveQuery.trim()
                  ? <>No matches found for &ldquo;{effectiveQuery.trim()}&rdquo;</>
                  : 'No items available'}
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

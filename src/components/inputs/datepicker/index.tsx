import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FC, FocusEvent, KeyboardEvent, MouseEvent } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export interface DatePickerProps {
  id?: string;
  /** Form field name — rendered as a hidden input so FormData picks up the value. */
  name?: string;
  value: string; // 'YYYY-MM-DD' or empty
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
}

/** 'YYYY-MM-DD' -> 'MM/DD/YYYY' (zero-padded). Returns '' for empty/invalid. */
function formatIsoToDisplay(iso: string): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) {
    // Lenient fallback for non-padded values.
    const d = new Date(`${iso}T00:00:00`);
    if (isNaN(d.getTime())) return '';
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}/${dd}/${d.getFullYear()}`;
  }
  return `${m[2]}/${m[3]}/${m[1]}`;
}

/** 'M/D/YYYY' (forgiving) -> 'YYYY-MM-DD'. Returns null when empty/incomplete/invalid. */
function parseDisplayToIso(display: string): string | null {
  const trimmed = display.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('/');
  if (parts.length !== 3) return null;
  const [mRaw, dRaw, yRaw] = parts;
  if (!mRaw || !dRaw || !yRaw) return null;
  if (!/^\d{1,2}$/.test(mRaw) || !/^\d{1,2}$/.test(dRaw)) return null;

  // Accept YYYY or YY (assume 20xx) for convenience.
  let year: number;
  if (/^\d{4}$/.test(yRaw)) {
    year = Number(yRaw);
  } else if (/^\d{2}$/.test(yRaw)) {
    year = 2000 + Number(yRaw);
  } else if (/^\d{1}$/.test(yRaw)) {
    return null; // incomplete year — wait for more typing
  } else {
    return null;
  }

  const month = Number(mRaw);
  const day = Number(dRaw);
  if (month < 1 || month > 12) return null;
  if (year < 1000 || year > 9999) return null;
  const maxDay = new Date(year, month, 0).getDate();
  if (day < 1 || day > maxDay) return null;

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Lightweight mask for free typing. Supports both styles:
 * - "10022026" (digits only) -> "10/02/2026" (auto-slash)
 * - "1/2/2026" (with slashes) -> preserved, cleaned to "1/2/2026"
 * Lets users select-all / select-part, delete, and retype naturally.
 */
function maskDisplayInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9/]/g, '');
  if (!cleaned) return '';

  // User is typing slashes explicitly — respect their segmentation.
  if (cleaned.includes('/')) {
    const parts = cleaned.split('/').slice(0, 3);
    const mm = parts[0]?.replace(/\D/g, '').slice(0, 2) ?? '';
    const dd = parts.length > 1 ? (parts[1]?.replace(/\D/g, '').slice(0, 2) ?? '') : undefined;
    const yy = parts.length > 2 ? (parts[2]?.replace(/\D/g, '').slice(0, 4) ?? '') : undefined;
    let out = mm;
    if (dd !== undefined) out += `/${dd}`;
    if (yy !== undefined) out += `/${yy}`;
    // Preserve a trailing slash the user just typed ("12/" or "12/02/").
    if (cleaned.endsWith('/') && !out.endsWith('/') && out.length < 10) out += '/';
    return out.slice(0, 10);
  }

  // Digits-only fast typing — auto-insert slashes 2/2/4.
  const digits = cleaned.slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Editable date picker: type MM/DD/YYYY directly or pick from the calendar.
 * Committed value stays 'YYYY-MM-DD' (or '') for form/API compatibility.
 */
export const DatePicker: FC<DatePickerProps> = ({
  id,
  name,
  value,
  onChange,
  placeholder = 'MM/DD/YYYY',
  disabled = false,
  hasError = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<string>(() => formatIsoToDisplay(value ?? ''));
  const [isFocused, setIsFocused] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse YYYY-MM-DD
  const parsedDate = value ? new Date(`${value}T00:00:00`) : null;
  const isValidDate = !!parsedDate && !isNaN(parsedDate.getTime());

  // Keep the text field in sync with external value changes (pick, clear,
  // reset) — but never clobber what the user is actively typing.
  useEffect(() => {
    if (!isFocused) {
      setDraft(formatIsoToDisplay(value ?? ''));
      setIsInvalid(false);
    }
  }, [value, isFocused]);

  // Calendar view state (year & month)
  const [viewYear, setViewYear] = useState<number>(
    isValidDate ? (parsedDate as Date).getFullYear() : new Date().getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    isValidDate ? (parsedDate as Date).getMonth() : new Date().getMonth()
  );

  useEffect(() => {
    if (isValidDate) {
      setViewYear((parsedDate as Date).getFullYear());
      setViewMonth((parsedDate as Date).getMonth());
    }
  }, [value]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const commitDraft = (next: string): boolean => {
    const trimmed = next.trim();
    if (!trimmed) {
      setIsInvalid(false);
      if (value !== '') onChange('');
      setDraft('');
      return true;
    }
    const iso = parseDisplayToIso(trimmed);
    if (!iso) {
      // Incomplete (e.g. "10/02/202") — let the user keep typing.
      const looksIncomplete =
        /^\d{1,2}$/.test(trimmed) ||
        /^\d{1,2}\/\d{0,2}$/.test(trimmed) ||
        /^\d{1,2}\/\d{1,2}\/\d{1,3}$/.test(trimmed);
      setIsInvalid(!looksIncomplete);
      return false;
    }
    setIsInvalid(false);
    const normalized = formatIsoToDisplay(iso);
    setDraft(normalized);
    if (iso !== value) onChange(iso);
    return true;
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDraft(maskDisplayInput(e.target.value));
    if (isInvalid) setIsInvalid(false);
  };

  const handleInputBlur = (e: FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    // Don't revert while the user is interacting with the calendar popover.
    if (e.relatedTarget?.closest('[data-datepicker-popover]')) return;
    const ok = commitDraft(draft);
    if (!ok && draft.trim() !== '') {
      // Revert obvious garbage; keep incomplete input so typing isn't lost
      // only when the field still has focus intent — on blur, revert.
      const incomplete =
        /^\d{1,2}$/.test(draft.trim()) ||
        /^\d{1,2}\/\d{0,2}$/.test(draft.trim()) ||
        /^\d{1,2}\/\d{1,2}\/\d{1,3}$/.test(draft.trim());
      if (!incomplete) {
        setDraft(formatIsoToDisplay(value ?? ''));
        setIsInvalid(true);
      }
    }
  };

  const handleInputFocus = () => setIsFocused(true);

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (commitDraft(draft)) inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setDraft(formatIsoToDisplay(value ?? ''));
      setIsInvalid(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown' && (e.altKey || e.metaKey)) {
      e.preventDefault();
      if (!disabled) setIsOpen(true);
    }
  };

  const handlePrevMonth = (e: MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e: MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${viewYear}-${m}-${d}`);
    setDraft(`${m}/${d}/${viewYear}`);
    setIsInvalid(false);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const showError = hasError || isInvalid;

  return (
    <Popover.Root open={isOpen && !disabled} onOpenChange={setIsOpen}>
      <div className={`relative w-full ${className}`}>
        {/* Hidden input so native form submission (FormData) picks up the date. */}
        {name && (
          <input type="hidden" name={name} value={value ?? ''} disabled={disabled} />
        )}
        <div
          className={`flex items-center justify-between w-full min-h-[34px] border-b py-1.5 px-0.5 transition-colors ${
            showError
              ? 'border-red-500'
              : isOpen || isFocused
              ? 'border-[#008784]'
              : 'border-slate-300 hover:border-slate-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            ref={inputRef}
            id={id}
            value={draft}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onFocus={handleInputFocus}
            onKeyDown={handleInputKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            aria-label="Date in MM/DD/YYYY format"
            title="MM/DD/YYYY — type a date or pick from the calendar"
            className="flex-1 min-w-0 bg-transparent text-sm text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal focus:outline-none disabled:cursor-not-allowed tabular-nums"
          />

          <div className="flex items-center gap-1.5 text-slate-400 shrink-0 ml-1">
            <Popover.Trigger asChild>
              <button
                type="button"
                disabled={disabled}
                onClick={() => commitDraft(draft)}
                className="hover:text-slate-600 p-0.5 rounded transition-colors focus:outline-none"
                title="Open calendar"
                aria-label="Open calendar"
              >
                <Calendar className="w-4 h-4 text-slate-400" />
              </button>
            </Popover.Trigger>
          </div>
        </div>

        <Popover.Portal>
          <Popover.Content
            data-datepicker-popover
            sideOffset={4}
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="z-50 w-64 bg-white border border-slate-200 rounded-lg shadow-xl p-3 animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Month / Year Navigator */}
            <div className="flex items-center justify-between pb-2 text-xs font-semibold text-slate-800 border-b border-slate-100 mb-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-slate-900 font-semibold">
                {monthNames[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next month"
                className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400 mb-1">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            {/* Calendar Day Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <span key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isSelected = value === dStr;
                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    onClick={() => handleSelectDay(dayNum)}
                    className={`w-7 h-7 rounded text-xs flex items-center justify-center transition-colors mx-auto ${
                      isSelected
                        ? 'bg-[#008784] text-white font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Close */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-end items-center text-xs">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#008784] hover:underline font-medium"
              >
                Close
              </button>
            </div>
            <Popover.Arrow className="fill-white" />
          </Popover.Content>
        </Popover.Portal>
      </div>
    </Popover.Root>
  );
};

export default DatePicker;

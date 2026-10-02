import { useEffect, useState } from 'react';
import type { FC, MouseEvent } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

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

/**
 * Popover-powered date picker (date only, formats as "Oct 2, 2026").
 */
export const DatePicker: FC<DatePickerProps> = ({
  id,
  name,
  value,
  onChange,
  placeholder = 'Select date...',
  disabled = false,
  hasError = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Parse YYYY-MM-DD
  const parsedDate = value ? new Date(`${value}T00:00:00`) : null;
  const isValidDate = parsedDate && !isNaN(parsedDate.getTime());

  // Formatted date: "Oct 2, 2026"
  const formattedDisplay = isValidDate
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(parsedDate)
    : '';

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
    setIsOpen(false);
  };

  const handleClear = (e: MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  return (
    <Popover.Root open={isOpen && !disabled} onOpenChange={setIsOpen}>
      <div className={`relative w-full ${className}`}>
        {/* Hidden input so native form submission (FormData) picks up the date. */}
        {name && (
          <input type="hidden" name={name} value={value ?? ''} disabled={disabled} />
        )}
        <Popover.Trigger asChild>
          <div
            id={id}
            className={`flex items-center justify-between w-full min-h-[34px] border-b py-1.5 px-0.5 transition-colors cursor-pointer select-none ${
              hasError
                ? 'border-red-500'
                : isOpen
                ? 'border-[#008784]'
                : 'border-slate-300 hover:border-slate-400'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className={`text-sm ${formattedDisplay ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
              {formattedDisplay || placeholder}
            </span>

            <div className="flex items-center gap-1.5 text-slate-400">
              {formattedDisplay && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="hover:text-slate-600 p-0.5 rounded transition-colors"
                  title="Clear date"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            sideOffset={4}
            align="start"
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

            {/* Clear and Close */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="text-slate-500 hover:text-slate-800"
              >
                Clear
              </button>
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

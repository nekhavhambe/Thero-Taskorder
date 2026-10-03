import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender,
} from '@tanstack/react-table';
import type { ColumnDef, PaginationState, Row } from '@tanstack/react-table';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check, Upload, Plus, Trash2, X } from 'lucide-react';

// ==========================================
// TYPES & CONFIGURATION
// ==========================================

export interface LineItem {
  id: string;
  description: string;
  task: string;
  qty: number | '' | null;
  rate: number | '' | null;
}

export type CurrencyCode = 'ZAR' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'ZAR', symbol: 'R ', name: 'South African Rand (R)' },
  { code: 'USD', symbol: '$ ', name: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€ ', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£ ', name: 'British Pound (£)' },
];

export const TASK_OPTIONS = [
  'General Labor',
  'Excavation & Earthwork',
  'Masonry & Brickwork',
  'Carpentry & Joinery',
  'Electrical Installation',
  'Plumbing & Drainage',
  'Painting & Finishing',
  'HVAC & Mechanical',
  'Project Management',
  'Site Supervision',
  'Quality Inspection',
  'Demolition & Clearance',
  'Consulting & Engineering',
];

// ==========================================
// HELPERS & CALCULATIONS
// ==========================================

export const createBlankRow = (idSuffix: string | number = Date.now()): LineItem => ({
  id: `row-${idSuffix}`,
  description: '',
  task: '',
  qty: 0,
  rate: 0,
});

export const BLANK_PRESET: LineItem[] = Array.from({ length: 20 }, (_, index) => ({
  id: `row-${index + 1}`,
  description: '',
  task: '',
  qty: 0,
  rate: 0,
}));

export const parseNumeric = (val: unknown): number | null => {
  if (val === '' || val === null || val === undefined) return null;
  const num = typeof val === 'number' ? val : Number(val);
  return isNaN(num) ? null : num;
};

export const calculateRowValue = (row: LineItem): number => {
  const qty = parseNumeric(row.qty) ?? 0;
  const rate = parseNumeric(row.rate) ?? 0;
  return qty * rate;
};

export const formatCurrency = (val: number | null | undefined, symbol = 'R '): string => {
  if (val === null || val === undefined) return `${symbol}0.00`;
  return `${symbol}${val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const calculateTotals = (rows: LineItem[]) => {
  let totalQty = 0;
  let totalValue = 0;

  for (const row of rows) {
    const qty = parseNumeric(row.qty) ?? 0;
    const rate = parseNumeric(row.rate) ?? 0;
    totalQty += qty;
    totalValue += qty * rate;
  }

  return { totalQty, totalValue };
};

export const parseCSVToLineItems = (csvText: string): LineItem[] => {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
  const descIdx = headers.findIndex((h) => h.includes('desc'));
  const taskIdx = headers.findIndex((h) => h.includes('task'));
  const qtyIdx = headers.findIndex((h) => h.includes('qty') || h.includes('quantity'));
  const rateIdx = headers.findIndex((h) => h.includes('rate') || h.includes('price'));

  const items: LineItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (rawLine.toUpperCase().startsWith('TOTAL')) continue;

    const fields: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let c = 0; c < rawLine.length; c++) {
      const char = rawLine[c];
      if (char === '"' && (c === 0 || rawLine[c - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        cur = '';
      } else {
        cur += char;
      }
    }
    fields.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

    if (fields.length <= 1 && fields[0] === '') continue;

    const qtyVal = qtyIdx !== -1 && fields[qtyIdx] ? Number(fields[qtyIdx]) : 0;
    const rateVal = rateIdx !== -1 && fields[rateIdx] ? Number(fields[rateIdx]) : 0;

    items.push({
      id: `row-imported-${Date.now()}-${i}`,
      description: descIdx !== -1 ? fields[descIdx] || '' : fields[0] || '',
      task: taskIdx !== -1 ? fields[taskIdx] || '' : fields[1] || '',
      qty: isNaN(qtyVal) ? 0 : qtyVal,
      rate: isNaN(rateVal) ? 0 : rateVal,
    });
  }

  return items;
};

export const parseJSONToLineItems = (jsonText: string): LineItem[] => {
  try {
    const parsed = JSON.parse(jsonText);
    const rawList = Array.isArray(parsed) ? parsed : parsed.items || [];
    if (!Array.isArray(rawList)) return [];

    return rawList.map((item: any, i: number) => ({
      id: item.id || `row-imported-json-${Date.now()}-${i}`,
      description: item.description || item.task || '',
      task: item.task || '',
      qty: item.qty !== undefined && item.qty !== '' ? Number(item.qty) : 0,
      rate: item.rate !== undefined && item.rate !== '' ? Number(item.rate) : 0,
    }));
  } catch (err) {
    console.error('Failed to parse JSON:', err);
    return [];
  }
};

// ==========================================
// SUBCOMPONENTS
// ==========================================

interface EditableCellProps {
  value: string | number | null | undefined;
  type?: 'text' | 'number';
  placeholder?: string;
  align?: 'left' | 'right' | 'center';
  min?: number;
  step?: string | number;
  onChange: (newValue: string | number | null) => void;
  className?: string;
}

export const EditableCell: React.FC<EditableCellProps> = ({
  value,
  type = 'text',
  placeholder = '',
  align = 'left',
  min,
  step = 'any',
  onChange,
  className = '',
}) => {
  const [currentVal, setCurrentVal] = useState<string>(
    value === null || value === undefined ? '' : String(value)
  );

  useEffect(() => {
    setCurrentVal(value === null || value === undefined ? '' : String(value));
  }, [value]);

  const handleBlur = () => {
    if (type === 'number') {
      if (currentVal.trim() === '') {
        onChange(null);
      } else {
        const parsed = Number(currentVal);
        onChange(isNaN(parsed) ? null : parsed);
      }
    } else {
      onChange(currentVal.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLElement).blur();
    }
  };

  const alignClass =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  return (
    <div className="relative w-full h-full flex items-center">
      <input
        type={type}
        min={min}
        step={step}
        value={currentVal}
        placeholder={placeholder}
        onBlur={handleBlur}
        onChange={(e) => setCurrentVal(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        className={`w-full py-1.5 px-2 bg-transparent text-xs text-slate-800 placeholder:text-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 rounded transition-all ${
          type === 'number' ? 'tabular-nums' : ''
        } ${alignClass} ${className}`}
      />
    </div>
  );
};

interface TaskDropdownProps {
  value: string;
  onChange: (newValue: string) => void;
}

export const TaskDropdown: React.FC<TaskDropdownProps> = ({ value, onChange }) => {
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="relative w-full flex items-center">
      <Select.Root
        value={value || '__none__'}
        onValueChange={(val) => {
          if (val === '__none__') {
            onChange('');
          } else {
            onChange(val);
          }
        }}
      >
        <Select.Trigger
          className="w-full flex items-center justify-between gap-1.5 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer transition-colors shadow-2xs"
          aria-label="Select a Task"
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        >
          <span className={`truncate ${!value ? 'text-slate-500' : 'text-slate-800 font-medium'}`}>
            {value || 'Select a Task'}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            {value && (
              <button
                type="button"
                onClick={handleClear}
                title="Clear task"
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <Select.Icon>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </Select.Icon>
          </div>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={4}
            className="overflow-hidden bg-white rounded-md border border-slate-200 shadow-lg z-50 animate-in fade-in-80 text-xs min-w-[220px] max-h-[260px]"
            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            <Select.Viewport className="p-1">
              <Select.Item
                value="__none__"
                className="relative flex items-center px-6 py-1.5 text-xs text-slate-400 italic rounded select-none hover:bg-slate-50 focus:bg-slate-100 focus:outline-none cursor-pointer"
              >
                <Select.ItemText>None (Select a Task)</Select.ItemText>
              </Select.Item>
              {TASK_OPTIONS.map((task) => (
                <Select.Item
                  key={task}
                  value={task}
                  className="relative flex items-center px-6 py-1.5 text-xs text-slate-700 rounded select-none hover:bg-sky-50 hover:text-sky-900 focus:bg-sky-100 focus:outline-none cursor-pointer data-[state=checked]:font-semibold data-[state=checked]:text-sky-800"
                >
                  <Select.ItemIndicator className="absolute left-1.5 inline-flex items-center">
                    <Check className="w-3.5 h-3.5 text-sky-700" />
                  </Select.ItemIndicator>
                  <Select.ItemText>{task}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
};

interface DraggableRowProps {
  row: Row<LineItem>;
  index: number;
}

export const DraggableRow: React.FC<DraggableRowProps> = ({ row }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.original.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
    position: isDragging ? 'relative' : undefined,
    fontFamily: 'Arial, Helvetica, sans-serif',
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group transition-colors duration-150 border-b border-slate-200 ${
        isDragging
          ? 'bg-sky-50/90 shadow-md ring-1 ring-sky-300'
          : 'bg-white hover:bg-slate-50/80'
      }`}
    >
      {row.getVisibleCells().map((cell) => {
        const isDragColumn = cell.column.id === 'dragHandle';

        return (
          <td
            key={cell.id}
            className={`border-r border-slate-200 py-1 px-1.5 text-xs text-slate-700 align-middle ${
              isDragColumn ? 'text-center' : ''
            }`}
          >
            {isDragColumn ? (
              <div
                {...attributes}
                {...listeners}
                title="Drag to reorder row"
                className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-700 active:text-sky-600 cursor-grab active:cursor-grabbing hover:bg-slate-100 rounded transition-colors"
              >
                <div className="flex flex-col gap-[2.5px] items-center justify-center w-3.5" aria-hidden="true">
                  <span className="w-3.5 h-[1.5px] bg-slate-500 rounded-sm"></span>
                  <span className="w-3.5 h-[1.5px] bg-slate-500 rounded-sm"></span>
                  <span className="w-3.5 h-[1.5px] bg-slate-500 rounded-sm"></span>
                </div>
              </div>
            ) : (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            )}
          </td>
        );
      })}
    </tr>
  );
};

// ==========================================
// MAIN REQUISITION TABLE COMPONENT
// ==========================================

interface RequisitionTableProps {
  data: LineItem[];
  setData: React.Dispatch<React.SetStateAction<LineItem[]>>;
  currency: CurrencyConfig;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  onImportSuccess?: (count: number) => void;
}

export const RequisitionTable: React.FC<RequisitionTableProps> = ({
  data,
  setData,
  currency,
  pageSize = 10,
  onPageSizeChange,
  onImportSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      pageSize,
    }));
  }, [pageSize]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let importedItems: LineItem[] = [];

      if (file.name.endsWith('.json')) {
        importedItems = parseJSONToLineItems(text);
      } else {
        importedItems = parseCSVToLineItems(text);
      }

      if (importedItems.length > 0) {
        setData(importedItems);
        if (onImportSuccess) {
          onImportSuccess(importedItems.length);
        }
      }
    } catch (err) {
      console.error('Failed to import file:', err);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleAddLine = () => {
    setData((prev) => [...prev, createBlankRow(Date.now() + Math.random())]);
  };

  const insertRowBelow = (globalIndex: number) => {
    setData((prev) => {
      const newRow = createBlankRow(Date.now() + Math.random());
      const updated = [...prev];
      updated.splice(globalIndex + 1, 0, newRow);
      return updated;
    });
  };

  const deleteRow = (globalIndex: number) => {
    setData((prev) => {
      if (prev.length <= 1) {
        return [createBlankRow(Date.now())];
      }
      return prev.filter((_, i) => i !== globalIndex);
    });
  };

  const updateCell = (globalIndex: number, columnId: keyof LineItem, value: unknown) => {
    setData((prev) =>
      prev.map((row, i) => {
        if (i === globalIndex) {
          return { ...row, [columnId]: value };
        }
        return row;
      })
    );
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setData((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const totals = useMemo(() => calculateTotals(data), [data]);

  const columns = useMemo<ColumnDef<LineItem>[]>(
    () => [
      {
        id: 'dragHandle',
        header: () => (
          <div className="w-7 flex items-center justify-center text-slate-400">
            <span className="sr-only">Reorder</span>
          </div>
        ),
        cell: () => null,
        size: 32,
      },
      {
        id: 'rowNumber',
        header: () => <span className="sr-only">#</span>,
        cell: ({ row }) => {
          const globalNum = row.index + 1 + pagination.pageIndex * pagination.pageSize;
          return (
            <div
              className="w-6 text-center tabular-nums text-[11px] text-slate-500 font-medium select-none"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
            >
              {globalNum}
            </div>
          );
        },
        size: 36,
      },
      {
        accessorKey: 'description',
        header: () => <span className="font-semibold text-slate-700">Description</span>,
        cell: ({ row }) => {
          const globalIdx = row.index + pagination.pageIndex * pagination.pageSize;
          return (
            <EditableCell
              value={row.original.description}
              placeholder=""
              onChange={(val) => updateCell(globalIdx, 'description', val)}
            />
          );
        },
        size: 320,
      },
      {
        accessorKey: 'task',
        header: () => <span className="font-semibold text-slate-700">Task</span>,
        cell: ({ row }) => {
          const globalIdx = row.index + pagination.pageIndex * pagination.pageSize;
          return (
            <TaskDropdown
              value={row.original.task}
              onChange={(val) => updateCell(globalIdx, 'task', val)}
            />
          );
        },
        size: 260,
      },
      {
        accessorKey: 'qty',
        header: () => (
          <div className="w-full text-right pr-2">
            <span className="font-semibold text-slate-700">Qty</span>
          </div>
        ),
        cell: ({ row }) => {
          const globalIdx = row.index + pagination.pageIndex * pagination.pageSize;
          return (
            <EditableCell
              value={row.original.qty ?? 0}
              type="number"
              align="right"
              min={0}
              placeholder="0"
              onChange={(val) => updateCell(globalIdx, 'qty', val === null || val === '' ? 0 : val)}
            />
          );
        },
        size: 90,
      },
      {
        accessorKey: 'rate',
        header: () => (
          <div className="w-full text-right pr-2">
            <span className="font-semibold text-slate-700">Rate</span>
          </div>
        ),
        cell: ({ row }) => {
          const globalIdx = row.index + pagination.pageIndex * pagination.pageSize;
          return (
            <EditableCell
              value={row.original.rate ?? 0}
              type="number"
              align="right"
              min={0}
              step="0.01"
              placeholder="0"
              onChange={(val) => updateCell(globalIdx, 'rate', val === null || val === '' ? 0 : val)}
            />
          );
        },
        size: 110,
      },
      {
        id: 'value',
        header: () => (
          <div className="w-full text-right pr-2">
            <span className="font-semibold text-slate-700">Value</span>
          </div>
        ),
        cell: ({ row }) => {
          const rowVal = calculateRowValue(row.original);
          return (
            <div
              className="py-1.5 px-2 text-right tabular-nums text-xs text-slate-800"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
            >
              {formatCurrency(rowVal, currency.symbol)}
            </div>
          );
        },
        size: 130,
      },
      {
        id: 'actions',
        header: () => (
          <div className="w-full text-center">
            <span className="font-semibold text-slate-700">Actions</span>
          </div>
        ),
        cell: ({ row }) => {
          const globalIdx = row.index + pagination.pageIndex * pagination.pageSize;
          return (
            <div className="flex items-center justify-center gap-1.5 px-1">
              <button
                type="button"
                onClick={() => insertRowBelow(globalIdx)}
                title="Insert line below"
                className="p-1 text-slate-400 hover:text-sky-700 hover:bg-slate-100 rounded transition-colors cursor-pointer inline-flex items-center justify-center"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => deleteRow(globalIdx)}
                title="Delete line"
                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer inline-flex items-center justify-center"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        },
        size: 90,
      },
    ],
    [currency.symbol, pagination.pageIndex, pagination.pageSize]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const totalRowsCount = data.length;
  const isPageSizeReached = totalRowsCount > pagination.pageSize;
  const pageCount = table.getPageCount();

  const renderPaginationControls = () => {
    if (!isPageSizeReached || pageCount <= 1) {
      return null;
    }

    const { pageIndex } = table.getState().pagination;
    const canPrevious = table.getCanPreviousPage();
    const canNext = table.getCanNextPage();

    return (
      <div
        className="flex items-center gap-2 text-xs select-none"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
      >
        <button
          type="button"
          onClick={() => table.setPageIndex(0)}
          disabled={!canPrevious}
          title="First Page"
          className={`font-semibold tracking-tighter px-0.5 transition-colors ${
            canPrevious
              ? 'text-sky-800 hover:text-sky-950 cursor-pointer'
              : 'text-slate-300 cursor-not-allowed'
          }`}
        >
          &lt;&lt;
        </button>
        <button
          type="button"
          onClick={() => table.previousPage()}
          disabled={!canPrevious}
          title="Previous Page"
          className={`font-semibold tracking-tighter px-0.5 transition-colors ${
            canPrevious
              ? 'text-sky-800 hover:text-sky-950 cursor-pointer'
              : 'text-slate-300 cursor-not-allowed'
          }`}
        >
          &lt;
        </button>
        <span className="text-slate-700 text-xs font-medium px-1 whitespace-nowrap">
          Page {pageIndex + 1} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => table.nextPage()}
          disabled={!canNext}
          title="Next Page"
          className={`font-semibold tracking-tighter px-0.5 transition-colors ${
            canNext
              ? 'text-sky-800 hover:text-sky-950 cursor-pointer'
              : 'text-slate-300 cursor-not-allowed'
          }`}
        >
          &gt;
        </button>
        <button
          type="button"
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={!canNext}
          title="Last Page"
          className={`font-semibold tracking-tighter px-0.5 transition-colors ${
            canNext
              ? 'text-sky-800 hover:text-sky-950 cursor-pointer'
              : 'text-slate-300 cursor-not-allowed'
          }`}
        >
          &gt;&gt;
        </button>
      </div>
    );
  };

  const visibleRows = table.getRowModel().rows;

  return (
    <div
      className="w-full bg-white border border-slate-300 shadow-xs overflow-hidden"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv, .json, text/csv, application/json"
        className="hidden"
      />

      {/* Top Controls Bar */}
      <div className="bg-[#e4edf5] border-b border-slate-300 px-3 py-1.5 flex items-center justify-between min-h-[32px]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="text-slate-700">Show:</span>
            <Select.Root
              value={String(pagination.pageSize)}
              onValueChange={(val) => {
                const newSize = Number(val);
                setPagination((prev) => ({ ...prev, pageSize: newSize, pageIndex: 0 }));
                if (onPageSizeChange) {
                  onPageSizeChange(newSize);
                }
              }}
            >
              <Select.Trigger
                className="inline-flex items-center justify-between gap-1.5 bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-700 font-medium hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-2xs min-w-[54px]"
                aria-label="Rows per page"
              >
                <Select.Value />
                <Select.Icon>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </Select.Icon>
              </Select.Trigger>

              <Select.Portal>
                <Select.Content
                  position="popper"
                  sideOffset={4}
                  className="overflow-hidden bg-white rounded-md border border-slate-200 shadow-md z-50 animate-in fade-in-80 text-xs min-w-[70px]"
                  style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                >
                  <Select.Viewport className="p-1">
                    {[5, 10, 20, 50].map((num) => (
                      <Select.Item
                        key={num}
                        value={String(num)}
                        className="relative flex items-center px-6 py-1 text-xs text-slate-700 rounded select-none hover:bg-sky-50 hover:text-sky-900 focus:bg-sky-100 focus:outline-none cursor-pointer data-[state=checked]:font-semibold data-[state=checked]:text-sky-800"
                      >
                        <Select.ItemIndicator className="absolute left-1.5 inline-flex items-center">
                          <Check className="w-3.5 h-3.5 text-sky-700" />
                        </Select.ItemIndicator>
                        <Select.ItemText>{num}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
            <span className="text-slate-700">rows</span>
          </div>

          <button
            type="button"
            onClick={triggerImport}
            title="Import line items from CSV or JSON file"
            className="px-2.5 py-0.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 rounded shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-3 h-3 text-sky-700" />
            <span>Import</span>
          </button>

          <button
            type="button"
            onClick={handleAddLine}
            title="Add a new row"
            className="px-2.5 py-0.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 rounded shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3 text-slate-700" />
            <span>Add Line</span>
          </button>
        </div>

        <div className="ml-auto">
          {renderPaginationControls()}
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full border-collapse text-left min-w-[980px]">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="bg-[#edf3f8] border-b border-slate-300 text-[11px] leading-tight text-slate-700 select-none"
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="border-r border-slate-300 py-2.5 px-3 font-semibold align-middle"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody>
              <SortableContext
                items={visibleRows.map((d) => d.original.id)}
                strategy={verticalListSortingStrategy}
              >
                {visibleRows.map((row, index) => (
                  <DraggableRow key={row.original.id} row={row} index={index} />
                ))}
              </SortableContext>
            </tbody>

            <tfoot>
              <tr className="bg-[#edf3f8]/90 border-t-2 border-slate-300 text-xs font-semibold text-slate-800">
                <td className="border-r border-slate-200 py-2.5 px-2"></td>
                <td className="border-r border-slate-200 py-2.5 px-2"></td>

                <td className="border-r border-slate-200 py-2.5 px-3 text-slate-900 font-bold">
                  Total
                </td>

                <td className="border-r border-slate-200 py-2.5 px-3"></td>

                <td
                  className="border-r border-slate-200 py-2.5 px-2 text-right tabular-nums text-slate-700 font-semibold"
                  style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                >
                  {totals.totalQty.toLocaleString()}
                </td>

                <td className="border-r border-slate-200 py-2.5 px-2"></td>

                <td
                  className="border-r border-slate-200 py-2.5 px-2 text-right tabular-nums font-bold text-slate-900"
                  style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                >
                  {formatCurrency(totals.totalValue, currency.symbol)}
                </td>

                <td className="py-2.5 px-2 text-center"></td>
              </tr>
            </tfoot>
          </table>
        </DndContext>
      </div>

      {/* Footer bar with pagination */}
      <div className="bg-[#edf3f8] border-t border-slate-300 px-4 py-2 flex items-center justify-between">
        <div className="text-[11px] text-slate-500 font-medium">
          Showing {visibleRows.length > 0 ? pagination.pageIndex * pagination.pageSize + 1 : 0} -{' '}
          {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRowsCount)} of {totalRowsCount} rows
        </div>
        <div className="ml-auto">
          {renderPaginationControls()}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// ROOT APPLICATION EXPORT
// ==========================================

export default function App() {
  const [data, setData] = useState<LineItem[]>(BLANK_PRESET);
  const [selectedCurrencyCode] = useState<CurrencyCode>('ZAR');
  const [pageSize, setPageSize] = useState<number>(10);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentCurrency: CurrencyConfig =
    SUPPORTED_CURRENCIES.find((c) => c.code === selectedCurrencyCode) ||
    SUPPORTED_CURRENCIES[0];

  const handleImportSuccess = (count: number) => {
    setToastMessage(`Successfully imported ${count} line items.`);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  return (
    <div
      className="min-h-screen bg-slate-50 p-2 sm:p-4 lg:p-6 flex flex-col justify-start items-center"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-3.5 py-2 rounded-md shadow-lg border border-slate-700 animate-fade-in">
          {toastMessage}
        </div>
      )}

      <div className="w-full max-w-[1550px]">
        <RequisitionTable
          data={data}
          setData={setData}
          currency={currentCurrency}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          onImportSuccess={handleImportSuccess}
        />
      </div>
    </div>
  );
}

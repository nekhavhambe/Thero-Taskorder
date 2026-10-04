import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { ColumnDef, PaginationState, Row } from '@tanstack/react-table';
import type { ColumnSizingState } from '@tanstack/react-table';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Plus, Trash2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { TextInput } from '../../inputs/textinput';
import { NumericInput } from '../../inputs/numericinput';
import { DatePicker } from '../../inputs/datepicker';
import { Select as StdSelect } from '../../inputs/select';
import { Autocomplete } from '../../inputs/autocomplete';
import type { AnyCollection } from '../../../collections/helpers';

// ==========================================
// COLUMN CONFIGURATION
// ==========================================

export interface CellContext<T> {
  row: T;
  globalIndex: number;
  update: (patch: Partial<T>) => void;
}

export type EditorConfig =
  | { kind: 'text'; placeholder?: string }
  | { kind: 'number'; min?: number; max?: number; step?: number; placeholder?: string }
  | { kind: 'date'; placeholder?: string }
  | {
      kind: 'select';
      options: { value: string; label: string }[];
      placeholder?: string;
    }
  | {
      kind: 'autocomplete';
      collection: AnyCollection;
      displayFields: string[];
      getKey?: (item: any) => string;
      searchFields?: string[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onCreate?: (name: string) => any;
      placeholder?: string;
    }
  | { kind: 'custom'; render: (ctx: CellContext<any>) => ReactNode };

export interface EntryColumn<T> {
  /** Row field this column reads/writes (ignored when `display` is set). */
  key: string;
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  editor?: EditorConfig;
  /** Read-only cell content (e.g. computed values). Takes precedence over `editor`. */
  display?: (row: T) => ReactNode;
  /** Footer cell content for this column (e.g. column totals). */
  footer?: (rows: T[]) => ReactNode;
}

export interface DataTableProps<T extends object> {
  data: T[];
  onChange: (rows: T[]) => void;
  columns: EntryColumn<T>[];
  /** Required when rows carry no `id` field (defaults to `row.id`). */
  getRowId?: (row: T) => string;
  /** Factory for blank rows (row + button / insert below / reset). */
  createRow: () => T;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  reorderable?: boolean;
  removable?: boolean;
  showRowNumbers?: boolean;
  emptyText?: string;
  minWidth?: number;
}

// ==========================================
// CELLS (local draft + blur commit: parents never re-render mid-type,
// so focus is bulletproof and masked values format on blur)
// ==========================================

function TextCell({
  value,
  placeholder,
  onCommit,
}: {
  value: string;
  placeholder?: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setDraft(null);
  }, [value]);

  return (
    <TextInput
      variant="ghost"
      value={draft ?? value}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => {
        focusedRef.current = true;
        setDraft(value);
      }}
      onBlur={() => {
        focusedRef.current = false;
        const next = draft;
        setDraft(null);
        if (next !== null && next !== value) onCommit(next);
      }}
      placeholder={placeholder ?? ''}
    />
  );
}

// ==========================================
// DRAGGABLE ROW
// ==========================================

function DraggableRow<T>({ row }: { row: Row<T> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: (row.original as { id: string }).id,
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
        isDragging ? 'bg-sky-50/90 shadow-md ring-1 ring-sky-300' : 'bg-white hover:bg-slate-50/80'
      }`}
    >
      {row.getVisibleCells().map((cell) => {
        const isDragColumn = cell.column.id === 'dragHandle';
        return (
          <td
            key={cell.id}
            className={`py-0 px-1.5 text-xs text-slate-700 align-middle ${
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
}

// ==========================================
// GENERIC DATA TABLE
// ==========================================

export function DataTable<T extends object>({
  data,
  onChange,
  columns,
  getRowId,
  createRow,
  pageSize = 10,
  reorderable = true,
  removable = true,
  showRowNumbers = true,
  emptyText = 'No rows yet. Add a line to get started.',
  minWidth = 980,
}: DataTableProps<T>) {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize });
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const resolveId = getRowId ?? ((row: T) => (row as { id: string }).id);

  // Mirror rows in a ref so stable column defs always operate on fresh data
  // without re-creating (and re-rendering) the whole table per keystroke.
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageSize }));
  }, [pageSize]);

  const updateRow = (globalIndex: number, patch: Partial<T>) => {
    onChange(dataRef.current.map((row, i) => (i === globalIndex ? { ...row, ...patch } : row)));
  };

  const insertRowBelow = (globalIndex: number) => {
    const updated = [...dataRef.current];
    updated.splice(globalIndex + 1, 0, createRow());
    onChange(updated);
  };

  const deleteRow = (globalIndex: number) => {
    const current = dataRef.current;
    if (current.length <= 1) {
      onChange([createRow()]);
      return;
    }
    onChange(current.filter((_, i) => i !== globalIndex));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: import('@dnd-kit/core').DragEndEvent) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = data.findIndex((item) => resolveId(item) === active.id);
      const newIndex = data.findIndex((item) => resolveId(item) === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onChange(arrayMove(data, oldIndex, newIndex));
      }
    }
  };

  const renderEditor = (col: EntryColumn<T>, row: T, globalIndex: number) => {
    const record = row as Record<string, unknown>;
    const update = (patch: Partial<T>) => updateRow(globalIndex, patch);
    const editor = col.editor;
    if (!editor) return <span className="px-2 text-slate-400">—</span>;

    switch (editor.kind) {
      case 'text':
        return (
          <TextCell
            value={String(record[col.key] ?? '')}
            placeholder={editor.placeholder}
            onCommit={(v) => update({ [col.key]: v } as Partial<T>)}
          />
        );
      case 'number':
        return (
          <NumericInput
            mask
            commitOnBlur
            variant="ghost"
            value={(record[col.key] as number | '' | null) ?? ''}
            onChange={(val) => update({ [col.key]: val } as Partial<T>)}
            min={editor.min}
            max={editor.max}
            step={editor.step}
            placeholder={editor.placeholder ?? ''}
            className="text-right tabular-nums"
          />
        );
      case 'date':
        return (
          <DatePicker
            value={String(record[col.key] ?? '')}
            onChange={(val) => update({ [col.key]: val } as Partial<T>)}
            placeholder={editor.placeholder}
          />
        );
      case 'select':
        return (
          <StdSelect
            value={String(record[col.key] ?? '')}
            onChange={(val) => update({ [col.key]: val } as Partial<T>)}
            options={editor.options}
            placeholder={editor.placeholder}
          />
        );
      case 'autocomplete':
        return (
          <Autocomplete
            collection={editor.collection}
            displayFields={editor.displayFields}
            getKey={editor.getKey}
            searchFields={editor.searchFields}
            value={record[col.key] != null && record[col.key] !== '' ? String(record[col.key]) : null}
            onChange={(key) => update({ [col.key]: key ?? '' } as Partial<T>)}
            onCreate={editor.onCreate}
            placeholder={editor.placeholder}
          />
        );
      case 'custom':
        return <>{editor.render({ row, globalIndex, update })}</>;
      default:
        return null;
    }
  };

  const tableColumns = useMemo<ColumnDef<T>[]>(() => {
    const cols: ColumnDef<T>[] = [];

    if (reorderable) {
      cols.push({
        id: 'dragHandle',
        header: () => (
          <div className="w-7 flex items-center justify-center text-slate-400">
            <span className="sr-only">Reorder</span>
          </div>
        ),
        cell: () => null,
        size: 32,
      });
    }

    if (showRowNumbers) {
      cols.push({
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
      });
    }

    for (const col of columns) {
      const alignClass =
        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
      cols.push({
        id: col.key,
        header: () => <div className={`w-full ${alignClass}`}><span className="font-semibold text-slate-700">{col.header}</span></div>,
        cell: ({ row }) => {
          const globalIdx = row.index + pagination.pageIndex * pagination.pageSize;
          const alignClass =
            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
          return (
            <div className={`w-full ${alignClass}`}>
              {col.display ? col.display(row.original) : renderEditor(col, row.original, globalIdx)}
            </div>
          );
        },
        size: col.width ?? 150,
      });
    }

    if (removable) {
      cols.push({
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
      });
    }

    return cols;
    // Columns stay referentially stable across keystrokes (updaters read via
    // dataRef) so cells never remount and inputs never lose focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, reorderable, removable, showRowNumbers, pagination.pageIndex, pagination.pageSize]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { pagination, columnSizing },
    onPaginationChange: setPagination,
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (original) => resolveId(original),
  });

  const totalRowsCount = data.length;
  const isPageSizeReached = totalRowsCount > pagination.pageSize;
  const pageCount = table.getPageCount();
  const hasFooter = columns.some((c) => c.footer != null);

  const renderPaginationControls = () => {
    if (!isPageSizeReached || pageCount <= 1) return null;
    const { pageIndex } = table.getState().pagination;
    const canPrevious = table.getCanPreviousPage();
    const canNext = table.getCanNextPage();
    const btn = (enabled: boolean) =>
      `p-0.5 rounded transition-colors ${enabled ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200 cursor-pointer' : 'text-slate-300 cursor-not-allowed'}`;
    return (
      <div className="flex items-center gap-1 text-xs select-none" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <button type="button" onClick={() => table.setPageIndex(0)} disabled={!canPrevious} title="First Page"
          className={btn(canPrevious)}><ChevronsLeft className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={() => table.previousPage()} disabled={!canPrevious} title="Previous Page"
          className={btn(canPrevious)}><ChevronLeft className="w-3.5 h-3.5" /></button>
        <span className="text-slate-700 text-xs font-medium px-1 whitespace-nowrap">Page {pageIndex + 1} of {pageCount}</span>
        <button type="button" onClick={() => table.nextPage()} disabled={!canNext} title="Next Page"
          className={btn(canNext)}><ChevronRight className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={() => table.setPageIndex(pageCount - 1)} disabled={!canNext} title="Last Page"
          className={btn(canNext)}><ChevronsRight className="w-3.5 h-3.5" /></button>
      </div>
    );
  };

  const visibleRows = table.getRowModel().rows;

  return (
    <div className="w-full bg-white border border-slate-300 shadow-xs overflow-hidden" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {/* Top pagination bar — header grey, only when pages exist. */}
      {isPageSizeReached && pageCount > 1 && (
        <div className="bg-slate-100 border-b border-slate-300 px-4 py-1.5 flex items-center justify-end">
          <div className="ml-auto">{renderPaginationControls()}</div>
        </div>
      )}
      <div className="overflow-x-auto custom-scrollbar">
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
          <table className="w-full border-collapse table-fixed text-left" style={{ minWidth }}>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-slate-100 border-b border-slate-300 text-[11px] leading-tight text-slate-700 select-none">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} style={{ width: header.getSize() }} className="relative py-2.5 px-3 font-semibold align-middle whitespace-nowrap overflow-visible">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        onDoubleClick={() => header.column.resetSize()}
                        title="Resize column"
                        className={`absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none touch-none hover:bg-sky-400 ${
                          header.column.getIsResizing() ? 'bg-sky-500' : ''
                        }`}
                      />
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={tableColumns.length} className="py-8 text-center text-xs text-slate-400">
                    {emptyText}
                  </td>
                </tr>
              ) : (
                <SortableContext items={visibleRows.map((d) => resolveId(d.original))} strategy={verticalListSortingStrategy}>
                  {visibleRows.map((row) => (
                    <DraggableRow key={resolveId(row.original)} row={row} />
                  ))}
                </SortableContext>
              )}
            </tbody>

            {hasFooter && (
              <tfoot>
                <tr className="bg-white border-0 text-xs font-semibold text-slate-800">
                  {reorderable && <td className="border-0 py-2.5 px-2"></td>}
                  {showRowNumbers && <td className="border-0 py-2.5 px-2"></td>}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`border-0 py-2.5 px-1.5 tabular-nums ${
                        col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right'
                      }`}
                    >
                      <div className="px-2">{col.footer?.(data)}</div>
                    </td>
                  ))}
                  {removable && <td className="border-0 py-2.5 px-2 text-center"></td>}
                </tr>
              </tfoot>
            )}
          </table>
        </DndContext>
      </div>

      {/* Footer bar with pagination — rendered only when pages exist,
          so there is no empty gap between the scrollbar and the border. */}
      {isPageSizeReached && pageCount > 1 && (
        <div className="bg-white px-4 py-1.5 flex items-center justify-end">
          <div className="ml-auto">{renderPaginationControls()}</div>
        </div>
      )}
    </div>
  );
}

export default DataTable;

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, PaginationState, Row } from "@tanstack/react-table";
import type { ColumnSizingState } from "@tanstack/react-table";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  Plus,
  Trash2,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Loader2,
} from "lucide-react";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { TextInput } from "../../inputs/textinput";
import { NumericInput } from "../../inputs/numericinput";
import { DatePicker } from "../../inputs/datepicker";
import { Select as StdSelect } from "../../inputs/select";
import { Autocomplete } from "../../inputs/autocomplete";
import type { AnyCollection } from "../../../collections/helpers";

// ==========================================
// COLUMN CONFIGURATION
// ==========================================

export interface CellContext<T> {
  row: T;
  globalIndex: number;
  /** Persist the patch (collection mode awaits `update().when('settled')`). */
  update: (patch: Partial<T>) => void | Promise<void>;
}

export type EditorConfig =
  | { kind: "text"; placeholder?: string }
  | {
      kind: "number";
      min?: number;
      max?: number;
      step?: number;
      placeholder?: string;
    }
  | { kind: "date"; placeholder?: string }
  | {
      kind: "select";
      options: { value: string; label: string }[];
      placeholder?: string;
    }
  | {
      kind: "autocomplete";
      collection: AnyCollection;
      displayFields: string[];
      getKey?: (item: any) => string;
      searchFields?: string[];
      placeholder?: string;
    }
  | { kind: "custom"; render: (ctx: CellContext<any>) => ReactNode };

export interface EntryColumn<T> {
  key: string;
  header: string;
  width?: number;
  align?: "left" | "center" | "right";
  editor?: EditorConfig;
  display?: (row: T) => ReactNode;
  footer?: (rows: T[]) => ReactNode;
}

interface TableChromeProps {
  columns: EntryColumn<any>[];
  pageSize?: number;
  reorderable?: boolean;
  removable?: boolean;
  showRowNumbers?: boolean;
  emptyText?: string;
  minWidth?: number;
  onPageSizeChange?: (size: number) => void;
  getRowId?: (row: any) => string;
  createRow: () => any;
}

export interface StaticDataTableProps<
  T extends object,
> extends TableChromeProps {
  collection?: never;
  data: T[];
  onChange: (rows: T[]) => void;
  columns: EntryColumn<T>[];
  getRowId?: (row: T) => string;
  createRow: () => T;
}

export interface CollectionDataTableProps<
  T extends object,
> extends TableChromeProps {
  /** TanStack collection backing the grid — rows come from a live query on it. */
  collection: AnyCollection;
  data?: never;
  onChange?: never;
  columns: EntryColumn<T>[];
  getRowId?: (row: T) => string;
  createRow: () => T;
  /**
   * Live-query filter pushed into `useLiveSuspenseQuery`, e.g.
   * `({ c }) => eq(c.taskOrderId, orderId)`.
   * Re-runs reactively when captured values change.
   */
  where?: (aliases: any) => any;
  /** Live-query sort, e.g. `({ c }) => c.createdAt`. */
  orderBy?: (aliases: any) => any;
  orderDirection?: "asc" | "desc";
  limit?: number;
}

export type DataTableProps<T extends object> =
  | StaticDataTableProps<T>
  | CollectionDataTableProps<T>;

// ==========================================
// SHARED HELPERS
// ==========================================

/** Await a TanStack mutation transaction until it is persisted (`when('settled')`). */
async function waitForPersist(tx: unknown): Promise<void> {
  if (tx == null) return;
  const t = tx as {
    when?: (state: "settled") => Promise<unknown>;
    isPersisted?: { promise: Promise<unknown> };
  };
  if (typeof t.when === "function") {
    await t.when("settled");
    return;
  }
  if (t.isPersisted) {
    await t.isPersisted.promise;
    return;
  }
  await tx;
}

/** Unwrap live-query rows (tolerates `{ row }`-wrapped results). */
function normalizeLiveRows<T>(liveData: unknown): T[] {
  const rows = (liveData ?? []) as Array<
    T | { row?: T | null } | undefined | null
  >;
  return rows.flatMap((r) => {
    if (r == null) return [];
    if (
      typeof r === "object" &&
      "row" in r &&
      (r as { row?: unknown }).row != null
    ) {
      return [(r as { row: T }).row];
    }
    return [r as T];
  });
}

function defaultResolveId<T>(
  collection: AnyCollection | undefined,
  row: T,
): string {
  if (collection) {
    try {
      const key = (
        collection as unknown as { getKeyFromItem: (item: T) => unknown }
      ).getKeyFromItem(row);
      if (key !== undefined && key !== null && String(key) !== "")
        return String(key);
    } catch {
      // fall through to row.id
    }
  }
  return String((row as { id?: unknown }).id ?? "");
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
  onCommit: (value: string) => void | Promise<void>;
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
        if (next !== null && next !== value) void onCommit(next);
      }}
      placeholder={placeholder ?? ""}
    />
  );
}

// ==========================================
// DRAGGABLE ROW
// ==========================================

function DraggableRow<T>({ row }: { row: Row<T> }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: (row.original as { id: string }).id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
    position: isDragging ? "relative" : undefined,
    fontFamily: "Arial, Helvetica, sans-serif",
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group transition-colors duration-150 border-b border-slate-200 ${
        isDragging
          ? "bg-sky-50/90 shadow-md ring-1 ring-sky-300"
          : "bg-white hover:bg-slate-50/80"
      }`}
    >
      {row.getVisibleCells().map((cell) => {
        const isDragColumn = cell.column.id === "dragHandle";
        return (
          <td
            key={cell.id}
            className={`py-0 px-1.5 text-xs text-slate-700 align-middle ${
              isDragColumn ? "text-center" : ""
            }`}
          >
            {isDragColumn ? (
              <div
                {...attributes}
                {...listeners}
                title="Drag to reorder row"
                className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-700 active:text-sky-600 cursor-grab active:cursor-grabbing hover:bg-slate-100 rounded transition-colors"
              >
                <div
                  className="flex flex-col gap-[2.5px] items-center justify-center w-3.5"
                  aria-hidden="true"
                >
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
// TABLE VIEW (pure presentational grid — both modes render through here)
// ==========================================

interface TableViewProps<T extends object> {
  rows: T[];
  columns: EntryColumn<T>[];
  resolveId: (row: T) => string;
  onUpdate: (
    key: string,
    globalIndex: number,
    patch: Partial<T>,
  ) => void | Promise<void>;
  onInsert: () => void | Promise<void>;
  onInsertBelow: (globalIndex: number) => void | Promise<void>;
  onDelete: (key: string, globalIndex: number) => void | Promise<void>;
  onReorder?: (oldIndex: number, newIndex: number) => void;
  isCreating?: boolean;
  isRowBusy?: (key: string) => boolean;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  reorderable?: boolean;
  removable?: boolean;
  showRowNumbers?: boolean;
  emptyText?: string;
  minWidth?: number;
}

function TableView<T extends object>({
  rows,
  columns,
  resolveId,
  onUpdate,
  onInsert,
  onInsertBelow,
  onDelete,
  onReorder,
  isCreating = false,
  isRowBusy,
  pageSize = 10,
  reorderable = true,
  removable = true,
  showRowNumbers = true,
  emptyText = "No rows yet. Add a line to get started.",
  minWidth = 980,
}: TableViewProps<T>) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  // Stable callbacks via ref so column defs never remount cells mid-type.
  const callbacksRef = useRef({ onUpdate, onInsertBelow, onDelete });
  callbacksRef.current = { onUpdate, onInsertBelow, onDelete };
  const resolveIdRef = useRef(resolveId);
  resolveIdRef.current = resolveId;

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageSize }));
  }, [pageSize]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: import("@dnd-kit/core").DragEndEvent) => {
    if (!onReorder) return;
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = rows.findIndex(
        (item) => resolveIdRef.current(item) === active.id,
      );
      const newIndex = rows.findIndex(
        (item) => resolveIdRef.current(item) === over.id,
      );
      if (oldIndex !== -1 && newIndex !== -1) onReorder(oldIndex, newIndex);
    }
  };

  const renderEditor = (
    col: EntryColumn<T>,
    row: T,
    key: string,
    globalIndex: number,
  ) => {
    const record = row as Record<string, unknown>;
    const update = (patch: Partial<T>) =>
      callbacksRef.current.onUpdate(key, globalIndex, patch);
    const editor = col.editor;
    if (!editor) return <span className="px-2 text-slate-400">—</span>;

    switch (editor.kind) {
      case "text":
        return (
          <TextCell
            value={String(record[col.key] ?? "")}
            placeholder={editor.placeholder}
            onCommit={(v) => update({ [col.key]: v } as Partial<T>)}
          />
        );
      case "number":
        return (
          <NumericInput
            mask
            commitOnBlur
            variant="ghost"
            value={(record[col.key] as number | "" | null) ?? ""}
            onChange={(val) => void update({ [col.key]: val } as Partial<T>)}
            min={editor.min}
            max={editor.max}
            step={editor.step}
            placeholder={editor.placeholder ?? ""}
            className="text-right tabular-nums"
          />
        );
      case "date":
        return (
          <DatePicker
            value={String(record[col.key] ?? "")}
            onChange={(val) => void update({ [col.key]: val } as Partial<T>)}
            placeholder={editor.placeholder}
          />
        );
      case "select":
        return (
          <StdSelect
            value={String(record[col.key] ?? "")}
            onChange={(val) => void update({ [col.key]: val } as Partial<T>)}
            options={editor.options}
            placeholder={editor.placeholder}
          />
        );
      case "autocomplete":
        return (
          <Autocomplete
            collection={editor.collection}
            displayFields={editor.displayFields}
            getKey={editor.getKey}
            searchFields={editor.searchFields}
            value={
              record[col.key] != null && record[col.key] !== ""
                ? String(record[col.key])
                : null
            }
            onChange={(key) => update({ [col.key]: key ?? "" } as Partial<T>)}
            placeholder={editor.placeholder}
          />
        );
      case "custom":
        return <>{editor.render({ row, globalIndex, update })}</>;
      default:
        return null;
    }
  };

  const showDragHandle = reorderable && onReorder != null;

  const tableColumns = useMemo<ColumnDef<T>[]>(() => {
    const cols: ColumnDef<T>[] = [];

    if (showDragHandle) {
      cols.push({
        id: "dragHandle",
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
        id: "rowNumber",
        header: () => <span className="sr-only">#</span>,
        cell: ({ row }) => {
          const globalNum =
            row.index + 1 + pagination.pageIndex * pagination.pageSize;
          return (
            <div
              className="w-6 text-center tabular-nums text-[11px] text-slate-500 font-medium select-none"
              style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
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
        col.align === "right"
          ? "text-right"
          : col.align === "center"
            ? "text-center"
            : "text-left";
      cols.push({
        id: col.key,
        header: () => (
          <div className={`w-full ${alignClass}`}>
            <span className="font-semibold text-slate-700">{col.header}</span>
          </div>
        ),
        cell: ({ row }) => {
          const globalIdx =
            row.index + pagination.pageIndex * pagination.pageSize;
          const key = resolveIdRef.current(row.original);
          const busy = isRowBusy?.(key) ?? false;
          const alignClass =
            col.align === "right"
              ? "text-right"
              : col.align === "center"
                ? "text-center"
                : "text-left";
          return (
            <div
              className={`w-full ${alignClass} ${busy ? "opacity-50 pointer-events-none" : ""}`}
            >
              {col.display
                ? col.display(row.original)
                : renderEditor(col, row.original, key, globalIdx)}
            </div>
          );
        },
        size: col.width ?? 150,
      });
    }

    if (removable) {
      cols.push({
        id: "actions",
        header: () => (
          <div className="w-full text-center">
            <span className="font-semibold text-slate-700">Actions</span>
          </div>
        ),
        cell: ({ row }) => {
          const globalIdx =
            row.index + pagination.pageIndex * pagination.pageSize;
          const key = resolveIdRef.current(row.original);
          const busy = isRowBusy?.(key) ?? false;
          return (
            <div className="flex items-center justify-center gap-1.5 px-1">
              <button
                type="button"
                onClick={() =>
                  void callbacksRef.current.onInsertBelow(globalIdx)
                }
                title="Insert line below"
                className="p-1 text-slate-400 hover:text-sky-700 hover:bg-slate-100 rounded transition-colors cursor-pointer inline-flex items-center justify-center"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  void callbacksRef.current.onDelete(key, globalIdx)
                }
                disabled={busy}
                title="Delete line"
                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer inline-flex items-center justify-center disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          );
        },
        size: 90,
      });
    }

    return cols;
    // Columns stay referentially stable across keystrokes (updaters read via
    // callbacksRef) so cells never remount and inputs never lose focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    columns,
    showDragHandle,
    removable,
    showRowNumbers,
    pagination.pageIndex,
    pagination.pageSize,
  ]);

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    state: { pagination, columnSizing },
    onPaginationChange: setPagination,
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (original) => resolveIdRef.current(original),
  });

  const totalRowsCount = rows.length;
  const isPageSizeReached = totalRowsCount > pagination.pageSize;
  const pageCount = table.getPageCount();
  const hasFooter = columns.some((c) => c.footer != null);

  const renderPaginationControls = () => {
    if (!isPageSizeReached || pageCount <= 1) return null;
    const { pageIndex } = table.getState().pagination;
    const canPrevious = table.getCanPreviousPage();
    const canNext = table.getCanNextPage();
    const btn = (enabled: boolean) =>
      `p-0.5 rounded transition-colors ${enabled ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200 cursor-pointer" : "text-slate-300 cursor-not-allowed"}`;
    return (
      <div
        className="flex items-center gap-1 text-xs select-none"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        <button
          type="button"
          onClick={() => table.setPageIndex(0)}
          disabled={!canPrevious}
          title="First Page"
          className={btn(canPrevious)}
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => table.previousPage()}
          disabled={!canPrevious}
          title="Previous Page"
          className={btn(canPrevious)}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-slate-700 text-xs font-medium px-1 whitespace-nowrap">
          Page {pageIndex + 1} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => table.nextPage()}
          disabled={!canNext}
          title="Next Page"
          className={btn(canNext)}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={!canNext}
          title="Last Page"
          className={btn(canNext)}
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  const visibleRows = table.getRowModel().rows;

  return (
    <div
      className="w-full bg-white border border-slate-300 shadow-xs overflow-hidden"
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      {/* Top pagination bar — header grey, only when pages exist. */}
      {isPageSizeReached && pageCount > 1 && (
        <div className="bg-slate-100 border-b border-slate-300 px-4 py-1.5 flex items-center justify-end">
          <div className="ml-auto">{renderPaginationControls()}</div>
        </div>
      )}
      <div className="overflow-x-auto custom-scrollbar">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <table
            className="w-full border-collapse table-fixed text-left"
            style={{ minWidth }}
          >
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="bg-slate-100 border-b border-slate-300 text-[11px] leading-tight text-slate-700 select-none"
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="relative py-2.5 px-3 font-semibold align-middle whitespace-nowrap overflow-visible"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        onDoubleClick={() => header.column.resetSize()}
                        title="Resize column"
                        className={`absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none touch-none hover:bg-sky-400 ${
                          header.column.getIsResizing() ? "bg-sky-500" : ""
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
                  <td
                    colSpan={tableColumns.length}
                    className="py-8 text-center text-xs text-slate-400"
                  >
                    {emptyText}
                  </td>
                </tr>
              ) : onReorder ? (
                <SortableContext
                  items={visibleRows.map((d) =>
                    resolveIdRef.current(d.original),
                  )}
                  strategy={verticalListSortingStrategy}
                >
                  {visibleRows.map((row) => (
                    <DraggableRow
                      key={resolveIdRef.current(row.original)}
                      row={row}
                    />
                  ))}
                </SortableContext>
              ) : (
                visibleRows.map((row) => (
                  <tr
                    key={resolveIdRef.current(row.original)}
                    className="group transition-colors duration-150 border-b border-slate-200 bg-white hover:bg-slate-50/80"
                    style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="py-0 px-1.5 text-xs text-slate-700 align-middle"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>

            {hasFooter && (
              <tfoot>
                <tr className="bg-white border-0 text-xs font-semibold text-slate-800">
                  {showDragHandle && <td className="border-0 py-2.5 px-2"></td>}
                  {showRowNumbers && <td className="border-0 py-2.5 px-2"></td>}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`border-0 py-2.5 px-1.5 tabular-nums ${
                        col.align === "left"
                          ? "text-left"
                          : col.align === "center"
                            ? "text-center"
                            : "text-right"
                      }`}
                    >
                      <div className="px-2">{col.footer?.(rows)}</div>
                    </td>
                  ))}
                  {removable && (
                    <td className="border-0 py-2.5 px-2 text-center"></td>
                  )}
                </tr>
              </tfoot>
            )}
          </table>
        </DndContext>
      </div>

      {/* Create row */}
      <div className="bg-white border-t border-slate-200 px-4 py-2 flex items-center">
        <button
          type="button"
          onClick={() => void onInsert()}
          disabled={isCreating}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:text-sky-800 hover:bg-sky-50 rounded px-2 py-1 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isCreating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          {isCreating ? "Adding…" : "Add line"}
        </button>
      </div>

      {/* Footer bar with pagination — rendered only when pages exist,
          so there is no empty gap between the scrollbar and the border. */}
      {isPageSizeReached && pageCount > 1 && (
        <div className="bg-white px-4 py-1.5 flex items-center justify-end border-t border-slate-200">
          <div className="ml-auto">{renderPaginationControls()}</div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// STATIC MODE (legacy data/onChange — local state, no persistence)
// ==========================================

/** Legacy local-state grid (data/onChange) — prefer `DataTable` with `collection`. */
export function StaticDataTable<T extends object>({
  data,
  onChange,
  columns,
  getRowId,
  createRow,
  pageSize,
  onPageSizeChange,
  reorderable,
  removable,
  showRowNumbers,
  emptyText,
  minWidth,
}: StaticDataTableProps<T>) {
  const resolveId =
    getRowId ?? ((row: T) => String((row as { id: string }).id));

  // Mirror rows in a ref so stable column defs always operate on fresh data
  // without re-creating (and re-rendering) the whole table per keystroke.
  const dataRef = useRef(data);
  dataRef.current = data;

  const updateRow = (_key: string, globalIndex: number, patch: Partial<T>) => {
    onChange(
      dataRef.current.map((row, i) =>
        i === globalIndex ? { ...row, ...patch } : row,
      ),
    );
  };

  const insertRow = () => {
    onChange([...dataRef.current, createRow()]);
  };

  const insertRowBelow = (globalIndex: number) => {
    const updated = [...dataRef.current];
    updated.splice(globalIndex + 1, 0, createRow());
    onChange(updated);
  };

  const deleteRow = (key: string, globalIndex: number) => {
    void key;
    const current = dataRef.current;
    if (current.length <= 1) {
      onChange([createRow()]);
      return;
    }
    onChange(current.filter((_, i) => i !== globalIndex));
  };

  const handleReorder = (oldIndex: number, newIndex: number) => {
    onChange(arrayMove(dataRef.current, oldIndex, newIndex));
  };

  return (
    <TableView<T>
      rows={data}
      columns={columns}
      resolveId={resolveId}
      onUpdate={updateRow}
      onInsert={insertRow}
      onInsertBelow={insertRowBelow}
      onDelete={deleteRow}
      onReorder={reorderable === false ? undefined : handleReorder}
      pageSize={pageSize}
      onPageSizeChange={onPageSizeChange}
      reorderable={reorderable}
      removable={removable}
      showRowNumbers={showRowNumbers}
      emptyText={emptyText}
      minWidth={minWidth}
    />
  );
}


function CollectionDataTableInner<T extends object>({
  collection,
  columns,
  getRowId,
  createRow,
  where,
  orderBy,
  orderDirection = "asc",
  limit,
  pageSize,
  onPageSizeChange,
  reorderable = false,
  removable = true,
  showRowNumbers = true,
  emptyText,
  minWidth,
}: CollectionDataTableProps<T>) {

  useEffect(() => {
    (collection as unknown as { preload?: () => Promise<unknown> })
      ?.preload?.()
      .catch(() => {});
  }, [collection]);

  const { data: liveData } = useLiveSuspenseQuery((q) => {
    const base = q.from({ c: collection as AnyCollection });
    let qb: any = base.select(({ c }: any) => c);
    if (where) qb = qb.where(where as never);
    if (orderBy) qb = qb.orderBy(orderBy as never, orderDirection);
    if (limit != null) qb = qb.limit(limit);
    return qb;
  });
  const rows = useMemo(() => normalizeLiveRows<T>(liveData), [liveData]);

  const resolveId = useCallback(
    (row: T) => (getRowId ? getRowId(row) : defaultResolveId(collection, row)),
    [collection, getRowId],
  );

  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  const markBusy = useCallback((key: string, busy: boolean) => {
    setBusyKeys((prev) => {
      const next = new Set(prev);
      if (busy) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const isRowBusy = useCallback((key: string) => busyKeys.has(key), [busyKeys]);
  const updateRow = useCallback(
    async (key: string, _globalIndex: number, patch: Partial<T>) => {
      if (Object.keys(patch).length === 0) return;
      markBusy(key, true);
      try {
        const tx = (
          collection as unknown as {
            update: (
              k: unknown,
              fn: (draft: Record<string, unknown>) => void,
            ) => unknown;
          }
        ).update(key, (draft) => {
          Object.assign(draft, patch);
        });
        await waitForPersist(tx);
      } catch (err) {
        console.error("Table update failed:", err);
      } finally {
        markBusy(key, false);
      }
    },
    [collection, markBusy],
  );


  const insertRow = useCallback(async () => {
    setIsCreating(true);
    try {
      const tx = (
        collection as unknown as { insert: (item: unknown) => unknown }
      ).insert(createRow());
      await waitForPersist(tx);
    } catch (err) {
      console.error("Table create failed:", err);
    } finally {
      setIsCreating(false);
    }
  }, [collection, createRow]);

  const insertRowBelow = useCallback(
    async (_globalIndex: number) => {
      await insertRow();
    },
    [insertRow],
  );

  /** Delete action: remove the row key, await persist. */
  const deleteRow = useCallback(
    async (key: string) => {
      markBusy(key, true);
      try {
        const tx = (
          collection as unknown as { delete: (k: unknown) => unknown }
        ).delete(key);
        await waitForPersist(tx);
      } catch (err) {
        console.error("Table delete failed:", err);
      } finally {
        markBusy(key, false);
      }
    },
    [collection, markBusy],
  );

  return (
    <TableView<T>
      rows={rows}
      columns={columns}
      resolveId={resolveId}
      onUpdate={updateRow}
      onInsert={insertRow}
      onInsertBelow={insertRowBelow}
      onDelete={deleteRow}
      onReorder={undefined}
      isCreating={isCreating}
      isRowBusy={isRowBusy}
      pageSize={pageSize}
      onPageSizeChange={onPageSizeChange}
      reorderable={reorderable}
      removable={removable}
      showRowNumbers={showRowNumbers}
      emptyText={emptyText}
      minWidth={minWidth}
    />
  );
}

function CollectionTableFallback({ emptyText }: { emptyText?: string }) {
  return (
    <div
      className="w-full bg-white border border-slate-300 shadow-xs overflow-hidden px-4 py-8 text-center text-xs text-slate-400"
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      <Loader2 className="w-4 h-4 animate-spin inline-block mr-2 text-slate-400" />
      {emptyText ?? "Loading rows…"}
    </div>
  );
}

// ==========================================
// GENERIC DATA TABLE (dispatches on collection vs data/onChange)
// ==========================================

export function DataTable<T extends object>(props: DataTableProps<T>) {
  if ("collection" in props && props.collection) {
    const { pageSize } = props;
    void pageSize;
    return (
      <Suspense fallback={<CollectionTableFallback />}>
        <CollectionDataTableInner {...(props as CollectionDataTableProps<T>)} />
      </Suspense>
    );
  }
  return <StaticDataTable {...(props as StaticDataTableProps<T>)} />;
}

/** Collection-backed grid (live query + insert/update/delete with awaited persist). */
export const CollectionDataTable = CollectionDataTableInner;

export default DataTable;

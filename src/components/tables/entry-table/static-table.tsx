import { useRef } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { TableView } from "./table-view";
import type { StaticDataTableProps } from "./types";

// ==========================================
// STATIC TABLE (local data/onChange — local state, no persistence)
// ==========================================

/** Legacy local-state grid (data/onChange) — prefer `CollectionDataTable` with `collection`. */
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

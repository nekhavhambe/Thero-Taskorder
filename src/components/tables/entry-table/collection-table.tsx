import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import type { AnyCollection } from "../../../collections/helpers";
import { TableView } from "./table-view";
import { defaultResolveId, normalizeLiveRows, waitForPersist } from "./cells";
import type { CollectionDataTableProps } from "./types";

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
// COLLECTION TABLE (live query + insert/update/delete with awaited persist)
// ==========================================

/** Collection-backed grid (live query + insert/update/delete with awaited persist). */
export function CollectionDataTable<T extends object>(props: CollectionDataTableProps<T>) {
  return (
    <Suspense fallback={<CollectionTableFallback emptyText={props.emptyText} />}>
      <CollectionDataTableView {...props} />
    </Suspense>
  );
}

function CollectionDataTableView<T extends object>({
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

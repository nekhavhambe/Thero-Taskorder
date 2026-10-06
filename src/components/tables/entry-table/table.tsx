import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import type { QueryBuilder } from "@tanstack/db";
import type { AnyCollection } from "../../../collections/helpers";
import { View } from "./elements/view";
import { normalizeLiveRows, waitForPersist } from "./elements/cells";
import type { EntryColumn } from "./types";


export type TableQuery = QueryBuilder<any>;

export interface TableMutation<T extends object> {
  row: T;
  field: string;
  value: unknown;
}

export interface TableFn<T extends object> {
  query?: (q: TableQuery) => TableQuery;
  /** Performs the insert (e.g. `collection.insert(row)`) — Table awaits the result. */
  create: (index: number) => unknown;
  update: (mutation: TableMutation<T>) => unknown;
  remove: (mutation: TableMutation<T>) => unknown;
}

export interface TableProps<T extends object> {
  config: {
    collection: AnyCollection;
    fn: TableFn<T>;
    column: {
      columns: EntryColumn<T>[];
    };
    row?: {
      emptyText?: string;
      minWidth?: number;
      limit?: number;
      offset?: number;
      enable?: {
        numbers?: boolean;
        reorderable?: boolean;
        removable?: boolean;
      };
    };
  };
}

export function Table<T extends object>({
  config: {
    collection,
    fn,
    column: { columns },
    row: {
      emptyText,
      minWidth,
      limit,
      offset,
      enable: {
        numbers: showRowNumbers = true,
        reorderable = false,
        removable = true,
      } = {},
    } = {},
  },
}: TableProps<T>) {

  useEffect(() => {
    (collection as unknown as { preload?: () => Promise<unknown> })
      ?.preload?.()
      .catch(() => {});
  }, [collection]);

  const { data: liveData } = useLiveSuspenseQuery((q) => {
    const base = q.from({ c: collection as AnyCollection });
    const selected = base.select(({ c }: any) => c);
    let scoped: TableQuery = fn.query ? fn.query(selected) : selected;
    if (limit != null) scoped = scoped.limit(limit);
    if (offset != null) scoped = scoped.offset(offset);
    return scoped;
  });
  const rows = useMemo(() => normalizeLiveRows<T>(liveData), [liveData]);

  const resolveId = useCallback(
    (row: T) => String((row as { id?: unknown }).id ?? ""),
    [],
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
  /** Cell commit: route each patched field through the caller's `fn.update`. */
  const updateRow = useCallback(
    async (key: string, globalIndex: number, patch: Partial<T>) => {
      const entries = Object.entries(patch);
      if (entries.length === 0) return;
      const row =
        rows.find((item) => resolveId(item) === key) ?? rows[globalIndex];
      if (row == null) return;
      markBusy(key, true);
      try {
        for (const [field, value] of entries) {
          const result = await fn.update({ row, field, value });
          await waitForPersist(result);
        }
      } catch (err) {
        console.error("Table update failed:", err);
      } finally {
        markBusy(key, false);
      }
    },
    [fn, rows, resolveId, markBusy],
  );


  /** Add-line button: run the caller's `fn.create`, await persist. */
  const insertRowAt = useCallback(
    async (index: number) => {
      setIsCreating(true);
      try {
        const result = await fn.create(index);
        await waitForPersist(result);
      } catch (err) {
        console.error("Table create failed:", err);
      } finally {
        setIsCreating(false);
      }
    },
    [fn],
  );

  /** Add-line button: append at the end. */
  const insertRow = useCallback(async () => {
    await insertRowAt(rows.length);
  }, [insertRowAt, rows.length]);

  /** Insert-below action: add right under the given row. */
  const insertRowBelow = useCallback(
    async (globalIndex: number) => {
      await insertRowAt(globalIndex + 1);
    },
    [insertRowAt],
  );

  /** Delete action: route the row through the caller's `fn.remove`. */
  const deleteRow = useCallback(
    async (key: string, globalIndex: number) => {
      const row =
        rows.find((item) => resolveId(item) === key) ?? rows[globalIndex];
      if (row == null) return;
      markBusy(key, true);
      try {
        // Row removal only consumes `row`; `field`/`value` stay empty.
        const result = await fn.remove({ row, field: "", value: undefined });
        await waitForPersist(result);
      } catch (err) {
        console.error("Table delete failed:", err);
      } finally {
        markBusy(key, false);
      }
    },
    [fn, rows, resolveId, markBusy],
  );

  return (
    <>
    {JSON.stringify(liveData)}
    <View<T>
      rows={rows}
      fn={fn}
      reorderable={reorderable}
      removable={removable}
      showRowNumbers={showRowNumbers}
      emptyText={emptyText}
      minWidth={minWidth}
      columns={columns}
      onReorder={undefined}
      isCreating={isCreating}
      pageSize={limit ?? 10}
      resolveId={resolveId}
      onUpdate={updateRow}
      onInsert={insertRow}
      onInsertBelow={insertRowBelow}
      onDelete={deleteRow}
      isRowBusy={isRowBusy}
    />
    </>
  );
}

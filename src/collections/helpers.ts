import { useMemo } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import type { Collection } from '@tanstack/react-db';

/** Any TanStack collection — components depend on this, never a concrete backend. */
export type AnyCollection = Collection<any, any, any>;

/**
 * Concatenates display fields with '--', e.g. ['id','name'] → '1000--Deco Addict'.
 */
export function formatDisplayFields<T extends object>(
  item: T,
  fields: string[]
): string {
  const record = item as Record<string, unknown>;
  return fields.map((field) => String(record[field] ?? '')).join('--');
}

/**
 * Reactive rows of any collection (re-renders on insert/update/delete).
 * Pass undefined to get an empty list with no subscription (static mode).
 */
export function useCollectionItems<T extends object>(
  collection: AnyCollection | undefined
): T[] {
  const { data } = useLiveQuery((q) =>
    collection ? q.from({ row: collection }) : undefined
  );
  return useMemo(() => {
    // Live queries can transiently yield empty/tombstone rows while the
    // source collection is still syncing — drop anything without a row.
    const rows = (data ?? []) as Array<{ row?: T | null } | undefined | null>;
    return rows
      .filter((r) => r != null && r.row != null)
      .map((r) => (r as { row: T }).row);
  }, [data]);
}

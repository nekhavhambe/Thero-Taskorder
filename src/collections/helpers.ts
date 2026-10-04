import { useMemo } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import type { Collection, InitialQueryBuilder } from '@tanstack/react-db';

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
 *
 * Uses an identity select (`select(({ c }) => c)`) so on-demand (query)
 * collections actually load — passing the collection straight to
 * useLiveQuery intentionally loads nothing in on-demand mode. Tolerates
 * both raw rows and `{ row }`-wrapped results.
 */
export function useCollectionItems<T extends object>(
  collection: AnyCollection | undefined
): T[] {
  const { data } = useLiveQuery((q: InitialQueryBuilder) =>
    collection ? q.from({ c: collection }).select(({ c }) => c) : undefined,
  );
  return useMemo(() => {
    const rows = (data ?? []) as Array<T | { row?: T | null } | undefined | null>;
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
}

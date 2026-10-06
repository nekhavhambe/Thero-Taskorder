import type { ReactNode } from "react";
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

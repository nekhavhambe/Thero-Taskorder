import type { ReactNode } from "react";
import type { AnyCollection } from "../../../collections/helpers";
import type { TableFn } from "./table";

// ==========================================
// COLUMN CONFIGURATION
// ==========================================

export interface CellContext<T extends object> {
  row: T;
  globalIndex: number;
  /** Persist the patch (routes through the caller's `fn.update`). */
  update: (patch: Partial<T>) => void | Promise<void>;
  /** Caller hooks — custom cells persist via `fn` instead of the collection. */
  fn: TableFn<T>;
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


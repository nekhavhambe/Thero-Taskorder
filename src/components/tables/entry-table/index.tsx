// Generic entry grid + shared numeric/currency utils.
//
// Task-order line-item table lives in its own component now:
// `src/components/tables/taskorder-lines` (columns, import parsers,
// totals, import/upload events). The legacy LineItem / RequisitionTable /
// demo App that used to live here was dead code (no importers) and has been
// removed.

export { DataTable } from './table';
export type {
  CellContext,
  CollectionDataTableProps,
  DataTableProps,
  EditorConfig,
  EntryColumn,
  StaticDataTableProps,
} from './table';

export const parseNumeric = (val: unknown): number | null => {
  if (val === '' || val === null || val === undefined) return null;
  const num = typeof val === 'number' ? val : Number(val);
  return isNaN(num) ? null : num;
};

export const formatCurrency = (val: number | null | undefined, symbol = 'R '): string => {
  if (val === null || val === undefined) return `${symbol}0.00`;
  return `${symbol}${val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

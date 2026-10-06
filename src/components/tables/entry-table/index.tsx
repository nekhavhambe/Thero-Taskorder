export { StaticDataTable } from './static-table';
export { CollectionDataTable } from './collection-table';
export type {
  CellContext,
  CollectionDataTableProps,
  EditorConfig,
  EntryColumn,
  StaticDataTableProps,
} from './types';

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

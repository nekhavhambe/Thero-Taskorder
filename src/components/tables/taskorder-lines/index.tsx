import { useEffect, useMemo, useRef } from 'react';
import { DataTable } from '../entry-table/table';
import type { EntryColumn } from '../entry-table/table';
import { formatCurrency, parseNumeric } from '../entry-table';
import { standardTaskCollection } from '../../../collections/standard-tasks';
import type { StandardTask } from '../../../collections/standard-tasks';
import { taskOrderLineCollection } from '../../../collections/task-order-lines';
import type { TaskOrderLine } from '../../../collections/task-order-lines';
import { useCollectionItems } from '../../../collections/helpers';

// ==========================================
// CURRENCY
// ==========================================

export type CurrencyCode = 'ZAR' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'ZAR', symbol: 'R ', name: 'South African Rand (R)' },
  { code: 'USD', symbol: '$ ', name: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€ ', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£ ', name: 'British Pound (£)' },
];

// ==========================================
// TABLE IMPORT / UPLOAD EVENTS
// ==========================================

/**
 * Window events that open the table's file pickers. Dispatched by the "..."
 * menu in the page header, so the menu and the table stay decoupled.
 */
export const TABLE_IMPORT_EVENT = 'thero:table-import';
export const TABLE_UPLOAD_EVENT = 'thero:table-upload';

/** Ask the mounted task-order lines table to open its importer (CSV/JSON). */
export function requestTableImport(): void {
  window.dispatchEvent(new CustomEvent(TABLE_IMPORT_EVENT));
}

/** Ask the mounted task-order lines table to open its supporting-docs picker. */
export function requestTableUpload(): void {
  window.dispatchEvent(new CustomEvent(TABLE_UPLOAD_EVENT));
}

// ==========================================
// ROW HELPERS
// ==========================================

const getStandardTaskKey = (task: StandardTask): string =>
  task.RECORDNO?.trim() ? task.RECORDNO : task.STANDARDTASKID || task.NAME;

export const lineValue = (row: TaskOrderLine): number =>
  (parseNumeric(row.quantity) ?? 0) * (parseNumeric(row.rate) ?? 0);

export const createTaskOrderLineRow = (
  parent: Pick<TaskOrderLine, 'taskOrderId' | 'taskOrderRecordNo'> = {
    taskOrderId: '',
    taskOrderRecordNo: '',
  },
): TaskOrderLine => ({
  id: `line-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  taskOrderId: parent.taskOrderId,
  taskOrderRecordNo: parent.taskOrderRecordNo,
  description: '',
  task: '',
  quantity: 0,
  rate: 0,
});

export const buildTaskOrderLineColumns = (
  currencySymbol: string,
): EntryColumn<TaskOrderLine>[] => [
  {
    key: 'description',
    header: 'Description',
    width: 320,
    align: 'left',
    editor: { kind: 'text' },
    footer: () => <span className="text-slate-900 font-bold">Total</span>,
  },
  {
    key: 'task',
    header: 'Task',
    width: 300,
    align: 'left',
    editor: {
      kind: 'autocomplete',
      collection: standardTaskCollection,
      displayFields: ['STANDARDTASKID', 'NAME'],
      searchFields: ['STANDARDTASKID', 'NAME', 'RECORDNO'],
      getKey: getStandardTaskKey,
      placeholder: 'Select a Task',
    },
  },
  {
    key: 'quantity',
    header: 'Qty',
    width: 110,
    align: 'right',
    editor: { kind: 'number', min: 0, placeholder: '0' },
  },
  {
    key: 'rate',
    header: 'Rate',
    width: 130,
    align: 'right',
    editor: { kind: 'number', min: 0, step: 0.01, placeholder: '0' },
  },
  {
    key: 'value',
    header: 'Value',
    width: 150,
    align: 'right',
    display: (row) => (
      <div className="py-1.5 px-2 text-right tabular-nums text-xs text-slate-800">
        {formatCurrency(lineValue(row), currencySymbol)}
      </div>
    ),
    footer: (rows) => (
      <span className="font-bold text-slate-900">
        {formatCurrency(
          rows.reduce((sum, r) => sum + lineValue(r), 0),
          currencySymbol,
        )}
      </span>
    ),
  },
];

// ==========================================
// CSV / JSON IMPORT (task-order line shape)
// ==========================================

export interface ImportedTaskOrderLine {
  description: string;
  task: string;
  quantity: number | '' | null;
  rate: number | '' | null;
}

export const parseCSVToTaskOrderLines = (csvText: string): ImportedTaskOrderLine[] => {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
  const descIdx = headers.findIndex((h) => h.includes('desc'));
  const taskIdx = headers.findIndex((h) => h.includes('task'));
  const qtyIdx = headers.findIndex((h) => h.includes('qty') || h.includes('quantity'));
  const rateIdx = headers.findIndex((h) => h.includes('rate') || h.includes('price'));

  const items: ImportedTaskOrderLine[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (rawLine.toUpperCase().startsWith('TOTAL')) continue;

    const fields: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let c = 0; c < rawLine.length; c++) {
      const char = rawLine[c];
      if (char === '"' && (c === 0 || rawLine[c - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        cur = '';
      } else {
        cur += char;
      }
    }
    fields.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

    if (fields.length <= 1 && fields[0] === '') continue;

    const qtyVal = qtyIdx !== -1 && fields[qtyIdx] ? Number(fields[qtyIdx]) : 0;
    const rateVal = rateIdx !== -1 && fields[rateIdx] ? Number(fields[rateIdx]) : 0;

    items.push({
      description: descIdx !== -1 ? fields[descIdx] || '' : fields[0] || '',
      task: taskIdx !== -1 ? fields[taskIdx] || '' : fields[1] || '',
      quantity: isNaN(qtyVal) ? 0 : qtyVal,
      rate: isNaN(rateVal) ? 0 : rateVal,
    });
  }

  return items;
};

export const parseJSONToTaskOrderLines = (jsonText: string): ImportedTaskOrderLine[] => {
  try {
    const parsed = JSON.parse(jsonText);
    const rawList = Array.isArray(parsed) ? parsed : parsed.items || [];
    if (!Array.isArray(rawList)) return [];

    return rawList.map((item: Record<string, unknown>) => ({
      description: String(item.description || item.task || ''),
      task: String(item.task || ''),
      quantity:
        item.quantity !== undefined && item.quantity !== ''
          ? Number(item.quantity)
          : item.qty !== undefined && item.qty !== ''
            ? Number(item.qty)
            : 0,
      rate: item.rate !== undefined && item.rate !== '' ? Number(item.rate) : 0,
    }));
  } catch (err) {
    console.error('Failed to parse JSON:', err);
    return [];
  }
};

// ==========================================
// TOTALS SUMMARY
// ==========================================

export interface TotalsSummaryProps {
  untaxed: number;
  taxRate: number;
  currencySymbol: string;
}

export const TotalsSummary: React.FC<TotalsSummaryProps> = ({
  untaxed,
  taxRate,
  currencySymbol,
}) => {
  const tax = untaxed * taxRate;
  const total = untaxed + tax;
  const taxLabel = `Tax ${Number((taxRate * 100).toFixed(2))}%:`;

  return (
    <div className="flex justify-end mt-3">
      <div
        className="w-64 text-sm tabular-nums"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
      >
        <div className="flex items-center justify-between py-1 pl-2 pr-4 text-slate-600">
          <span>Untaxed Amount:</span>
          <span className="font-medium text-slate-800">
            {formatCurrency(untaxed, currencySymbol)}
          </span>
        </div>
        <div className="flex items-center justify-between py-1 pl-2 pr-4 text-slate-600">
          <span>{taxLabel}</span>
          <span className="font-medium text-slate-800">
            {formatCurrency(tax, currencySymbol)}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-slate-300 mt-1 pt-2 pl-2 pr-4">
          <span className="text-slate-600">Total:</span>
          <span className="text-base font-bold text-slate-900">
            {formatCurrency(total, currencySymbol)}
          </span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// TASK ORDER LINES TABLE (own component)
// ==========================================

interface TaskOrderLinesTableProps {
  currency: CurrencyConfig;
  /** Parent order keys stamped onto created/imported rows. */
  taskOrderId?: string;
  taskOrderRecordNo?: string;
  /**
   * Live-query filter pushed into the grid, e.g.
   * `({ c }) => eq(c.taskOrderRecordNo, recordNo)`.
   * Omit for the unscoped (all-rows) grid.
   */
  where?: (aliases: any) => any;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  onImportSuccess?: (count: number) => void;
  onUploadSuccess?: (files: File[]) => void;
  /** VAT / tax rate applied on the untaxed total. Defaults to 0.15 (15%). */
  taxRate?: number;
  /** Show the untaxed / tax / total mini-table below the grid. Defaults to true. */
  showTotals?: boolean;
}

export const TaskOrderLinesTable: React.FC<TaskOrderLinesTableProps> = ({
  currency,
  taskOrderId = '',
  taskOrderRecordNo = '',
  where,
  pageSize = 10,
  onPageSizeChange,
  onImportSuccess,
  onUploadSuccess,
  taxRate = 0.15,
  showTotals = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const columns = useMemo(() => buildTaskOrderLineColumns(currency.symbol), [currency.symbol]);
  // Live rows for the untaxed / tax / total summary (non-suspense read).
  // NOTE: when `where` scopes the grid, this stays the full-collection sum —
  // pass an already-scoped figure via TotalsSummary directly if needed.
  const allRows = useCollectionItems<TaskOrderLine>(taskOrderLineCollection);
  const untaxed = allRows.reduce((sum, r) => sum + lineValue(r), 0);

  // The header "..." menu triggers these via requestTableImport/Upload.
  useEffect(() => {
    const openImport = () => fileInputRef.current?.click();
    const openUpload = () => uploadInputRef.current?.click();
    window.addEventListener(TABLE_IMPORT_EVENT, openImport);
    window.addEventListener(TABLE_UPLOAD_EVENT, openUpload);
    return () => {
      window.removeEventListener(TABLE_IMPORT_EVENT, openImport);
      window.removeEventListener(TABLE_UPLOAD_EVENT, openUpload);
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const items = file.name.endsWith('.json')
        ? parseJSONToTaskOrderLines(text)
        : parseCSVToTaskOrderLines(text);

      if (items.length > 0) {
        // Direct live insert — each row creates its Intacct record via the
        // collection's onInsert; wait until all are persisted.
        const tx = taskOrderLineCollection.insert(
          items.map((item) => ({
            ...createTaskOrderLineRow({ taskOrderId, taskOrderRecordNo }),
            description: item.description,
            task: item.task,
            quantity: item.quantity,
            rate: item.rate,
          })),
        );
        await tx.when('settled');
        onImportSuccess?.(items.length);
      }
    } catch (err) {
      console.error('Failed to import file:', err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    // No backend yet — hand the files to the parent for confirmation UI.
    if (files.length > 0) onUploadSuccess?.(files);
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv, .json, text/csv, application/json"
        className="hidden"
      />
      <input
        type="file"
        ref={uploadInputRef}
        onChange={handleUploadChange}
        multiple
        className="hidden"
        aria-label="Upload supporting documents"
      />
      <DataTable<TaskOrderLine>
        collection={taskOrderLineCollection}
        columns={columns}
        createRow={() => createTaskOrderLineRow({ taskOrderId, taskOrderRecordNo })}
        where={where}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        reorderable={false}
        minWidth={980}
      />
      {showTotals && (
        <TotalsSummary untaxed={untaxed} taxRate={taxRate} currencySymbol={currency.symbol} />
      )}
    </>
  );
};

export default TaskOrderLinesTable;

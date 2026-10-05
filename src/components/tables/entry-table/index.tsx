import { useEffect, useMemo, useRef, useState } from 'react';
import { DataTable } from './table';
import type { EntryColumn } from './table';
import { standardTaskCollection } from '../../../collections/standard-tasks';
import { useCollectionItems } from '../../../collections/helpers';
import type { StandardTask } from '../../../collections/standard-tasks';

export { DataTable } from './table';
export type { CellContext, CollectionDataTableProps, DataTableProps, EditorConfig, EntryColumn, StaticDataTableProps } from './table';

export interface LineItem {
  id: string;
  description: string;
  task: string;
  qty: number | '' | null;
  rate: number | '' | null;
  discount: number | '' | null;
  taxRate: number | '' | null;
  costSpent: number | '' | null;
}

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

/**
 * Legacy hardcoded task names — kept for backwards-compat imports only.
 * The Task column is now an autocomplete backed by `standardTaskCollection`
 * (live STANDARDTASK rows from Intacct, seeded offline with these names).
 */
export const TASK_OPTIONS = [
  'General Labor',
  'Excavation & Earthwork',
  'Masonry & Brickwork',
  'Carpentry & Joinery',
  'Electrical Installation',
  'Plumbing & Drainage',
  'Painting & Finishing',
  'HVAC & Mechanical',
  'Project Management',
  'Site Supervision',
  'Quality Inspection',
  'Demolition & Clearance',
  'Consulting & Engineering',
];

// ==========================================
// HELPERS & CALCULATIONS
// ==========================================

export const createBlankRow = (idSuffix: string | number = Date.now()): LineItem => ({
  id: `row-${idSuffix}`,
  description: '',
  task: '',
  qty: 0,
  rate: 0,
  discount: 0,
  taxRate: 0,
  costSpent: 0,
});

export const BLANK_PRESET: LineItem[] = Array.from({ length: 20 }, (_, index) => ({
  id: `row-${index + 1}`,
  description: '',
  task: '',
  qty: 0,
  rate: 0,
  discount: 0,
  taxRate: 0,
  costSpent: 0,
}));

export const parseNumeric = (val: unknown): number | null => {
  if (val === '' || val === null || val === undefined) return null;
  const num = typeof val === 'number' ? val : Number(val);
  return isNaN(num) ? null : num;
};

export const calculateRowValue = (row: LineItem): number => {
  const qty = parseNumeric(row.qty) ?? 0;
  const rate = parseNumeric(row.rate) ?? 0;
  return qty * rate;
};

/** Discount amount (percent of Value). */
export const calculateRowDiscount = (row: LineItem): number =>
  (calculateRowValue(row) * (parseNumeric(row.discount) ?? 0)) / 100;

/** Tax amount (percent of Value after discount). */
export const calculateRowTax = (row: LineItem): number =>
  ((calculateRowValue(row) - calculateRowDiscount(row)) * (parseNumeric(row.taxRate) ?? 0)) / 100;

/** Net Amount = Value − Discount + Tax. */
export const calculateRowNet = (row: LineItem): number =>
  calculateRowValue(row) - calculateRowDiscount(row) + calculateRowTax(row);

/** Profit = Net Amount − Cost Spent. */
export const calculateRowProfit = (row: LineItem): number =>
  calculateRowNet(row) - (parseNumeric(row.costSpent) ?? 0);

export const formatCurrency = (val: number | null | undefined, symbol = 'R '): string => {
  if (val === null || val === undefined) return `${symbol}0.00`;
  return `${symbol}${val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const calculateTotals = (rows: LineItem[]) => {
  let totalQty = 0;
  let totalValue = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let totalNet = 0;
  let totalCost = 0;
  let totalProfit = 0;

  for (const row of rows) {
    const qty = parseNumeric(row.qty) ?? 0;
    const rate = parseNumeric(row.rate) ?? 0;
    totalQty += qty;
    totalValue += qty * rate;
    totalDiscount += calculateRowDiscount(row);
    totalTax += calculateRowTax(row);
    totalNet += calculateRowNet(row);
    totalCost += parseNumeric(row.costSpent) ?? 0;
    totalProfit += calculateRowProfit(row);
  }

  return { totalQty, totalValue, totalDiscount, totalTax, totalNet, totalCost, totalProfit };
};

export const parseCSVToLineItems = (csvText: string): LineItem[] => {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
  const descIdx = headers.findIndex((h) => h.includes('desc'));
  const taskIdx = headers.findIndex((h) => h.includes('task'));
  const qtyIdx = headers.findIndex((h) => h.includes('qty') || h.includes('quantity'));
  const rateIdx = headers.findIndex((h) => h.includes('rate') || h.includes('price'));
  const discountIdx = headers.findIndex((h) => h.includes('discount'));
  const taxIdx = headers.findIndex((h) => h.includes('tax'));
  const costIdx = headers.findIndex((h) => h.includes('cost'));

  const items: LineItem[] = [];

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
    const discountVal = discountIdx !== -1 && fields[discountIdx] ? Number(fields[discountIdx]) : 0;
    const taxVal = taxIdx !== -1 && fields[taxIdx] ? Number(fields[taxIdx]) : 0;
    const costVal = costIdx !== -1 && fields[costIdx] ? Number(fields[costIdx]) : 0;

    items.push({
      id: `row-imported-${Date.now()}-${i}`,
      description: descIdx !== -1 ? fields[descIdx] || '' : fields[0] || '',
      task: taskIdx !== -1 ? fields[taskIdx] || '' : fields[1] || '',
      qty: isNaN(qtyVal) ? 0 : qtyVal,
      rate: isNaN(rateVal) ? 0 : rateVal,
      discount: isNaN(discountVal) ? 0 : discountVal,
      taxRate: isNaN(taxVal) ? 0 : taxVal,
      costSpent: isNaN(costVal) ? 0 : costVal,
    });
  }

  return items;
};

export const parseJSONToLineItems = (jsonText: string): LineItem[] => {
  try {
    const parsed = JSON.parse(jsonText);
    const rawList = Array.isArray(parsed) ? parsed : parsed.items || [];
    if (!Array.isArray(rawList)) return [];

    return rawList.map((item: Record<string, unknown>, i: number) => ({
      id: String(item.id || `row-imported-json-${Date.now()}-${i}`),
      description: String(item.description || item.task || ''),
      task: String(item.task || ''),
      qty: item.qty !== undefined && item.qty !== '' ? Number(item.qty) : 0,
      rate: item.rate !== undefined && item.rate !== '' ? Number(item.rate) : 0,
      discount: item.discount !== undefined && item.discount !== '' ? Number(item.discount) : 0,
      taxRate: item.taxRate !== undefined && item.taxRate !== '' ? Number(item.taxRate) : 0,
      costSpent: item.costSpent !== undefined && item.costSpent !== '' ? Number(item.costSpent) : 0,
    }));
  } catch (err) {
    console.error('Failed to parse JSON:', err);
    return [];
  }
};

// ==========================================
// LINE-ITEM COLUMN PRESET (uses the generic DataTable)
// ==========================================

const getStandardTaskKey = (task: StandardTask): string =>
  task.RECORDNO?.trim() ? task.RECORDNO : task.STANDARDTASKID || task.NAME;

export const buildLineItemColumns = (currencySymbol: string): EntryColumn<LineItem>[] => [
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
    key: 'qty',
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
      <div className="py-1.5 px-2 text-right tabular-nums text-xs text-slate-800" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
        {formatCurrency(calculateRowValue(row), currencySymbol)}
      </div>
    ),
    footer: (rows) => (
      <span className="font-bold text-slate-900">
        {formatCurrency(calculateTotals(rows).totalValue, currencySymbol)}
      </span>
    ),
  },
  {
    key: 'discount',
    header: 'Discount %',
    width: 110,
    align: 'right',
    editor: { kind: 'number', min: 0, max: 100, step: 0.01, placeholder: '0' },
  },
  {
    key: 'taxRate',
    header: 'Tax %',
    width: 110,
    align: 'right',
    editor: { kind: 'number', min: 0, max: 100, step: 0.01, placeholder: '0' },
  },
  {
    key: 'net',
    header: 'Net Amount',
    width: 150,
    align: 'right',
    display: (row) => (
      <div className="py-1.5 px-2 text-right tabular-nums text-xs text-slate-800" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
        {formatCurrency(calculateRowNet(row), currencySymbol)}
      </div>
    ),
    footer: (rows) => (
      <span className="font-bold text-slate-900">
        {formatCurrency(calculateTotals(rows).totalNet, currencySymbol)}
      </span>
    ),
  },
  {
    key: 'costSpent',
    header: 'Cost Spent',
    width: 140,
    align: 'right',
    display: (row) => (
      <div className="py-1.5 px-2 text-right tabular-nums text-xs text-slate-800" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
        {formatCurrency(parseNumeric(row.costSpent) ?? 0, currencySymbol)}
      </div>
    ),
    footer: (rows) => (
      <span className="font-bold text-slate-900">
        {formatCurrency(calculateTotals(rows).totalCost, currencySymbol)}
      </span>
    ),
  },
  {
    key: 'profit',
    header: 'Profit',
    width: 150,
    align: 'right',
    display: (row) => (
      <div className="py-1.5 px-2 text-right tabular-nums text-xs text-slate-800" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
        {formatCurrency(calculateRowProfit(row), currencySymbol)}
      </div>
    ),
    footer: (rows) => (
      <span className="font-bold text-slate-900">
        {formatCurrency(calculateTotals(rows).totalProfit, currencySymbol)}
      </span>
    ),
  },
];

// ==========================================
// REQUISITION TABLE (line-item preset)
// ==========================================

/**
 * Window events that open the table's file pickers. Dispatched by the "..."
 * menu in the page header (mirrors the TOOLBAR_ACTION_EVENT pattern), so the
 * menu and the table stay decoupled.
 */
export const TABLE_IMPORT_EVENT = 'thero:table-import';
export const TABLE_UPLOAD_EVENT = 'thero:table-upload';

/** Ask the mounted table to open its line-item importer (CSV/JSON). */
export function requestTableImport(): void {
  window.dispatchEvent(new CustomEvent(TABLE_IMPORT_EVENT));
}

/** Ask the mounted table to open its supporting-docs upload picker. */
export function requestTableUpload(): void {
  window.dispatchEvent(new CustomEvent(TABLE_UPLOAD_EVENT));
}

interface RequisitionTableProps {
  data: LineItem[];
  setData: React.Dispatch<React.SetStateAction<LineItem[]>>;
  currency: CurrencyConfig;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  onImportSuccess?: (count: number) => void;
  onUploadSuccess?: (files: File[]) => void;
  /** VAT / tax rate applied on the untaxed total. Defaults to 0.15 (15%). */
  taxRate?: number;
  /** Show the untaxed / tax / total mini-table below the grid. Defaults to true. */
  showTotals?: boolean;
}

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

export const RequisitionTable: React.FC<RequisitionTableProps> = ({
  data,
  setData,
  currency,
  pageSize = 10,
  onPageSizeChange,
  onImportSuccess,
  onUploadSuccess,
  taxRate = 0.15,
  showTotals = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const columns = useMemo(() => buildLineItemColumns(currency.symbol), [currency.symbol]);

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

  // Re-resolve stored task values against the collection: rows created by the
  // old name-based select, imports, or seed ids are rewritten to the matching
  // row's canonical key. Rows sharing a name form one group whose winner is
  // the live Intacct row (it carries RECORDNO), so already-stored seed ids
  // upgrade to fetched RECORDNOs once the fetch lands. Unmatched custom text
  // is left untouched.
  const tasks = useCollectionItems<StandardTask>(standardTaskCollection);
  useEffect(() => {
    if (tasks.length === 0 || data.length === 0) return;
    const groups = new Map<string, StandardTask[]>();
    for (const t of tasks) {
      const n = (t.NAME ?? '').trim().toLowerCase();
      const k = n || `id:${t.STANDARDTASKID}`;
      const members = groups.get(k);
      if (members) members.push(t);
      else groups.set(k, [t]);
    }
    const best = new Map<string, StandardTask>();
    for (const members of groups.values()) {
      const winner = members.find((m) => m.RECORDNO?.trim()) ?? members[0];
      for (const m of members) {
        best.set(getStandardTaskKey(m), winner);
        best.set(m.STANDARDTASKID, winner);
        if (m.RECORDNO) best.set(m.RECORDNO.trim(), winner);
        const n = (m.NAME ?? '').trim().toLowerCase();
        if (n) best.set(`name:${n}`, winner);
      }
    }
    let changed = false;
    const next = data.map((row) => {
      const v = (row.task ?? '').trim();
      if (!v) return row;
      const hit = best.get(v) ?? best.get(`name:${v.toLowerCase()}`);
      if (!hit) return row;
      const canon = getStandardTaskKey(hit);
      if (canon === v) return row;
      changed = true;
      return { ...row, task: canon };
    });
    if (changed) setData(next);
  }, [tasks, data, setData]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedItems = file.name.endsWith('.json')
        ? parseJSONToLineItems(text)
        : parseCSVToLineItems(text);

      if (importedItems.length > 0) {
        setData(importedItems);
        onImportSuccess?.(importedItems.length);
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

  const { totalValue } = calculateTotals(data);

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
      <DataTable<LineItem>
        data={data}
        onChange={(rows) => setData(rows)}
        columns={columns}
        createRow={() => createBlankRow(`${Date.now()}-${Math.random()}`)}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        minWidth={1650}
      />
      {showTotals && (
        <TotalsSummary
          untaxed={totalValue}
          taxRate={taxRate}
          currencySymbol={currency.symbol}
        />
      )}
    </>
  );
};

// ==========================================
// ROOT APPLICATION EXPORT (demo)
// ==========================================

export default function App() {
  const [data, setData] = useState<LineItem[]>(BLANK_PRESET);
  const [selectedCurrencyCode] = useState<CurrencyCode>('ZAR');
  const [pageSize, setPageSize] = useState<number>(10);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentCurrency: CurrencyConfig =
    SUPPORTED_CURRENCIES.find((c) => c.code === selectedCurrencyCode) || SUPPORTED_CURRENCIES[0];

  const handleImportSuccess = (count: number) => {
    setToastMessage(`Successfully imported ${count} line items.`);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const handleUploadSuccess = (files: File[]) => {
    const names = files.map((f) => f.name).join(', ');
    setToastMessage(
      `Attached ${files.length} file${files.length === 1 ? '' : 's'}: ${names}`
    );
    setTimeout(() => setToastMessage(null), 2800);
  };

  return (
    <div
      className="min-h-screen bg-slate-50 p-2 sm:p-4 lg:p-6 flex flex-col justify-start items-center"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-3.5 py-2 rounded-md shadow-lg border border-slate-700 animate-fade-in">
          {toastMessage}
        </div>
      )}

      <div className="w-full max-w-[1550px]">
        <RequisitionTable
          data={data}
          setData={setData}
          currency={currentCurrency}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          onImportSuccess={handleImportSuccess}
          onUploadSuccess={handleUploadSuccess}
        />
      </div>
    </div>
  );
}

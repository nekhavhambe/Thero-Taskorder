import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { DataTable } from './DataTable';
import type { EntryColumn } from './DataTable';

export { DataTable } from './DataTable';
export type { CellContext, DataTableProps, EditorConfig, EntryColumn } from './DataTable';

// ==========================================
// TYPES & CONFIGURATION
// ==========================================

export interface LineItem {
  id: string;
  description: string;
  task: string;
  qty: number | '' | null;
  rate: number | '' | null;
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
});

export const BLANK_PRESET: LineItem[] = Array.from({ length: 20 }, (_, index) => ({
  id: `row-${index + 1}`,
  description: '',
  task: '',
  qty: 0,
  rate: 0,
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

  for (const row of rows) {
    const qty = parseNumeric(row.qty) ?? 0;
    const rate = parseNumeric(row.rate) ?? 0;
    totalQty += qty;
    totalValue += qty * rate;
  }

  return { totalQty, totalValue };
};

export const parseCSVToLineItems = (csvText: string): LineItem[] => {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
  const descIdx = headers.findIndex((h) => h.includes('desc'));
  const taskIdx = headers.findIndex((h) => h.includes('task'));
  const qtyIdx = headers.findIndex((h) => h.includes('qty') || h.includes('quantity'));
  const rateIdx = headers.findIndex((h) => h.includes('rate') || h.includes('price'));

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

    items.push({
      id: `row-imported-${Date.now()}-${i}`,
      description: descIdx !== -1 ? fields[descIdx] || '' : fields[0] || '',
      task: taskIdx !== -1 ? fields[taskIdx] || '' : fields[1] || '',
      qty: isNaN(qtyVal) ? 0 : qtyVal,
      rate: isNaN(rateVal) ? 0 : rateVal,
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
    }));
  } catch (err) {
    console.error('Failed to parse JSON:', err);
    return [];
  }
};

// ==========================================
// LINE-ITEM COLUMN PRESET (uses the generic DataTable)
// ==========================================

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
    width: 260,
    align: 'left',
    editor: {
      kind: 'select',
      options: TASK_OPTIONS.map((task) => ({ value: task, label: task })),
      placeholder: 'Select a Task',
    },
  },
  {
    key: 'qty',
    header: 'Qty',
    width: 90,
    align: 'right',
    editor: { kind: 'number', min: 0, placeholder: '0' },
    footer: (rows) => (
      <span className="text-slate-700 font-semibold">{calculateTotals(rows).totalQty.toLocaleString()}</span>
    ),
  },
  {
    key: 'rate',
    header: 'Rate',
    width: 110,
    align: 'right',
    editor: { kind: 'number', min: 0, step: 0.01, placeholder: '0' },
  },
  {
    key: 'value',
    header: 'Value',
    width: 130,
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
];

// ==========================================
// REQUISITION TABLE (line-item preset)
// ==========================================

interface RequisitionTableProps {
  data: LineItem[];
  setData: React.Dispatch<React.SetStateAction<LineItem[]>>;
  currency: CurrencyConfig;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  onImportSuccess?: (count: number) => void;
}

export const RequisitionTable: React.FC<RequisitionTableProps> = ({
  data,
  setData,
  currency,
  pageSize = 10,
  onPageSizeChange,
  onImportSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv, .json, text/csv, application/json"
        className="hidden"
      />
      <DataTable<LineItem>
        data={data}
        onChange={(rows) => setData(rows)}
        columns={buildLineItemColumns(currency.symbol)}
        createRow={() => createBlankRow(`${Date.now()}-${Math.random()}`)}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        toolbarExtra={
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Import line items from CSV or JSON file"
            className="px-2.5 py-0.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 rounded shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-3 h-3 text-sky-700" />
            <span>Import</span>
          </button>
        }
      />
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
        />
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import { Table } from '../../components/tables/entry-table';
import type { EntryColumn } from '../../components/tables/entry-table';
import { formatCurrency, parseNumeric } from '../../components/tables/entry-table';
import { cashflowCollection } from '../../collections/cashflow';
import type { CashflowRow } from '../../collections/cashflow';
import { useCollectionItems } from '../../collections/helpers';
import { Field } from '../../components/forms/field';
import { NumericInput } from '../../components/inputs/numericinput';
import { TOOLBAR_ACTION_EVENT } from '../../components/layouts/toolbar';
import type { ToolbarActionDetail } from '../../components/layouts/toolbar';

const createBlankCashflowRow = (idSuffix: string | number = Date.now()): CashflowRow => ({
  id: `cashflow-${idSuffix}`,
  period: '',
  revenue: 0,
  cost: 0,
  actualRevenue: 0,
  actualCost: 0,
});

/** Budgeted profit = Revenue − Cost. */
const rowProfit = (row: CashflowRow): number =>
  (parseNumeric(row.revenue) ?? 0) - (parseNumeric(row.cost) ?? 0);

/** Actual profit = Actual Revenue − Actual Cost. */
const rowActualProfit = (row: CashflowRow): number =>
  (parseNumeric(row.actualRevenue) ?? 0) - (parseNumeric(row.actualCost) ?? 0);

const moneyDisplay = (value: number, currencySymbol = 'R ') => (
  <div className="py-1.5 px-2 text-right tabular-nums text-xs text-slate-800">
    {formatCurrency(value, currencySymbol)}
  </div>
);

const cashflowColumns: EntryColumn<CashflowRow>[] = [
  {
    key: 'period',
    header: 'Reporting Period',
    width: 260,
    align: 'left',
    editor: { kind: 'text', placeholder: 'e.g. Inception to Date' },
    footer: () => <span className="text-slate-900 font-bold">Total</span>,
  },
  {
    key: 'revenue',
    header: 'Revenue',
    width: 150,
    align: 'right',
    editor: { kind: 'number', min: 0, step: 0.01, placeholder: '0' },
    footer: (rows) => (
      <span className="font-bold text-slate-900">
        {formatCurrency(rows.reduce((sum, r) => sum + (parseNumeric(r.revenue) ?? 0), 0))}
      </span>
    ),
  },
  {
    key: 'cost',
    header: 'Cost',
    width: 150,
    align: 'right',
    editor: { kind: 'number', min: 0, step: 0.01, placeholder: '0' },
    footer: (rows) => (
      <span className="font-bold text-slate-900">
        {formatCurrency(rows.reduce((sum, r) => sum + (parseNumeric(r.cost) ?? 0), 0))}
      </span>
    ),
  },
  {
    key: 'actualRevenue',
    header: 'Actual Revenue',
    width: 150,
    align: 'right',
    display: (row) => moneyDisplay(parseNumeric(row.actualRevenue) ?? 0),
    footer: (rows) => (
      <span className="font-bold text-slate-900">
        {formatCurrency(rows.reduce((sum, r) => sum + (parseNumeric(r.actualRevenue) ?? 0), 0))}
      </span>
    ),
  },
  {
    key: 'actualCost',
    header: 'Actual Cost',
    width: 150,
    align: 'right',
    display: (row) => moneyDisplay(parseNumeric(row.actualCost) ?? 0),
    footer: (rows) => (
      <span className="font-bold text-slate-900">
        {formatCurrency(rows.reduce((sum, r) => sum + (parseNumeric(r.actualCost) ?? 0), 0))}
      </span>
    ),
  },
  {
    key: 'profit',
    header: 'Profit',
    width: 150,
    align: 'right',
    display: (row) => moneyDisplay(rowProfit(row)),
    footer: (rows) => (
      <span className="font-bold text-slate-900">
        {formatCurrency(rows.reduce((sum, r) => sum + rowProfit(r), 0))}
      </span>
    ),
  },
  {
    key: 'actualProfit',
    header: 'Actual Profit',
    width: 150,
    align: 'right',
    display: (row) => moneyDisplay(rowActualProfit(row)),
    footer: (rows) => (
      <span className="font-bold text-slate-900">
        {formatCurrency(rows.reduce((sum, r) => sum + rowActualProfit(r), 0))}
      </span>
    ),
  },
];

/** Cashflow tab — forecast vs actuals per reporting period. */
export const Cashflow: FC = () => {
  const rows = useCollectionItems<CashflowRow>(cashflowCollection);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const [budgeted, setBudgeted] = useState<number | null>(null);
  const [billed, setBilled] = useState<number | null>(null);
  const [spent, setSpent] = useState<number | null>(null);

  // "New" resets the grid to a single blank row.
  useEffect(() => {
    const handler = (e: Event) => {
      const { action } = (e as CustomEvent<ToolbarActionDetail>).detail;
      if (action === 'new') {
        const current = rowsRef.current;
        if (current.length > 0) {
          cashflowCollection.delete(current.map((r) => r.id));
        }
        cashflowCollection.insert(createBlankCashflowRow(`new-${Date.now()}`));
      }
    };
    window.addEventListener(TOOLBAR_ACTION_EVENT, handler);
    return () => window.removeEventListener(TOOLBAR_ACTION_EVENT, handler);
  }, []);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-12 gap-y-1 pt-2 pb-4">
        <Field label="Budgeted" htmlFor="cashflow-budgeted">
          <NumericInput
            id="cashflow-budgeted"
            mask
            commitOnBlur
            value={budgeted ?? ''}
            onChange={setBudgeted}
            min={0}
            step={0.01}
            placeholder=""
          />
        </Field>
        <Field label="Billed" htmlFor="cashflow-billed">
          <NumericInput
            id="cashflow-billed"
            mask
            commitOnBlur
            value={billed ?? ''}
            onChange={setBilled}
            min={0}
            step={0.01}
            placeholder=""
          />
        </Field>
        <Field label="Spent" htmlFor="cashflow-spent">
          <NumericInput
            id="cashflow-spent"
            mask
            commitOnBlur
            value={spent ?? ''}
            onChange={setSpent}
            min={0}
            step={0.01}
            placeholder=""
          />
        </Field>
      </div>
      <div className="-mx-6 -mb-6 overflow-hidden [&>div]:border-x-0 [&>div]:border-b-0 [&>div]:border-t-0">
        <Table<CashflowRow>
          config={{
            collection: cashflowCollection,
            fn: {
              create: () =>
                cashflowCollection.insert(
                  createBlankCashflowRow(`${Date.now()}-${Math.random()}`),
                ),
              update: ({ row, field, value }) =>
                cashflowCollection.update(row.id, (draft) => {
                  (draft as Record<string, unknown>)[field] = value;
                }),
              remove: ({ row }) => cashflowCollection.delete(row.id),
            },
            column: { columns: cashflowColumns },
            row: {
              emptyText: "No cashflow rows yet.",
              enable: { numbers: false, reorderable: false },
            },
          }}
        />
      </div>
    </div>
  );
};

export default Cashflow;

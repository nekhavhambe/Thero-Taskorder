import { useMemo } from 'react';
import type { FC } from 'react';
import { useLiveSuspenseQuery } from '@tanstack/react-db';
import { formatCurrency } from '../entry-table';
import { normalizeLiveRows } from '../entry-table/elements/cells';
import { taskOrderLineCollection } from '../../../collections/task-order-lines';
import type { TaskOrderLine } from '../../../collections/task-order-lines';
import type { AnyCollection } from '../../../collections/helpers';
import { lineValue } from './columns';
import { CURRENCY_SYMBOL } from './columns';

const DEFAULT_TAX_RATE = 0.15;

export const TotalsSummary: FC = () => {
  const { data } = useLiveSuspenseQuery((q) =>
    q
      .from({ c: taskOrderLineCollection as AnyCollection })
      .select(({ c }: any) => c),
  );
  const rows = useMemo(() => normalizeLiveRows<TaskOrderLine>(data), [data]);
  const untaxed = rows.reduce((sum, r) => sum + lineValue(r), 0);
  const tax = untaxed * DEFAULT_TAX_RATE;
  const total = untaxed + tax;
  const taxLabel = `Tax ${Number((DEFAULT_TAX_RATE * 100).toFixed(2))}%:`;
  const currencySymbol = CURRENCY_SYMBOL;

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

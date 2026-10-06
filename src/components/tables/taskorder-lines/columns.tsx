import { formatCurrency, parseNumeric } from '../entry-table';
import type { EntryColumn } from '../entry-table';
import { standardTaskCollection } from '../../../collections/standard-tasks';
import type { StandardTask } from '../../../collections/standard-tasks';
import type { TaskOrderLine } from '../../../collections/task-order-lines';

const getStandardTaskKey = (task: StandardTask): string => task.RECORDNO?.trim() ? task.RECORDNO : task.STANDARDTASKID || task.NAME;
export const lineValue = (row: TaskOrderLine): number => (parseNumeric(row.quantity) ?? 0) * (parseNumeric(row.rate) ?? 0);

/** ZAR only — hardcoded (no multi-currency support). */
export const CURRENCY_SYMBOL = 'R ';

export const buildTaskOrderLineColumns = ( currencySymbol: string = CURRENCY_SYMBOL ): EntryColumn<TaskOrderLine>[] => [
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
      placeholder: 'Select a Task',
      getKey: getStandardTaskKey,
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

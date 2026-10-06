import { useMemo } from 'react';
import { eq } from '@tanstack/react-db';
import { Table } from '../entry-table';
import { taskOrderLineCollection } from '../../../collections/task-order-lines';
import type { TaskOrderLine } from '../../../collections/task-order-lines';
import { buildTaskOrderLineColumns } from './columns';
import { TotalsSummary } from './totals';
import { createTaskOrderLineRow, useLineFiles } from './use-line-files';

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

// Re-exported for existing importers (e.g. the header menu actions).
export {
  TABLE_IMPORT_EVENT,
  TABLE_UPLOAD_EVENT,
  requestTableImport,
  requestTableUpload,
  createTaskOrderLineRow,
  parseCSVToTaskOrderLines,
  parseJSONToTaskOrderLines,
} from './use-line-files';
export type { ImportedTaskOrderLine } from './use-line-files';

interface TaskOrderLinesTableProps {
  currency: CurrencyConfig;
  taskOrderId?: string;
  taskorder?: { id: string };
  taskOrderRecordNo?: string;
  onImportSuccess?: (count: number) => void;
  onUploadSuccess?: (files: File[]) => void;
  showTotals?: boolean;
}

export const TaskOrderLinesTable: React.FC<TaskOrderLinesTableProps> = ({
  currency,
  taskOrderId: taskOrderIdProp = '',
  taskorder,
  taskOrderRecordNo = '',
  onImportSuccess,
  onUploadSuccess,
  showTotals = true,
}) => {
  const taskOrderId = taskOrderIdProp || taskorder?.id || '';
  const columns = useMemo(() => buildTaskOrderLineColumns(currency.symbol), [currency.symbol]);
  const { fileInput, uploadInput } = useLineFiles({
    taskOrderId,
    taskOrderRecordNo,
    onImportSuccess,
    onUploadSuccess,
  });

  return (
    <>
      {fileInput}
      {uploadInput}
      <Table<TaskOrderLine>
        config={{
          collection: taskOrderLineCollection,
          fn: {
            query: (q) => q.where(({ c }: any) => eq(c.taskOrderId, taskOrderId)),
            create: () => createTaskOrderLineRow({ taskOrderId, taskOrderRecordNo }),
            update: ({ row, field, value }) =>
              taskOrderLineCollection.update(row.id, (draft) => {
                (draft as Record<string, unknown>)[field] = value;
              }),
            remove: ({ row }) => taskOrderLineCollection.delete(row.id),
          },
          column: { columns },
          row: {
            minWidth: 980,
            enable: { reorderable: false },
          },
        }}
      />
      {showTotals && <TotalsSummary />}
    </>
  );
};

export default TaskOrderLinesTable;

import { useMemo } from 'react';
import { eq } from '@tanstack/react-db';
import { Table } from '../entry-table';
import { taskOrderLineCollection } from '../../../collections/task-order-lines';
import type { TaskOrderLine } from '../../../collections/task-order-lines';
import { buildTaskOrderLineColumns } from './columns';
import { TotalsSummary } from './totals';
import { createTaskOrderLineRow, useLineFiles } from './use-line-files';

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
  taskorder?: { id: string };
  showTotals?: boolean;
}

export const TaskOrderLinesTable: React.FC<TaskOrderLinesTableProps> = ({
  taskorder,
  showTotals = true,
}) => {
  const taskOrderId = taskorder?.id ?? '';
  const taskOrderRecordNo = '';
  const columns = useMemo(() => buildTaskOrderLineColumns(), []);
  const { fileInput, uploadInput } = useLineFiles({
    taskOrderId,
    taskOrderRecordNo,
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

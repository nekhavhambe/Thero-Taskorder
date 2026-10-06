import { useState } from 'react';
import type { FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { DataTable } from '../../components/tables/entry-table';
import type { EntryColumn } from '../../components/tables/entry-table';
import { standardTaskCollection } from '../../collections/tasks';
import { useCollectionItems } from '../../collections/helpers';
import type { StandardTask } from '../../collections/tasks';
import type { TaskOrderConfig } from '../task-orders';

const taskColumns: EntryColumn<StandardTask>[] = [
  {
    key: 'taskId',
    header: 'TaskID',
    width: 180,
    align: 'left',
    display: (row) => (
      <div className="py-1.5 px-2 text-xs font-medium text-slate-900 truncate">
        {(row.STANDARDTASKID ?? '').trim() || '—'}
      </div>
    ),
  },
  {
    key: 'task',
    header: 'Task',
    width: 280,
    align: 'left',
    display: (row) => (
      <div className="py-1.5 px-2 text-xs text-slate-800 truncate">
        {(row.NAME ?? '').trim() || '—'}
      </div>
    ),
  },
  {
    key: 'taskInfo',
    header: 'Task Info',
    width: 340,
    align: 'left',
    display: (row) => (
      <div className="py-1.5 px-2 text-xs text-slate-800 truncate">
        {(row.DESCRIPTION ?? '').trim() || '—'}
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    width: 150,
    align: 'left',
    display: (row) => (
      <div className="py-1.5 px-2 text-xs text-slate-800 whitespace-nowrap">
        {(row.STATUS ?? '').trim() || '—'}
      </div>
    ),
  },
];

/** Tasks tab — tasks for the current project (PROJECTKEY = task order RPROJECT). */
export const Tasks: FC = () => {
  const { getValues } = useFormContext<TaskOrderConfig>();
  const projectKey = String(getValues("project.key") ?? "").trim();
  const allRows = useCollectionItems<StandardTask>(standardTaskCollection);
  const rows = projectKey
    ? allRows.filter((t) => String(t.PROJECTKEY ?? "").trim() === projectKey)
    : allRows;
  const [pageSize, setPageSize] = useState(10);

  return (
    <div className="-mx-6 -mb-6 -mt-6 overflow-hidden rounded [&>div]:border-x-0 [&>div]:border-b-0 [&>div]:border-t-0">
      <DataTable<StandardTask>
        data={rows}
        onChange={() => {}}
        columns={taskColumns}
        getRowId={(row) => (row.RECORDNO?.trim() ? row.RECORDNO : row.STANDARDTASKID || row.NAME)}
        createRow={() => ({}) as StandardTask}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        reorderable={false}
        removable={false}
        showRowNumbers={false}
        emptyText={projectKey ? "No tasks for this project." : "No tasks yet."}
      />
    </div>
  );
};

export default Tasks;

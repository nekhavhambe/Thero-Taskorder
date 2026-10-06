import { useMemo } from 'react';
import type { FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { eq } from '@tanstack/react-db';
import { Table } from '../../components/tables/entry-table';
import type { EntryColumn, TableFn, TableQuery } from '../../components/tables/entry-table';
import { standardTaskCollection } from '../../collections/tasks';
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
  const fn = useMemo<TableFn<StandardTask>>(
    () => ({
      query: projectKey
        ? (q: TableQuery) => q.where(({ c }: any) => eq(c.PROJECTKEY, projectKey))
        : undefined,
      create: () => standardTaskCollection.insert({}),
      update: ({ row, field, value }) =>
        standardTaskCollection.update(
          (row as unknown as { id: string }).id,
          (draft) => {
            (draft as Record<string, unknown>)[field] = value;
          },
        ),
      remove: ({ row }) =>
        standardTaskCollection.delete((row as unknown as { id: string }).id),
    }),
    [projectKey],
  );

  return (
    <div className="-mx-6 -mb-6 -mt-6 overflow-hidden rounded [&>div]:border-x-0 [&>div]:border-b-0 [&>div]:border-t-0">
      <Table<StandardTask>
        config={{
          collection: standardTaskCollection,
          fn,
          column: { columns: taskColumns },
          row: {
            emptyText: projectKey ? "No tasks for this project." : "No tasks yet.",
            enable: { numbers: false, reorderable: false, removable: false },
          },
        }}
      />
    </div>
  );
};

export default Tasks;

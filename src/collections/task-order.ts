import { createCollection, localStorageCollectionOptions } from '@tanstack/react-db';
import { create as createTaskOrder } from '../services/intacct/action/taskorder';
import type { CreateTaskOrderData } from '../services/intacct/action/taskorder';
import { update as updateTaskOrder } from '../services/intacct/action/taskorder';

export interface TaskOrder extends CreateTaskOrderData {
  id: string;
  recordNo?: string;
}

export const taskOrderCollection = createCollection(
  localStorageCollectionOptions<TaskOrder>({
    id: 'task-orders',
    storageKey: 'thero-task-orders',
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      await Promise.all(
        transaction.mutations.map(async (mutation) => {
          const row = mutation.modified;
          await createTaskOrder({
            taskOrderName: row.taskOrderName,
            purchaseOrder: row.purchaseOrder,
            project: row.project,
            startDate: row.startDate,
            endDate: row.endDate,
          });
        }),
      );
    },
    onUpdate: async ({ transaction }) => {
      await Promise.all(
        transaction.mutations.map(async (mutation) => {
          const row = mutation.modified;
          await updateTaskOrder({
            recordNo: row.recordNo as string,
            taskOrderName: row.taskOrderName,
            purchaseOrder: row.purchaseOrder,
            project: row.project,
            startDate: row.startDate,
            endDate: row.endDate,
          });
        }),
      );
    },
  }),
);

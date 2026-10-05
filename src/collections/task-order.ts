import { QueryClient } from "@tanstack/query-core";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import { query } from "../services/intacct/query";
import { create as createTaskOrder } from '../services/intacct/action/taskorder';
import type { CreateTaskOrderData } from '../services/intacct/action/taskorder';
import { update as updateTaskOrder } from '../services/intacct/action/taskorder';

export const TASKORDER_BUDGET_OBJECT = "taskorder_budget";

export interface TaskOrder extends CreateTaskOrderData {
  id: string;
  recordNo?: string;
}

export const client = new QueryClient();
export const taskOrderCollection = createCollection(
  queryCollectionOptions({
    id: "task-orders",
    queryKey: ["task-orders"],
    queryFn: async () => {
      try {
        const { data } = await query({
          object: TASKORDER_BUDGET_OBJECT,
          fields: ["id","name","task_description","start_date","end_date"],
          orderBy: "id",
        });

        alert(`[taskorder query] rows=${data.length}`);

        return (data || [])
          .filter((row) => (row.RECORDNO ?? "").trim() !== "")
          .map((row): TaskOrder => ({
            id: row.RECORDNO.trim(),
            recordNo: row.RECORDNO.trim(),
            taskOrderName: row.TASK_DESCRIPTION ?? "",
            purchaseOrder: row.PURCHASE_ORDER ?? "",
            startDate: row.START_DATE ?? "",
            endDate: row.END_DATE ?? "",
          }));
      } catch {
        return [];
      }
    },
    queryClient: client,
    getKey: (item) => item.recordNo?.trim() ? item.recordNo : item.id,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
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

// Query collections are on-demand — kick off the first load at import so
// rows populate without waiting for an explicit preload/refetch.
void taskOrderCollection.preload().catch(() => {});

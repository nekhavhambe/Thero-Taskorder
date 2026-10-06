import { QueryClient } from "@tanstack/query-core";
import { queryCollectionOptions, parseLoadSubsetOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import type { LoadSubsetOptions } from "@tanstack/db";
import { query } from "../services/intacct/query";
import { create as createTaskOrderLine } from "../services/intacct/action/taskorder-lines";
import { update as updateTaskOrderLine } from "../services/intacct/action/taskorder-lines";
import { remove as removeTaskOrderLine } from "../services/intacct/action/taskorder-lines";

export const TASKORDER_ITEM_OBJECT = "taskorder_item";
const TASKORDER_ITEM_FIELDS = [
  "id",
  "taskorder_item",
  "task",
  "quantity",
  "rate",
  "RTASKORDER_BUDGET",
  "name",
] as const;

export interface TaskOrderLine {
  id: string;
  taskorder_item: string;
  task: string;
  quantity: string;
  rate: string;
  RTASKORDER_BUDGET: string;
  nane: number | "" | null;
}

export const taskOrderLinesClient = new QueryClient();

export const taskOrderLineCollection = createCollection(
  queryCollectionOptions<TaskOrderLine>({
    id: "task-order-lines",
    queryKey: ["task-order-lines"],
    queryFn: async (ctx) => {
      // Pushed-down live-query filters/sorts already use Intacct names.
      const meta = ctx.meta as { loadSubsetOptions?: LoadSubsetOptions } | undefined;
      const { filters: pushed, sorts, limit } = parseLoadSubsetOptions(meta?.loadSubsetOptions);
      const pushedFilters = pushed.flatMap((f) => {
        if (f.operator !== "eq") {
          throw new Error(`Unsupported filter operator for Intacct query: ${f.operator}`);
        }
        return [{ [f.field.join(".")]: f.value as string | number | boolean }];
      });
      const [firstSort] = sorts;
      if (firstSort && firstSort.direction !== "asc") {
        throw new Error(`Intacct query only sorts ascending, got: ${firstSort.direction}`);
      }
      const orderField = firstSort ? firstSort.field.join(".") : "id";

      try {
        const { data } = await query({
          object: TASKORDER_ITEM_OBJECT,
          fields: [...TASKORDER_ITEM_FIELDS],
          ...(pushedFilters.length > 0 ? { filters: pushedFilters } : {}),
          orderBy: orderField,
          ...(limit != null ? { limit } : {}),
        });
        alert(`[taskorder query] rows=${JSON.stringify(data)}`);
        return (data || []) as unknown as TaskOrderLine[];
      } catch (err) {
        console.warn("Task order lines refresh skipped:", (err as Error).message);
        return [];
      }
    },
    queryClient: taskOrderLinesClient,
    getKey: (item) => item.id,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    onInsert: async ({ transaction }) => {
      await Promise.all(
        transaction.mutations.map(async (mutation) => {
          const row = mutation.modified;
          if (!lineHasContent(row)) return;
          await createTaskOrderLine({
            Rtaskorder_budget: String(row.RTASKORDER_BUDGET ?? ""),
            task: row.task,
            taskorder_item: row.taskorder_item,
            quantity: row.quantity,
            rate: row.rate,
          });
        }),
      );
    },
    onUpdate: async ({ transaction }) => {
      await Promise.all(
        transaction.mutations.map(async (mutation) => {
          const row = mutation.modified;
          if (isLocalRow(row)) {
            // Never synced — create the Intacct record once it carries content.
            if (!lineHasContent(row)) return;
            await createTaskOrderLine({
              Rtaskorder_budget: String(row.RTASKORDER_BUDGET ?? ""),
              task: row.task,
              taskorder_item: row.taskorder_item,
              quantity: row.quantity,
              rate: row.rate,
            });
            return;
          }
          // Synced fields unchanged — nothing to push.
          if (sameTaskOrderLineFields(mutation.original, row)) return;
          await updateTaskOrderLine({
            recordNo: row.id,
            Rtaskorder_budget: String(row.RTASKORDER_BUDGET ?? ""),
            task: row.task,
            taskorder_item: row.taskorder_item,
            quantity: row.quantity,
            rate: row.rate,
          });
        }),
      );
    },
    onDelete: async ({ transaction }) => {
      await Promise.all(
        transaction.mutations.map(async (mutation) => {
          const row = mutation.original ?? mutation.modified;
          // Never synced to Intacct — nothing to delete server-side.
          if (!row || isLocalRow(row)) return;
          await removeTaskOrderLine(row.id);
        }),
      );
    },
  }),
);

/** Locally created rows carry a `line-…` temp id until synced. */
function isLocalRow(row: TaskOrderLine): boolean {
  return row.id.startsWith("line-");
}

/** A row carries submittable content (so Intacct accepts the create). */
function lineHasContent(row: Pick<TaskOrderLine, "taskorder_item" | "task" | "quantity" | "rate">): boolean {
  if (String(row.taskorder_item ?? "").trim() !== "") return true;
  if (String(row.task ?? "").trim() !== "") return true;
  const qty = Number(row.quantity);
  const rate = Number(row.rate);
  if (!Number.isNaN(qty) && qty !== 0) return true;
  if (!Number.isNaN(rate) && rate !== 0) return true;
  return false;
}

function sameTaskOrderLineFields(a: Partial<TaskOrderLine>, b: TaskOrderLine): boolean {
  return (
    (a.RTASKORDER_BUDGET ?? "") === (b.RTASKORDER_BUDGET ?? "") &&
    (a.taskorder_item ?? "") === (b.taskorder_item ?? "") &&
    (a.task ?? "") === (b.task ?? "") &&
    (a.quantity ?? "") === (b.quantity ?? "") &&
    (a.rate ?? "") === (b.rate ?? "")
  );
}

// Query collections are on-demand — kick off the first load at import so
// rows populate without waiting for an explicit preload/refetch.
void taskOrderLineCollection.preload().catch(() => {});

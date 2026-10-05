import { QueryClient } from "@tanstack/query-core";
import { queryCollectionOptions, parseLoadSubsetOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import type { LoadSubsetOptions } from "@tanstack/db";
import { query } from "../services/intacct/query";
import { create as createTaskOrderLine } from "../services/intacct/action/taskorder-lines";
import { update as updateTaskOrderLine } from "../services/intacct/action/taskorder-lines";
import { remove as removeTaskOrderLine } from "../services/intacct/action/taskorder-lines";

// ==========================================
// TASK ORDER LINES (live Intacct query collection)
//
// The lines grid binds directly to this collection — no draft layer.
// Reads come from the `taskorder_item` object via `queryFn`; every
// insert/update/delete writes straight through to Intacct via the
// onInsert/onUpdate/onDelete handlers below.
// ==========================================

export const TASKORDER_ITEM_OBJECT = "taskorder_item";

const TASKORDER_ITEM_FIELDS = [
  "id",
  "taskorder_item",
  "task",
  "quantity",
  "rate",
  "Rtaskorder_budget",
  "name",
] as const;

export interface TaskOrderLine {
  /** Collection key — Intacct RECORDNO once synced, `line-…` temp id until then. */
  id: string;
  /** Local taskOrderCollection key this line belongs to. */
  taskOrderId: string;
  /** Parent taskorder_budget RECORDNO — sent as Rtaskorder_budget on insert. */
  taskOrderRecordNo: string;
  description: string;
  /** Intacct STANDARDTASK RECORDNO. */
  task: string;
  quantity: number | "" | null;
  rate: number | "" | null;
  /** Created taskorder_item RECORDNO — filled in after the insert settles. */
  recordNo?: string;
}

/**
 * Collection fields → Intacct query fields. Live-query `eq` filters pushed
 * down by `useLiveSuspenseQuery` (e.g. `eq(c.taskOrderRecordNo, no)`) are
 * translated here; Intacct only supports equality, ascending order.
 * Local-only fields (e.g. `taskOrderId`) are dropped from the server query —
 * the live-query engine still enforces them client-side.
 */
const INTACCT_FIELD_MAP: Record<string, string> = {
  id: "id",
  recordNo: "id",
  description: "taskorder_item",
  task: "task",
  quantity: "quantity",
  rate: "rate",
  taskOrderRecordNo: "Rtaskorder_budget",
};

const numOrEmpty = (value: unknown): number | "" => {
  if (value === "" || value == null) return "";
  const n = typeof value === "number" ? value : Number(value);
  return Number.isNaN(n) ? "" : n;
};

export const taskOrderLinesClient = new QueryClient();

export const taskOrderLineCollection = createCollection(
  queryCollectionOptions<TaskOrderLine>({
    id: "task-order-lines",
    queryKey: ["task-order-lines"],
    queryFn: async (ctx) => {
      // Pushed-down live-query filters/sorts → Intacct where/orderBy.
      const meta = ctx.meta as { loadSubsetOptions?: LoadSubsetOptions } | undefined;
      const { filters: pushed, sorts, limit } = parseLoadSubsetOptions(meta?.loadSubsetOptions);
      const pushedFilters = pushed.flatMap((f) => {
        if (f.operator !== "eq") {
          throw new Error(`Unsupported filter operator for Intacct query: ${f.operator}`);
        }
        const intacctField = INTACCT_FIELD_MAP[f.field.join(".")];
        // Local-only field (e.g. taskOrderId) — skip server-side, the live
        // query engine still enforces it client-side.
        if (!intacctField) return [];
        return [{ [intacctField]: f.value }];
      });
      const [firstSort] = sorts;
      if (firstSort && firstSort.direction !== "asc") {
        throw new Error(`Intacct query only sorts ascending, got: ${firstSort.direction}`);
      }
      const orderField = firstSort
        ? (INTACCT_FIELD_MAP[firstSort.field.join(".")] ?? "id")
        : "id";

      try {
        const { data } = await query({
          object: TASKORDER_ITEM_OBJECT,
          fields: [...TASKORDER_ITEM_FIELDS],
          ...(pushedFilters.length > 0 ? { filters: pushedFilters } : {}),
          orderBy: orderField,
          ...(limit != null ? { limit } : {}),
        });

        return (data as unknown as Record<string, string>[]).flatMap((row) => {
          const recordNo = String(row.RECORDNO ?? "").trim();
          if (!recordNo) return [];
          return [
            {
              id: recordNo,
              taskOrderId: "",
              taskOrderRecordNo: String(row.RTASKORDER_BUDGET ?? ""),
              description: String(row.TASKORDER_ITEM ?? ""),
              task: String(row.TASK ?? ""),
              quantity: numOrEmpty(row.QUANTITY),
              rate: numOrEmpty(row.RATE),
              recordNo,
            } satisfies TaskOrderLine,
          ];
        });
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
    onInsert: async ({ transaction, collection }) => {
      await Promise.all(
        transaction.mutations.map(async (mutation) => {
          const row = mutation.modified;
          // Blank entry row (Add-line) — `taskorder_item` is required by
          // Intacct ("TaskOrder Item must be specified"), so keep the row
          // local-only until it has content. The first meaningful update
          // creates the Intacct record (see onUpdate below).
          if (!lineHasContent(row)) return;
          const result = await createTaskOrderLine({
            Rtaskorder_budget: row.taskOrderRecordNo,
            task: row.task,
            taskorder_item: row.description,
            quantity: row.quantity,
            rate: row.rate,
          });
          if (result.recordNo) {
            collection.update(mutation.key, (draft) => {
              draft.recordNo = result.recordNo;
            });
          }
        }),
      );
    },
    onUpdate: async ({ transaction, collection }) => {
      await Promise.all(
        transaction.mutations.map(async (mutation) => {
          const row = mutation.modified;
          if (!row.recordNo) {
            // Local-only row (blank on insert) — create the Intacct record
            // once it carries content, then write back the RECORDNO.
            if (!lineHasContent(row)) return;
            const result = await createTaskOrderLine({
              Rtaskorder_budget: row.taskOrderRecordNo,
              task: row.task,
              taskorder_item: row.description,
              quantity: row.quantity,
              rate: row.rate,
            });
            if (result.recordNo) {
              collection.update(mutation.key, (draft) => {
                draft.recordNo = result.recordNo;
              });
            }
            return;
          }
          // Only the insert write-back filling in recordNo (synced fields
          // unchanged) — nothing to push.
          if (sameTaskOrderLineFields(mutation.original, row)) return;
          await updateTaskOrderLine({
            recordNo: row.recordNo,
            Rtaskorder_budget: row.taskOrderRecordNo,
            task: row.task,
            taskorder_item: row.description,
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
          if (!row?.recordNo) return;
          await removeTaskOrderLine(row.recordNo);
        }),
      );
    },
  }),
);

/** A row carries submittable content (so Intacct accepts the create). */
function lineHasContent(row: Pick<TaskOrderLine, "description" | "task" | "quantity" | "rate">): boolean {
  if (String(row.description ?? "").trim() !== "") return true;
  if (String(row.task ?? "").trim() !== "") return true;
  const qty = typeof row.quantity === "number" ? row.quantity : Number(row.quantity);
  const rate = typeof row.rate === "number" ? row.rate : Number(row.rate);
  if (!Number.isNaN(qty) && qty !== 0) return true;
  if (!Number.isNaN(rate) && rate !== 0) return true;
  return false;
}

function sameTaskOrderLineFields(a: Partial<TaskOrderLine>, b: TaskOrderLine): boolean {  return (
    (a.taskOrderRecordNo ?? "") === (b.taskOrderRecordNo ?? "") &&
    (a.description ?? "") === (b.description ?? "") &&
    (a.task ?? "") === (b.task ?? "") &&
    (a.quantity ?? "") === (b.quantity ?? "") &&
    (a.rate ?? "") === (b.rate ?? "")
  );
}

// Query collections are on-demand — kick off the first load at import so
// rows populate without waiting for an explicit preload/refetch.
void taskOrderLineCollection.preload().catch(() => {});

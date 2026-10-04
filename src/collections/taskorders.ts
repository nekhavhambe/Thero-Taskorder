import { createCollection, localStorageCollectionOptions } from '@tanstack/react-db';
import { XMLParser } from '../services/intacct/parser';
import { create as createTaskOrder } from '../services/intacct/action/taskorder';
import type { CreateTaskOrderData } from '../services/intacct/action/taskorder';
import { create as createTaskOrderLine } from '../services/intacct/action/taskorder-lines';

/** Pulls the created RECORDNO out of a raw Intacct response. */
function parseRecordNo(text: string): string | undefined {
  try {
    const xml = new DOMParser().parseFromString(text, 'text/xml');
    return XMLParser.field(xml, 'RECORDNO') || undefined;
  } catch {
    return undefined;
  }
}

// ==========================================
// TASKORDER (header)
// ==========================================

export interface TaskOrder extends CreateTaskOrderData {
  /** Local key (storage + collection). */
  id: string;
  /** Created taskorder_budget RECORDNO — filled in after the insert settles. */
  recordNo?: string;
}

export const taskOrderCollection = createCollection(
  localStorageCollectionOptions<TaskOrder>({
    id: 'task-orders',
    storageKey: 'thero-task-orders',
    getKey: (item) => item.id,
    onInsert: async ({ transaction, collection }) => {
      await Promise.all(
        transaction.mutations.map(async (mutation) => {
          const row = mutation.modified;
          const text = await createTaskOrder({
            taskOrderName: row.taskOrderName,
            purchaseOrder: row.purchaseOrder,
            project: row.project,
            startDate: row.startDate,
            endDate: row.endDate,
          });
          const recordNo = parseRecordNo(text);
          if (recordNo) {
            collection.update(mutation.key, (draft) => {
              draft.recordNo = recordNo;
            });
          }
        }),
      );
    },
  }),
);

// ==========================================
// TASKORDER LINE DRAFTS (editable table rows)
//
// The lines grid reads/writes these directly — no local state.
// They carry no Intacct sync: submitting a task order copies the
// non-empty drafts into `taskOrderLineCollection` (whose onInsert
// creates each taskorder_item), then clears the drafts.
// ==========================================

export interface TaskOrderLineDraft {
  /** Local key (storage + collection). */
  id: string;
  description: string;
  /** Intacct STANDARDTASK RECORDNO. */
  task: string;
  quantity: number | '' | null;
  rate: number | '' | null;
}

export const taskOrderLineDraftCollection = createCollection(
  localStorageCollectionOptions<TaskOrderLineDraft>({
    id: 'task-order-line-drafts',
    storageKey: 'thero-task-order-line-drafts',
    getKey: (item) => item.id,
  }),
);

// ==========================================
// TASKORDER LINE (submitted — Intacct synced)
// ==========================================

export interface TaskOrderLine {
  /** Local key (storage + collection). */
  id: string;
  /** Local taskOrderCollection key this line belongs to. */
  taskOrderId: string;
  /** Created taskorder_budget RECORDNO — set once the header insert settles. */
  taskOrderRecordNo: string;
  description: string;
  /** Intacct STANDARDTASK RECORDNO. */
  task: string;
  quantity: number | '' | null;
  rate: number | '' | null;
  /** Created taskorder_item RECORDNO — filled in after the insert settles. */
  recordNo?: string;
}

export const taskOrderLineCollection = createCollection(
  localStorageCollectionOptions<TaskOrderLine>({
    id: 'task-order-lines',
    storageKey: 'thero-task-order-lines',
    getKey: (item) => item.id,
    onInsert: async ({ transaction, collection }) => {
      await Promise.all(
        transaction.mutations.map(async (mutation) => {
          const row = mutation.modified;
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
  }),
);

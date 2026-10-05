import { createCollection, localStorageCollectionOptions } from '@tanstack/react-db';
import { create as createTaskOrderLine } from '../services/intacct/action/taskorder-lines';
import { update as updateTaskOrderLine } from '../services/intacct/action/taskorder-lines';

// ==========================================
// LINE DRAFTS (editable table rows)
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
// SUBMITTED LINES (Intacct synced)
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
    onUpdate: async ({ transaction }) => {
      await Promise.all(
        transaction.mutations.map(async (mutation) => {
          const row = mutation.modified;
          // No Intacct record yet, or only the insert write-back filling in
          // recordNo (synced fields unchanged) — nothing to push.
          if (!row.recordNo || sameTaskOrderLineFields(mutation.original, row)) return;
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
  }),
);

function sameTaskOrderLineFields(a: Partial<TaskOrderLine>, b: TaskOrderLine): boolean {
  return (
    (a.taskOrderRecordNo ?? '') === (b.taskOrderRecordNo ?? '') &&
    (a.description ?? '') === (b.description ?? '') &&
    (a.task ?? '') === (b.task ?? '') &&
    (a.quantity ?? '') === (b.quantity ?? '') &&
    (a.rate ?? '') === (b.rate ?? '')
  );
}

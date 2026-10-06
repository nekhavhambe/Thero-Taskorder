import { useEffect, useRef } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { taskOrderLineCollection } from '../../../collections/task-order-lines';
import type { TaskOrderLine } from '../../../collections/task-order-lines';

export const TABLE_IMPORT_EVENT = 'thero:table-import';
export const TABLE_UPLOAD_EVENT = 'thero:table-upload';

/** Ask the mounted task-order lines table to open its importer (CSV/JSON). */
export function requestTableImport(): void {
  window.dispatchEvent(new CustomEvent(TABLE_IMPORT_EVENT));
}

/** Ask the mounted task-order lines table to open its supporting-docs picker. */
export function requestTableUpload(): void {
  window.dispatchEvent(new CustomEvent(TABLE_UPLOAD_EVENT));
}

// ==========================================
// ROW HELPERS
// ==========================================

export const createTaskOrderLineRow = (
  parent: Pick<TaskOrderLine, 'taskOrderId' | 'taskOrderRecordNo'> = {
    taskOrderId: '',
    taskOrderRecordNo: '',
  },
): TaskOrderLine => ({
  id: `line-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  taskOrderId: parent.taskOrderId,
  taskOrderRecordNo: parent.taskOrderRecordNo,
  description: '',
  task: '',
  quantity: 0,
  rate: 0,
});

// ==========================================
// CSV / JSON IMPORT (task-order line shape)
// ==========================================

export interface ImportedTaskOrderLine {
  description: string;
  task: string;
  quantity: number | '' | null;
  rate: number | '' | null;
}

export const parseCSVToTaskOrderLines = (csvText: string): ImportedTaskOrderLine[] => {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
  const descIdx = headers.findIndex((h) => h.includes('desc'));
  const taskIdx = headers.findIndex((h) => h.includes('task'));
  const qtyIdx = headers.findIndex((h) => h.includes('qty') || h.includes('quantity'));
  const rateIdx = headers.findIndex((h) => h.includes('rate') || h.includes('price'));

  const items: ImportedTaskOrderLine[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (rawLine.toUpperCase().startsWith('TOTAL')) continue;

    const fields: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let c = 0; c < rawLine.length; c++) {
      const char = rawLine[c];
      if (char === '"' && (c === 0 || rawLine[c - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        cur = '';
      } else {
        cur += char;
      }
    }
    fields.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

    if (fields.length <= 1 && fields[0] === '') continue;

    const qtyVal = qtyIdx !== -1 && fields[qtyIdx] ? Number(fields[qtyIdx]) : 0;
    const rateVal = rateIdx !== -1 && fields[rateIdx] ? Number(fields[rateIdx]) : 0;

    items.push({
      description: descIdx !== -1 ? fields[descIdx] || '' : fields[0] || '',
      task: taskIdx !== -1 ? fields[taskIdx] || '' : fields[1] || '',
      quantity: isNaN(qtyVal) ? 0 : qtyVal,
      rate: isNaN(rateVal) ? 0 : rateVal,
    });
  }

  return items;
};

export const parseJSONToTaskOrderLines = (jsonText: string): ImportedTaskOrderLine[] => {
  try {
    const parsed = JSON.parse(jsonText);
    const rawList = Array.isArray(parsed) ? parsed : parsed.items || [];
    if (!Array.isArray(rawList)) return [];

    return rawList.map((item: Record<string, unknown>) => ({
      description: String(item.description || item.task || ''),
      task: String(item.task || ''),
      quantity:
        item.quantity !== undefined && item.quantity !== ''
          ? Number(item.quantity)
          : item.qty !== undefined && item.qty !== ''
            ? Number(item.qty)
            : 0,
      rate: item.rate !== undefined && item.rate !== '' ? Number(item.rate) : 0,
    }));
  } catch (err) {
    console.error('Failed to parse JSON:', err);
    return [];
  }
};

// ==========================================
// FILE PICKERS HOOK (hidden inputs + handlers)
// ==========================================

export interface UseLineFilesOptions {
  taskOrderId?: string;
  taskOrderRecordNo?: string;
}

/**
 * Hidden file inputs plus their change handlers and the header-menu event
 * wiring. Render the returned elements alongside the grid.
 */
export function useLineFiles({
  taskOrderId = '',
  taskOrderRecordNo = '',
}: UseLineFilesOptions = {}): { fileInput: ReactNode; uploadInput: ReactNode } {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const openImport = () => fileInputRef.current?.click();
    const openUpload = () => uploadInputRef.current?.click();
    window.addEventListener(TABLE_IMPORT_EVENT, openImport);
    window.addEventListener(TABLE_UPLOAD_EVENT, openUpload);
    return () => {
      window.removeEventListener(TABLE_IMPORT_EVENT, openImport);
      window.removeEventListener(TABLE_UPLOAD_EVENT, openUpload);
    };
  }, []);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const items = file.name.endsWith('.json') ? parseJSONToTaskOrderLines(text)  : parseCSVToTaskOrderLines(text);

      if (items.length > 0) {
        const tx = taskOrderLineCollection.insert(
          items.map((item) => ({
            ...createTaskOrderLineRow({ taskOrderId, taskOrderRecordNo }),
            description: item.description,
            task: item.task,
            quantity: item.quantity,
            rate: item.rate,
          })),
        );
        await tx.when('settled');
      }
    } catch (err) {
      console.error('Failed to import file:', err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUploadChange = () => {
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  };

  return {
    fileInput: (
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv, .json, text/csv, application/json"
        className="hidden"
      />
    ),
    uploadInput: (
      <input
        type="file"
        ref={uploadInputRef}
        onChange={handleUploadChange}
        multiple
        className="hidden"
        aria-label="Upload supporting documents"
      />
    ),
  };
}

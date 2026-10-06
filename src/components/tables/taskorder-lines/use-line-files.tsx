import { useEffect, useRef } from "react";
import type { ChangeEvent } from "react";
import { taskOrderLineCollection } from "../../../collections/task-order-lines";
import { parseCSV } from "./utils/csv";

export const TABLE_IMPORT_EVENT = "thero:table-import";
export const TABLE_UPLOAD_EVENT = "thero:table-upload";


export function requestTableImport(): void {
  window.dispatchEvent(new CustomEvent(TABLE_IMPORT_EVENT));
}

export function requestTableUpload(): void {
  window.dispatchEvent(new CustomEvent(TABLE_UPLOAD_EVENT));
}


export interface Options {
  taskorder: { id: string };
}
export function useLineFiles({ taskorder }: Options) {

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
      const items = parseCSV(text);

      if (items.length > 0) {
        const tx = taskOrderLineCollection.insert(
          items.map((item) => ({
            id: `line-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            taskOrderId: taskorder?.id,
            taskOrderRecordNo: taskorder?.id,
            description: item.description,
            task: item.task,
            quantity: item.quantity,
            rate: item.rate,
          })),
        );
        await tx.when("settled");
      }
    } catch (err) {
      console.error("Failed to import file:", err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUploadChange = () => {
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  };

  return {
    fileInput: (
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv, text/csv"
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

import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Field } from "../../components/forms/field";
import { TextInput } from "../../components/inputs/textinput";
import { Autocomplete } from "../../components/inputs/autocomplete";
import { DatePicker } from "../../components/inputs/datepicker";
import {
  DataTable,
  SUPPORTED_CURRENCIES,
  TABLE_IMPORT_EVENT,
  TABLE_UPLOAD_EVENT,
  TotalsSummary,
  formatCurrency,
  parseCSVToLineItems,
  parseJSONToLineItems,
  parseNumeric,
} from "../../components/tables/entry-table";
import type { EntryColumn } from "../../components/tables/entry-table";
import { TOOLBAR_ACTION_EVENT } from "../../components/layouts/toolbar";
import type { ToolbarActionDetail } from "../../components/layouts/toolbar";
import type { Project } from "../../collections/projects";
import { projectCollection } from "../../collections/projects";
import {
  taskOrderCollection,
  taskOrderLineCollection,
  taskOrderLineDraftCollection,
} from "../../collections/taskorders";
import type { TaskOrderLineDraft } from "../../collections/taskorders";
import { useCollectionItems } from "../../collections/helpers";
import type { StandardTask } from "../../collections/standard-tasks";
import { standardTaskCollection } from "../../collections/standard-tasks";
import { useParams } from "../../hook/params";

export interface TaskOrderConfig {
  id?: string;
  name?: string;
  order?: string;
  project?: { key: string; name: string; id: string };
  date: { start: string; end: string };
}

const getStandardTaskKey = (task: StandardTask): string =>
  task.RECORDNO?.trim() ? task.RECORDNO : task.TASKID || task.NAME;

const draftValue = (row: TaskOrderLineDraft): number =>
  (parseNumeric(row.quantity) ?? 0) * (parseNumeric(row.rate) ?? 0);

const buildDraftColumns = (
  currencySymbol: string,
): EntryColumn<TaskOrderLineDraft>[] => [
  {
    key: "description",
    header: "Description",
    width: 320,
    align: "left",
    editor: { kind: "text" },
    footer: () => <span className="text-slate-900 font-bold">Total</span>,
  },
  {
    key: "task",
    header: "Task",
    width: 300,
    align: "left",
    editor: {
      kind: "autocomplete",
      collection: standardTaskCollection,
      displayFields: ["TASKID", "NAME"],
      searchFields: ["TASKID", "NAME", "RECORDNO"],
      getKey: getStandardTaskKey,
      placeholder: "Select a Task",
    },
  },
  {
    key: "quantity",
    header: "Qty",
    width: 110,
    align: "right",
    editor: { kind: "number", min: 0, placeholder: "0" },
  },
  {
    key: "rate",
    header: "Rate",
    width: 130,
    align: "right",
    editor: { kind: "number", min: 0, step: 0.01, placeholder: "0" },
  },
  {
    key: "value",
    header: "Value",
    width: 150,
    align: "right",
    display: (row) => (
      <div className="py-1.5 px-2 text-right tabular-nums text-xs text-slate-800">
        {formatCurrency(draftValue(row), currencySymbol)}
      </div>
    ),
    footer: (rows) => (
      <span className="font-bold text-slate-900">
        {formatCurrency(
          rows.reduce((sum, r) => sum + draftValue(r), 0),
          currencySymbol,
        )}
      </span>
    ),
  },
];

const createDraftRow = (): TaskOrderLineDraft => ({
  id: `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  description: "",
  task: "",
  quantity: 0,
  rate: 0,
});

const hasContent = (row: TaskOrderLineDraft): boolean =>
  row.description.trim() !== "" || row.task.trim() !== "";

const sameDraft = (  a: TaskOrderLineDraft,
  b: TaskOrderLineDraft,
): boolean =>
  a.description === b.description &&
  a.task === b.task &&
  a.quantity === b.quantity &&
  a.rate === b.rate;

export const TaskOrders = () => {
  const { id, endDate, name, projectId, projectName, projectKey, startDate } =
    useParams();

  const defaultValues = useMemo<TaskOrderConfig>(
    () => ({
      id: id ?? "",
      date: { start: startDate ?? "", end: endDate ?? "" },
      name: name ?? "",
      order: "",
      project: {
        key: projectKey ?? "",
        name: projectName ?? "",
        id: projectId ?? "",
      },
    }),
    [id, startDate, endDate, name, projectKey, projectName, projectId],
  );

  const { register, control, getValues, reset } = useForm<TaskOrderConfig>({
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  // Lines come straight from the drafts collection (liveQuery) — no local
  // entries state. Every table edit is reconciled into the collection below.
  const drafts = useCollectionItems<TaskOrderLineDraft>(
    taskOrderLineDraftCollection,
  );

  const [pageSize, setPageSize] = useState(10);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currency = SUPPORTED_CURRENCIES[0];
  const seededRef = useRef(false);

  // The grid needs at least one row to offer its "+" action, so the page
  // always keeps one blank draft around (blank rows never submit).
  const resetDrafts = (current: TaskOrderLineDraft[]) => {
    if (current.length > 0) {
      taskOrderLineDraftCollection.delete(current.map((d) => d.id));
    }
    taskOrderLineDraftCollection.insert(createDraftRow());
  };

  useEffect(() => {
    if (!seededRef.current && drafts.length === 0) {
      seededRef.current = true;
      taskOrderLineDraftCollection.insert(createDraftRow());
    }
  }, [drafts]);

  const columns = useMemo(
    () => buildDraftColumns(currency.symbol),
    [currency.symbol],
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const getProjectKey = (project: Project): string =>
    project.RECORDNO?.trim() ? project.RECORDNO : project.PROJECTID;

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Collection-direct CRUD: inserts/updates/deletes hit
  // taskOrderLineDraftCollection (local only — Intacct sync happens on
  // submit via taskOrderLineCollection's onInsert).
  const handleDraftsChange = (rows: TaskOrderLineDraft[]) => {
    const prev = new Map(drafts.map((d) => [d.id, d]));
    const nextIds = new Set(rows.map((r) => r.id));

    const removed = drafts.filter((d) => !nextIds.has(d.id));
    if (removed.length > 0) {
      taskOrderLineDraftCollection.delete(removed.map((d) => d.id));
    }

    for (const row of rows) {
      const old = prev.get(row.id);
      if (!old) {
        taskOrderLineDraftCollection.insert(row);
      } else if (!sameDraft(old, row)) {
        taskOrderLineDraftCollection.update(row.id, (draft) => {
          Object.assign(draft, row);
        });
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const items = file.name.endsWith(".json")
        ? parseJSONToLineItems(text)
        : parseCSVToLineItems(text);

      if (items.length > 0) {
        taskOrderLineDraftCollection.insert(
          items.map((item) => ({
            id: `draft-imported-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}`,
            description: item.description,
            task: item.task,
            quantity: item.qty,
            rate: item.rate,
          })),
        );
        showToast(`Imported ${items.length} line item(s).`);
      }
    } catch (err) {
      console.error("Failed to import file:", err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    if (files.length > 0) {
      const names = files.map((f) => f.name).join(", ");
      showToast(
        `Attached ${files.length} file${files.length === 1 ? "" : "s"}: ${names}`,
      );
    }
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  };

  // The header "..." menu triggers the table file pickers via these events.
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

  // Submission lives here: header insert first (onInsert creates the
  // taskorder_budget in Intacct), then one line insert per draft
  // (onInsert creates each taskorder_item against the created RECORDNO).
  const submitTaskOrder = async () => {
    if (isSubmitting) return;
    const v = getValues();
    const lines = drafts.filter(hasContent);

    if ((v.name ?? "").trim() === "") {
      showToast("Enter a task order name first.");
      return;
    }
    if (lines.length === 0) {
      showToast("Add at least one line item first.");
      return;
    }

    setIsSubmitting(true);
    showToast("Creating task order…");
    try {
      const headerId = `taskorder-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
      const headerTx = taskOrderCollection.insert({
        id: headerId,
        taskOrderName: v.name ?? "",
        purchaseOrder: v.order ?? "",
        project: v.project?.key ?? "",
        startDate: v.date.start,
        endDate: v.date.end,
      });
      await headerTx.when("settled");
      if (headerTx.state !== "completed") {
        throw new Error("Task order insert failed.");
      }
      const recordNo = taskOrderCollection.get(headerId)?.recordNo ?? "";
      if (recordNo === "") {
        throw new Error("Task order created but no record number returned.");
      }

      const linesTx = taskOrderLineCollection.insert(
        lines.map((line, index) => ({
          id: `${headerId}-line-${index}-${Date.now()}`,
          taskOrderId: headerId,
          taskOrderRecordNo: recordNo,
          description: line.description,
          task: line.task,
          quantity: line.quantity,
          rate: line.rate,
        })),
      );
      await linesTx.when("settled");
      if (linesTx.state !== "completed") {
        throw new Error("Task order lines insert failed.");
      }

      showToast(
        `Task order ${recordNo} created with ${lines.length} line(s).`,
      );
      resetDrafts(drafts);
      reset(defaultValues);
    } catch (err) {
      console.error(err);
      showToast(
        err instanceof Error ? err.message : "Failed to create task order.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toolbar drives the component: "New" resets, Generate / Issue submit.
  useEffect(() => {
    const handler = (e: Event) => {
      const { action, waitUntil } = (e as CustomEvent<ToolbarActionDetail>)
        .detail;
      if (action === "new") {
        reset(defaultValues);
        resetDrafts(drafts);
      } else if (action === "generate" || action === "issue") {
        waitUntil(submitTaskOrder());
      }
    };
    window.addEventListener(TOOLBAR_ACTION_EVENT, handler);
    return () => window.removeEventListener(TOOLBAR_ACTION_EVENT, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues, drafts, isSubmitting]);

  const untaxed = drafts.reduce((sum, d) => sum + draftValue(d), 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submitTaskOrder();
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv, .json, text/csv, application/json"
        className="hidden"
      />
      <input
        type="file"
        ref={uploadInputRef}
        onChange={handleUploadChange}
        multiple
        className="hidden"
        aria-label="Upload supporting documents"
      />
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-3.5 py-2 rounded-md shadow-lg border border-slate-700 animate-fade-in">
          {toastMessage}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Name"
          htmlFor="taskorder-name"
          labelWidth="w-40"
          orientation="row"
        >
          <TextInput id="taskorder-name" {...register("name")} />
        </Field>
        <Field
          label="Project"
          htmlFor="project"
          labelWidth="w-40"
          orientation="row"
        >
          <Controller
            name="project.key"
            control={control}
            render={({ field }) => (
              <Autocomplete<Project>
                id="project"
                name={field.name}
                collection={projectCollection}
                displayFields={["PROJECTID", "NAME"]}
                searchFields={["PROJECTID", "NAME", "RECORDNO"]}
                getKey={getProjectKey}
                value={field.value || null}
                onChange={(key) => field.onChange(key ?? "")}
                placeholder="TS-23-000033--Aries-Upington 400kV"
              />
            )}
          />
        </Field>
        <Field
          label="Start Date"
          htmlFor="start-date"
          labelWidth="w-40"
          orientation="row"
        >
          <Controller
            name="date.start"
            control={control}
            render={({ field }) => (
              <DatePicker
                id="start-date"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
        <Field
          label="End Date"
          htmlFor="end-date"
          labelWidth="w-40"
          orientation="row"
        >
          <Controller
            name="date.end"
            control={control}
            render={({ field }) => (
              <DatePicker
                id="end-date"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
        <Field
          label="Customer Reference"
          htmlFor="purchase-order"
          labelWidth="w-40"
          orientation="row"
        >
          <TextInput id="purchase-order" {...register("order")} />
        </Field>
      </div>
      <div className="mt-6 -mx-6 overflow-hidden rounded-b [&>div]:border-x-0 [&>div]:border-b-0">
        <DataTable<TaskOrderLineDraft>
          data={drafts}
          onChange={handleDraftsChange}
          columns={columns}
          createRow={createDraftRow}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          reorderable={false}
          minWidth={980}
        />
        <TotalsSummary
          untaxed={untaxed}
          taxRate={0.15}
          currencySymbol={currency.symbol}
        />
      </div>
    </form>
  );
};



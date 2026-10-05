import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Field } from "../../components/forms/field";
import { TextInput } from "../../components/inputs/textinput";
import { Autocomplete } from "../../components/inputs/autocomplete";
import { DatePicker } from "../../components/inputs/datepicker";
import {
  SUPPORTED_CURRENCIES,
  TaskOrderLinesTable,
} from "../../components/tables/taskorder-lines";
import type { Project } from "../../collections/projects";
import { projectCollection } from "../../collections/projects";
import { useParams } from "../../hook/params";

export interface TaskOrderConfig {
  id?: string;
  name?: string;
  order?: string;
  project?: { key: string; name: string; id: string };
  date: { start: string; end: string };
}

export const TaskOrders = () => {
  const { register, control } = useFormContext<TaskOrderConfig>();
  const { page } = useParams();
  const isNewPage = page === "new";
  const [pageSize, setPageSize] = useState(10);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const currency = SUPPORTED_CURRENCIES[0];

  const getProjectKey = (project: Project): string => project.RECORDNO?.trim() ? project.RECORDNO : project.PROJECTID;

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleImportSuccess = (count: number) => {
    showToast(`Imported ${count} line item(s).`);
  };

  const handleUploadSuccess = (files: File[]) => {
    const names = files.map((f) => f.name).join(", ");
    showToast(
      `Attached ${files.length} file${files.length === 1 ? "" : "s"}: ${names}`,
    );
  };

  return (
    <>
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
      {!isNewPage && (
        <div className="mt-6 -mx-6 overflow-hidden rounded-b [&>div]:border-x-0 [&>div]:border-b-0">
          <TaskOrderLinesTable
            currency={currency}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            onImportSuccess={handleImportSuccess}
            onUploadSuccess={handleUploadSuccess}
          />
        </div>
      )}
    </>
  );
};

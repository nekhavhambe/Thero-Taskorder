import { Controller, useFormContext } from "react-hook-form";
import { Field } from "../../components/forms/field";
import { TextInput } from "../../components/inputs/textinput";
import { Autocomplete } from "../../components/inputs/autocomplete";
import { DatePicker } from "../../components/inputs/datepicker";
import {
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
  const { register, control, getValues } = useFormContext<TaskOrderConfig>();
  const { page } = useParams();
  const isNewPage = page === "new";
  // Parent order id from the header form — scopes the lines grid below.
  const taskOrderId = getValues("id") ?? "";

  const getProjectKey = (project: Project): string => project.RECORDNO?.trim() ? project.RECORDNO : project.PROJECTID;

  return (
    <>
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
            taskorder={{ id: taskOrderId }}
          />
        </div>
      )}
    </>
  );
};

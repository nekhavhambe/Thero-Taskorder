import { useEffect } from 'react';
import type { FC } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Field } from '../../components/Field';
import { TextInput } from '../../components/TextInput';
import { Autocomplete } from '../../components/Autocomplete';
import { DatePicker } from '../../components/DatePicker';
import { TOOLBAR_ACTION_EVENT } from '../../components/Toolbar';
import type { ToolbarActionDetail } from '../../components/Toolbar';
import type { Project } from '../../components/types';
import { createProject, projectCollection } from '../../collections/projects';
import { submitNewTaskOrder } from '../../action/new-taskorder';

export interface TaskOrderHeaderData {
  taskOrderName: string;
  purchaseOrder: string;
  project: string;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
}

export interface TaskOrderHeaderProps {
  initialValues?: Partial<TaskOrderHeaderData>;
  onSubmit?: (data: TaskOrderHeaderData) => void;
}

const EMPTY: TaskOrderHeaderData = {
  taskOrderName: '',
  purchaseOrder: '',
  project: '',
  startDate: '',
  endDate: '',
};


export const TaskOrderHeader: FC<TaskOrderHeaderProps> = ({
  initialValues = {},
  onSubmit,
}) => {

  const { register, control, getValues } = useForm<TaskOrderHeaderData>({
    defaultValues: { ...EMPTY, ...initialValues },
  });

  const handleCreateProject = (name: string): Project => {
    return createProject(name);
  };

  // "New" resubmits the DOM form via the action; Generate / Issue bubble up via onSubmit.
  useEffect(() => {
    const handler = (e: Event) => {
      const { action, waitUntil } = (e as CustomEvent<ToolbarActionDetail>).detail;
      if (action === 'new') {
        const form = document.forms.namedItem('theForm');
        if (!form) {
          console.log('New clicked: no form named "theForm" found.');
          return;
        }
        const v = getValues();
        console.log('hook values:', v);
        waitUntil(
          submitNewTaskOrder(form, {
            values: {
              purchase_order: v.purchaseOrder,
              start_date: v.startDate,
              end_date: v.endDate,
              project: v.project,
              task_description: v.taskOrderName,
            },
          }).catch((err) => console.error(err)),
        );
      } else if (action === 'generate' || action === 'issue') {
        if (onSubmit) waitUntil(Promise.resolve().then(() => onSubmit(getValues())));
      }
    };
    window.addEventListener(TOOLBAR_ACTION_EVENT, handler);
    return () => window.removeEventListener(TOOLBAR_ACTION_EVENT, handler);
  }, [getValues, onSubmit]);


  return (
    <div className="grid grid-cols-2 gap-4">
          <Field label="Name" htmlFor="taskorder-name" labelWidth="w-32" orientation="row">
            <TextInput
              id="taskorder-name"
              {...register('taskOrderName')}
            />
          </Field>
          <Field label="Purchase Order" htmlFor="purchase-order" labelWidth="w-32" orientation="row">
            <TextInput
              id="purchase-order"
              {...register('purchaseOrder')}
            />
          </Field>
          <Field label="Project" htmlFor="project" labelWidth="w-32" orientation="row">
            <Controller
              name="project"
              control={control}
              render={({ field }) => (
                <Autocomplete<Project>
                  id="project"
                  name={field.name}
                  collection={projectCollection}
                  displayFields={['id', 'name']}
                  getKey={(project) => project.id}
                  value={field.value || null}
                  onChange={(key) => field.onChange(key ?? '')}
                  onCreate={handleCreateProject}
                  placeholder="TS-23-000033--Aries-Upington 400kV"
                />
              )}
            />
          </Field>
          <Field label="Start Date" htmlFor="start-date" labelWidth="w-32" orientation="row">
            <Controller
              name="startDate"
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
          <Field label="End Date" htmlFor="end-date" labelWidth="w-32" orientation="row">
            <Controller
              name="endDate"
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
    </div>
  );
};

export default TaskOrderHeader;

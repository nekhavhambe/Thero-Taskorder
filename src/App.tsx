import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { Layout, TaskOrders } from "./components";
import { SalesOrder } from "./page";
import { Requisitions } from "./page";
import { Cashflow } from "./page";
import { Tasks } from "./page";
import { toIsoDateParam } from "./hook/params";
import { useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { eq, useLiveSuspenseQuery } from "@tanstack/react-db";
import { projectCollection, taskOrderCollection } from "./collections";

export interface TaskOrderConfig {
  id?: string;
  name?: string;
  order?: string;
  project?: { key: string; name: string; id: string };
  date: { start: string; end: string };
}

function App() {
  const { data }: any = useLiveSuspenseQuery((q) =>
    q
      .from({ TaskOrders: taskOrderCollection })
      .join({ Project: projectCollection }, ({ TaskOrders, Project }) =>
        eq(TaskOrders.RPROJECT, Project.RECORDNO),
      )
      // .where(({ TaskOrders }) => eq(TaskOrders.ID, id))
      // .select(({ TaskOrders, Project }) => ({ ...TaskOrders, Project }))
      // .findOne(),
  );

  const defaultValues = useMemo<TaskOrderConfig>(
    () => ({
      id: data?.ID ?? "",
      date: {
        start: toIsoDateParam(data?.START_DATE),
        end: toIsoDateParam(data?.END_DATE),
      },
      name: data?.TASK_DESCRIPTION ?? "",
      order: data?.PURCHASE_ORDER ?? "",
      project: {
        key: data?.Project?.RECORDNO ?? "",
        name: data?.Project?.NAME ?? "",
        id: data?.Project?.PROJECTID ?? "",
      },
    }),
    [data],
  );

  const form = useForm<TaskOrderConfig>({
    defaultValues,
  });

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {JSON.stringify(data, null, 2)}
      <FormProvider {...form}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/task-order" replace />} />
            <Route path="/task-order" element={<TaskOrders />} />
            <Route path="/requisitions" element={<Requisitions />} />
            <Route path="/cashflow" element={<Cashflow />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route
              path="/sales-order"
              element={
                <SalesOrder
                  onSave={(data) => {
                    console.log("RFQ saved:", data);
                  }}
                />
              }
            />
            <Route
              path="/form"
              element={<Navigate to="/sales-order" replace />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/task-order" replace />} />
        </Routes>
      </FormProvider>
    </div>
  );
}

export default App;

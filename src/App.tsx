import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { Layout, TaskOrders } from "./components";
import { SalesOrder } from "./page";
import { Requisitions } from "./page";
import { Cashflow } from "./page";
import { Tasks } from "./page";
import { useParams, toIsoDateParam } from "./hook/params";
import { useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useLiveQuery } from "@tanstack/react-db";
import { taskOrderCollection } from "./collections";

export interface TaskOrderConfig {
  id?: string;
  name?: string;
  order?: string;
  project?: { key: string; name: string; id: string };
  date: { start: string; end: string };
}

function App() {

  const { id, endDate, name, projectId, projectName, projectKey, startDate } = useParams();

  const taskorder = useLiveQuery((q)=> q.from({TaskOrders: taskOrderCollection}));
  const defaultValues = useMemo<TaskOrderConfig>(
    () => ({
      id: id ?? "",
      date: { start: toIsoDateParam(startDate), end: toIsoDateParam(endDate) },
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

  const form = useForm<TaskOrderConfig>({
    defaultValues,
  });
  

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {JSON.stringify(taskorder.data, null, 2)}
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

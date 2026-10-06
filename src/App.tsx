import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { Layout, TaskOrders } from "./components";
import { SalesOrder } from "./page";
import { Requisitions } from "./page";
import { Cashflow } from "./page";
import { Tasks } from "./page";
import { toIsoDateParam, useParams } from "./hook/params";
import { Component, Suspense, useMemo } from "react";
import type { ReactNode } from "react";
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

function AppInner() {
  const { id } = useParams();
  const { data }: any = useLiveSuspenseQuery((q) =>
    q
      .from({ TaskOrders: taskOrderCollection })
      .join({ Project: projectCollection }, ({ TaskOrders, Project }) =>
        eq(TaskOrders?.RPROJECT ?? "", Project.RECORDNO),
      )
      .where(({ TaskOrders }) => eq(TaskOrders?.ID ?? "", id ?? ""))
      .select(({ TaskOrders, Project }) => ({ ...TaskOrders, Project }))
      .findOne(),
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
      {JSON.stringify(
        data?.map((el:any) => el?.ID),
        null,
        2,
      )}
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

class QueryErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    alert(`[app] query failed: ${error.message}`);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 p-8">
          <div className="max-w-xl rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            <div className="font-semibold">Could not load the task order.</div>
            <div className="mt-1 break-words">{this.state.error.message}</div>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="mt-3 rounded border border-red-400 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <QueryErrorBoundary>
      <Suspense
        fallback={
          <div className="min-h-screen bg-slate-50 p-8 text-sm text-slate-500">
            Loading task order…
          </div>
        }
      >
        <AppInner />
      </Suspense>
    </QueryErrorBoundary>
  );
}

export default App;

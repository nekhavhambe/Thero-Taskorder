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
import { useLiveSuspenseQuery, eq } from "@tanstack/react-db";
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
  // Template literals turn undefined into "undefined" — normalize first so a
  // missing ?id= param matches nothing instead of a phantom string.
  const idParam = String(id ?? "").trim();
  const { data: taskOrder }: any = useLiveSuspenseQuery((q) =>
    q
      .from({ TaskOrders: taskOrderCollection })
      .where(({ TaskOrders }) => eq(TaskOrders?.ID ?? "", idParam))
      .findOne(),
  );

    const { data: un }: any = useLiveSuspenseQuery((q) =>
    q
      .from({ TaskOrders: taskOrderCollection })
      // .where(({ TaskOrders }) => eq(TaskOrders?.ID ?? "", id ?? ""))
      .findOne(),
  );

  const rproject: string = taskOrder?.RPROJECT ?? "";
  const { data: project }: any = useLiveSuspenseQuery((q) =>
    q
      .from({ Project: projectCollection })
      .where(({ Project }) => eq(Project.RECORDNO, rproject))
      .findOne(),
  );

  const defaultValues = useMemo<TaskOrderConfig>(
    () => ({
      id: taskOrder?.ID ?? "",
      date: {
        start: toIsoDateParam(taskOrder?.START_DATE),
        end: toIsoDateParam(taskOrder?.END_DATE),
      },
      name: taskOrder?.TASK_DESCRIPTION ?? "",
      order: taskOrder?.PURCHASE_ORDER ?? "",
      project: {
        key: project?.RECORDNO ?? "",
        name: project?.NAME ?? "",
        id: project?.PROJECTID ?? "",
      },
    }),
    [taskOrder, project],
  );

  const form = useForm<TaskOrderConfig>({
    defaultValues,
  });

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {JSON.stringify(
        {
          taskOrder: taskOrder ?? null,
          nofilter: un,
          project: project?? null,
        },
        null,
        2,
      )}
     id {id} --
     project {rproject} --
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

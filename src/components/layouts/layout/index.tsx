import { useEffect, useState } from "react";
import type { FC, ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import * as Popover from "@radix-ui/react-popover";
import { Import, MoreVertical, Paperclip } from "lucide-react";
import {
  StatusChip,
  Toolbar,
  ToolbarButton,
  fireToolbarAction,
} from "../toolbar";
import type { ToolbarAction } from "../toolbar";
import {
  requestTableImport,
  requestTableUpload,
} from "../../tables/taskorder-lines";
import Container from "../container";
import { useParams } from "../../../hook/params";
import { useFormContext } from "react-hook-form";
import type { TaskOrderConfig } from "../../../App";
import { taskOrderCollection } from "../../../collections";

interface HeaderTab {
  id: string;
  label: string;
  badge?: string;
  /** Route to open when the tab is clicked (tabs without one are visual only). */
  to?: string;
}

const TABS: HeaderTab[] = [
  { id: "task-order", label: "Task Order", badge: "1", to: "/task-order" },
  { id: "sales-order", label: "Sales Order", badge: "1", to: "/form" },
  {
    id: "requisitions",
    label: "Requisitions",
    badge: "1",
    to: "/requisitions",
  },
  { id: "cashflow", label: "Cashflow", badge: "1", to: "/cashflow" },
  { id: "tasks", label: "Tasks", badge: "1", to: "/tasks" },
  { id: "estimates", label: "Estimates", badge: "1" },
  { id: "related", label: "Related", badge: "1" },
];

export interface LayoutProps {
  children?: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState("task-order");
  const [status, setStatus] = useState<"under" | "over">("under");
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  // ?page=new → header-fields-only mode: hide status pill, action buttons,
  // and (in the page) the lines table, so the user just captures the order.
  const isNewPage = params.page === "new";
  // Task-order page (edit mode) → the primary button becomes Save and
  // writes through taskOrderCollection.update instead of insert.
  const isTaskOrderPage =
    location.pathname.startsWith("/task-order") || activeTab === "task-order";
  const showSave = isTaskOrderPage && !isNewPage;

  useEffect(() => {
    if (location.pathname.startsWith("/form")) setActiveTab("sales-order");
    else if (location.pathname.startsWith("/task-order"))
      setActiveTab("task-order");
    else if (location.pathname.startsWith("/requisitions"))
      setActiveTab("requisitions");
    else if (location.pathname.startsWith("/cashflow"))
      setActiveTab("cashflow");
    else if (location.pathname.startsWith("/tasks")) setActiveTab("tasks");
  }, [location.pathname]);

  const handleTabClick = (tab: HeaderTab) => {
    setActiveTab(tab.id);
    if (tab.to) navigate(tab.to);
  };

  const setBusy = (key: string, busy: boolean) =>
    setPending((prev) => ({ ...prev, [key]: busy }));

  const runToolbarAction = (action: ToolbarAction) => {
    setBusy(action, true);
    void fireToolbarAction(action).finally(() => setBusy(action, false));
  };

  const runLocalAction = (key: string, fn: () => void) => {
    setBusy(key, true);
    try {
      fn();
    } finally {
      setBusy(key, false);
    }
  };
  const { getValues } = useFormContext<TaskOrderConfig>();

  return (
    <div>
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2">
        <div className="flex items-center gap-2">
          <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <Popover.Trigger asChild>
              <button
                type="button"
                title="More actions"
                aria-label="More actions"
                className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                sideOffset={4}
                align="start"
                className="z-50 min-w-45 bg-white border border-slate-200 rounded shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    requestTableImport();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Import className="w-3.5 h-3.5 text-sky-700" />
                  <span>Import</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    requestTableUpload();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                  <span>Upload</span>
                </button>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
          <div className="leading-tight">
            <div className="text-[11px] text-[#008784]">Taskorder</div>
            <div className="text-sm font-bold text-slate-900">
              {params.name || "New Task Order"}
            </div>
          </div>
        </div>
        {!isNewPage && (
          <nav
            aria-label="Record sections"
            className="flex items-stretch border border-slate-200 rounded-sm overflow-hidden ml-auto"
          >
          {TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab)}
                className={`flex items-start px-3 py-1 bg-white border-r border-slate-200 last:border-r-0 transition-colors ${
                  active ? "bg-slate-100" : "hover:bg-slate-50"
                }`}
              >
                <span className="leading-tight text-left">
                  <span className="block text-xs font-medium text-slate-800 whitespace-nowrap">
                    {tab.label}
                  </span>
                  {tab.badge && (
                    <span className="block text-[10px] leading-tight text-slate-500">
                      {tab.badge}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
          </nav>
        )}
      </header>
      <div className="pt-1 pb-4 rounded-md mt-2 grid grid-cols-[70%_40%]">
        <div>
          <Toolbar aside={isNewPage ? undefined : <StatusChip status={status} />}>
            <ToolbarButton
              variant="blue"
              loading={!!pending.new || !!pending.save}
              onClick={async () => {
                if (showSave) {
                  setBusy("save", true);
                  try {
                    const v = getValues();
                    const key = v.id || params.id;
                    if (!key) {
                      throw new Error("Missing task order id — cannot save.");
                    }
                    const saveTx = taskOrderCollection.update(key, (draft) => {
                      Object.assign(draft, {
                        taskOrderName: v.name ?? "",
                        purchaseOrder: v.order ?? "",
                        project: v.project?.key ?? "",
                        startDate: v.date.start,
                        endDate: v.date.end,
                      });
                    });
                    await saveTx.when("settled");
                    if (saveTx.state !== "completed") {
                      throw new Error("Task order save failed.");
                    }
                  } finally {
                    setBusy("save", false);
                  }
                  return;
                }
                setBusy("new", true);
                try {
                  const v = getValues();
                  const headerTx = taskOrderCollection.insert({
                    id: `taskorder-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
                } finally {
                  setBusy("new", false);
                }
              }}
            >
              {showSave ? "Save" : "New"}
            </ToolbarButton>
            {isNewPage ? null : (
              <>
                <ToolbarButton
                  variant="blue"
                  loading={!!pending.generate}
                  onClick={() => runToolbarAction("generate")}
                >
                  Generate Sales Order
                </ToolbarButton>
                <ToolbarButton
                  variant="grey"
                  loading={!!pending.issue}
                  onClick={() => runToolbarAction("issue")}
                >
                  Issue Requisition
                </ToolbarButton>
                <ToolbarButton
                  variant="grey"
                  loading={!!pending.allocate}
                  onClick={() =>
                    runLocalAction("allocate", () => navigate("/task-order"))
                  }
                >
                  Allocate Tasks
                </ToolbarButton>
                <ToolbarButton
                  variant="grey"
                  loading={!!pending.budget}
                  onClick={() =>
                    runLocalAction("budget", () =>
                      setStatus((prev) =>
                        prev === "under" ? "over" : "under",
                      ),
                    )
                  }
                >
                  Update Budget
                </ToolbarButton>
              </>
            )}
          </Toolbar>
          <Container>{children ?? <Outlet />}</Container>
        </div>
      </div>
    </div>
  );
};

export default Layout;

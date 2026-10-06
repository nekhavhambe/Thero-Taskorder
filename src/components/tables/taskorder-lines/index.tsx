import { useMemo } from "react";
import { eq } from "@tanstack/react-db";
import { Table } from "../entry-table";
import { taskOrderLineCollection } from "../../../collections/task-order-lines";
import type { TaskOrderLine } from "../../../collections/task-order-lines";
import { buildTaskOrderLineColumns } from "./utils/columns";
import { TotalsSummary } from "./element/totals";
import { useImport } from "./utils/import";

interface TaskOrderLinesTableProps {
  taskorder?: { id: string };
  show?:{
     totals? : boolean;
  }
}

export const TaskOrderLinesTable: React.FC<TaskOrderLinesTableProps> = ({taskorder, show}) => {
  
  const id = taskorder?.id ?? "";
  const columns = useMemo(() => buildTaskOrderLineColumns(), []);
  const { fileInput, uploadInput } = useImport({ taskorder: { id: id } });

  return (
    <>
      {fileInput}
      {uploadInput}
      <Table<TaskOrderLine>
        config={{
          collection: taskOrderLineCollection,
          fn: {
            query: (q) => q.where(({ c }: any) => eq(c.RTASKORDER_BUDGET, id)),
            create: () =>
              taskOrderLineCollection.insert({
                id: `line-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                taskorder_item: "",
                task: "",
                quantity: "",
                rate: "",
                RTASKORDER_BUDGET: id,
                nane: "",
              } as TaskOrderLine),
            update: ({ row, field, value }) =>
              taskOrderLineCollection.update(row.id, (draft) => {
                (draft as Record<string, unknown>)[field] = value;
              }),
            remove: ({ row }) => taskOrderLineCollection.delete(row.id),
          },
          column: { columns },
          row: {
            minWidth: 980,
            enable: { reorderable: false },
          },
        }}
      />
      {show?.totals && <TotalsSummary />}
    </>
  );
};

export default TaskOrderLinesTable;

import { useMemo } from "react";
import { eq } from "@tanstack/react-db";
import { Table } from "../entry-table";
import { taskOrderLineCollection } from "../../../collections/task-order-lines";
import type { TaskOrderLine } from "../../../collections/task-order-lines";
import { buildTaskOrderLineColumns } from "./utils/columns";
import { TotalsSummary } from "./element/totals";
import { useLineFiles } from "./use-line-files";

interface TaskOrderLinesTableProps {
  taskorder?: { id: string };
  show?:{
     totals? : boolean;
  }
}

export const TaskOrderLinesTable: React.FC<TaskOrderLinesTableProps> = ({
  taskorder,
  show,
}) => {
  
  const id = taskorder?.id ?? "";
  const columns = useMemo(() => buildTaskOrderLineColumns(), []);
  const { fileInput, uploadInput } = useLineFiles({ taskorder: { id: id } });

  return (
    <>
      {fileInput}
      {uploadInput}
      <Table<TaskOrderLine>
        config={{
          collection: taskOrderLineCollection,
          fn: {
            query: (q) => q.where(({ c }: any) => eq(c.taskOrderId, id)),
            create: () => ({
              id: `line-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              taskOrderId: id,
              taskOrderRecordNo: "",
              description: "",
              task: "",
              quantity: 0,
              rate: 0,
            }),
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

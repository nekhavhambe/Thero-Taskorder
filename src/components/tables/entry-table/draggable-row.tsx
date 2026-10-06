import { flexRender } from "@tanstack/react-table";
import type { Row } from "@tanstack/react-table";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ==========================================
// DRAGGABLE ROW
// ==========================================

export function DraggableRow<T>({ row }: { row: Row<T> }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: (row.original as { id: string }).id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
    position: isDragging ? "relative" : undefined,
    fontFamily: "Arial, Helvetica, sans-serif",
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group transition-colors duration-150 border-b border-slate-200 ${
        isDragging
          ? "bg-sky-50/90 shadow-md ring-1 ring-sky-300"
          : "bg-white hover:bg-slate-50/80"
      }`}
    >
      {row.getVisibleCells().map((cell) => {
        const isDragColumn = cell.column.id === "dragHandle";
        return (
          <td
            key={cell.id}
            className={`py-0 px-1.5 text-xs text-slate-700 align-middle ${
              isDragColumn ? "text-center" : ""
            }`}
          >
            {isDragColumn ? (
              <div
                {...attributes}
                {...listeners}
                title="Drag to reorder row"
                className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-700 active:text-sky-600 cursor-grab active:cursor-grabbing hover:bg-slate-100 rounded transition-colors"
              >
                <div
                  className="flex flex-col gap-[2.5px] items-center justify-center w-3.5"
                  aria-hidden="true"
                >
                  <span className="w-3.5 h-[1.5px] bg-slate-500 rounded-sm"></span>
                  <span className="w-3.5 h-[1.5px] bg-slate-500 rounded-sm"></span>
                  <span className="w-3.5 h-[1.5px] bg-slate-500 rounded-sm"></span>
                </div>
              </div>
            ) : (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            )}
          </td>
        );
      })}
    </tr>
  );
}

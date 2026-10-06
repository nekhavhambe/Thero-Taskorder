import { intacct } from "..";
import { XMLParser } from "../parser";

export interface CreateTaskOrderLineData {
  Rtaskorder_budget: string;
  task: string;
  task_id?: string;
  item_id?: string;
  taskorder_item?: string;
  quantity?: number | string | "" | null;
  rate?: number | string | "" | null;
}

export interface CreateTaskOrderLineResult {
  status?: string;
  text: string;
  recordNo?: string;
}

const num = (value: unknown): string => {
  if (value === "" || value == null) return "";
  const n = typeof value === "number" ? value : Number(value);
  return Number.isNaN(n) ? "" : String(n);
};

const str = (value: unknown): string => value === undefined || value === null ? "" : String(value);

export async function create( data: CreateTaskOrderLineData ): Promise<CreateTaskOrderLineResult> {
  const { xml, status, text } = await intacct(`
      <function controlid="create_taskorder_line">
        <create>
          <taskorder_item>
            <taskorder_item>${XMLParser.escapeXml(str(data.taskorder_item))}</taskorder_item>
            <task>${XMLParser.escapeXml(str(data.task))}</task>
            <task_id>${XMLParser.escapeXml(str(data.task_id))}</task_id>
            <item_id>${XMLParser.escapeXml(str(data.item_id))}</item_id>
            <quantity>${XMLParser.escapeXml(num(data.quantity))}</quantity>
            <rate>${XMLParser.escapeXml(num(data.rate))}</rate>
            <Rtaskorder_budget>${XMLParser.escapeXml(str(data.Rtaskorder_budget))}</Rtaskorder_budget>
          </taskorder_item>
        </create>
      </function>`);

  if (status !== "success") {
    throw new Error(`taskorder_item create failed: ${text.slice(0, 500)}`);
  }

  // Standard objects return RECORDNO; this custom object keys by `id`.
  const recordNo =
    XMLParser.field(xml, "RECORDNO") || XMLParser.field(xml, "ID") || undefined;
  return { status, text, recordNo };
}

export interface UpdateTaskOrderLineData extends CreateTaskOrderLineData {
  /** Created taskorder_item RECORDNO — identifies the record to update. */
  recordNo: string;
}

export interface UpdateTaskOrderLineResult {
  status?: string;
  text: string;
}

export async function update(data: UpdateTaskOrderLineData): Promise<UpdateTaskOrderLineResult> {
  const { status, text } = await intacct(`
      <function controlid="update_taskorder_line">
        <update>
          <taskorder_item key="${XMLParser.escapeXml(data.recordNo)}">
            <taskorder_item>${XMLParser.escapeXml(str(data.taskorder_item))}</taskorder_item>
            <task>${XMLParser.escapeXml(str(data.task))}</task>
            <task_id>${XMLParser.escapeXml(str(data.task_id))}</task_id>
            <item_id>${XMLParser.escapeXml(str(data.item_id))}</item_id>
            <quantity>${XMLParser.escapeXml(num(data.quantity))}</quantity>
            <rate>${XMLParser.escapeXml(num(data.rate))}</rate>
            <Rtaskorder_budget>${XMLParser.escapeXml(str(data.Rtaskorder_budget))}</Rtaskorder_budget>
          </taskorder_item>
        </update>
      </function>`);

  if (status !== "success") {
    throw new Error(`taskorder_item update failed: ${text.slice(0, 500)}`);
  }

  return { status, text };
}

export interface DeleteTaskOrderLineResult {
  status?: string;
  text: string;
}

export async function remove(recordNo: string): Promise<DeleteTaskOrderLineResult> {
  const { status, text } = await intacct(`
      <function controlid="delete_taskorder_line">
        <delete>
          <taskorder_item key="${XMLParser.escapeXml(recordNo)}" />
        </delete>
      </function>`);

  if (status !== "success") {
    throw new Error(`taskorder_item delete failed: ${text.slice(0, 500)}`);
  }

  return { status, text };
}

import { intacct } from "..";
import { XMLParser } from "../parser";

export interface CreateTaskOrderLineData {
  Rtaskorder_budget: string;
  task: string;
  task_id?: string;
  item_id?: string;
  taskorder_item?: string;
  quantity?: number | "" | null;
  rate?: number | "" | null;
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

  return { status, text, recordNo: XMLParser.field(xml, "RECORDNO") || undefined };
}

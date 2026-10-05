import { XMLParser } from '../parser';
import { intacct } from '..';
import { toIntacctDate } from './utils/date';

export interface CreateTaskOrderData {
  taskOrderName: string;
  purchaseOrder: string;
  project?: string;
  startDate: string;
  endDate: string;
}

export async function create(data: CreateTaskOrderData): Promise<string> {
  // intacct() routes through the parent bridge when this page has no session.
  const { text } = await intacct(`
      <function controlid="create">
        <create>
          <taskorder_budget>
             <task_description>${XMLParser.escapeXml(data.taskOrderName)}</task_description>
             <purchase_order>${XMLParser.escapeXml(data.purchaseOrder)}</purchase_order>
             <start_date>${XMLParser.escapeXml(toIntacctDate(data.startDate))}</start_date>
             <end_date>${XMLParser.escapeXml(toIntacctDate(data.endDate))}</end_date>
           </taskorder_budget>
        </create>
      </function>`);

  return text;
}

export interface UpdateTaskOrderData extends CreateTaskOrderData {
  /** Created taskorder_budget RECORDNO — identifies the record to update. */
  recordNo: string;
}

export interface UpdateTaskOrderResult {
  status?: string;
  text: string;
}

export async function update(data: UpdateTaskOrderData): Promise<UpdateTaskOrderResult> {
  const { status, text } = await intacct(`
      <function controlid="update_taskorder">
        <update>
          <taskorder_budget key="${XMLParser.escapeXml(data.recordNo)}">
             <task_description>${XMLParser.escapeXml(data.taskOrderName)}</task_description>
             <purchase_order>${XMLParser.escapeXml(data.purchaseOrder)}</purchase_order>
             <start_date>${XMLParser.escapeXml(toIntacctDate(data.startDate))}</start_date>
             <end_date>${XMLParser.escapeXml(toIntacctDate(data.endDate))}</end_date>
           </taskorder_budget>
        </update>
      </function>`);

  if (status !== "success") {
    throw new Error(`taskorder_budget update failed: ${text.slice(0, 500)}`);
  }

  return { status, text };
}

import { XMLParser } from '../parser';
import { intacct } from '..';
import { hasSession } from '../utils/session';
import { toIntacctDate } from './utils/date';
import { CallOptions } from 'penpal';
import { getParentApi } from '../../../bridge/child';

export interface CreateTaskOrderData {
  taskOrderName: string;
  purchaseOrder: string;
  project?: string;
  startDate: string;
  endDate: string;
}

/** Iframe form values mapped onto the parent page form fields. */
function toParentValues(data: CreateTaskOrderData): Record<string, string> {
  return {
    purchase_order: data.purchaseOrder,
    task_description: data.taskOrderName,
    ...(data.project ? { RPROJECT: data.project } : {}),
    start_date: toIntacctDate(data.startDate),
    end_date: toIntacctDate(data.endDate),
  };
}

/**
 * Fills the live page form with values and POSTs it, returning the response
 * text. Always runs on the parent page — never call this from the iframe.
 */
export async function submitTaskOrderForm(values: Record<string, string>): Promise<string> {
  const form = document.getElementById("theForm");
  if (!(form instanceof HTMLFormElement)) {
    throw new Error("Form #theForm not found");
  }
  const formData = new FormData(form);
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  const response = await fetch(form.action, {
    method: "POST",
    body: formData,
    credentials: "include"
  });

  const result = await response.text();
  alert(`[taskorder create] status=${response.status} chars=${result.length}`);
  return result;
}

export async function create(data: CreateTaskOrderData): Promise<string> {
  // Session present = we ARE the parent: submit the parent form directly.
  // No session = iframe: ask the parent to fill + submit its form.
  if (hasSession()) {
    alert('[taskorder create] on parent — submit parent form');
    return submitTaskOrderForm(toParentValues(data));
  }
  alert('[taskorder create] on iframe — ask parent to submit');
  const parent = await getParentApi();
  const res = await parent.submitForm(
    { values: toParentValues(data) },
    new CallOptions({ timeout: 60000 }),
  );
  return res.text;
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

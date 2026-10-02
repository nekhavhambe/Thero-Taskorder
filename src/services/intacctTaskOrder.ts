import type { TaskOrderHeaderData } from '../page/new';

declare global {
  interface Window {
    _sess?: string;
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Convert 'YYYY-MM-DD' -> 'MM/DD/YYYY' (Intacct format). Falls back to raw value. */
function toIntacctDate(isoDate: string): string {
  if (!isoDate) return '';
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${m}/${d}/${y}`;
  }
  return isoDate;
}

/**
 * Fires the Intacct `create taskorder_budget` call for the "New" toolbar action.
 * Uses the live form values (not hardcoded test data).
 */
export async function createTaskOrderBudget(data: TaskOrderHeaderData): Promise<string> {
  const sessionId = window._sess;
  if (!sessionId) {
    throw new Error('Missing Intacct session: window._sess is not set.');
  }

  const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <control>
    <senderid>null</senderid>
    <password>null</password>
    <controlid>controlid</controlid>
    <uniqueid>false</uniqueid>
    <dtdversion>3.0</dtdversion>
  </control>
  <operation>
    <authentication>
      <sessionid>${escapeXml(sessionId)}</sessionid>
    </authentication>
    <content>
      <function controlid="controlid">
        <create>
          <taskorder_budget>
             <task_description>${escapeXml(data.taskOrderName)}</task_description>
             <purchase_order>${escapeXml(data.purchaseOrder)}</purchase_order>
             <start_date>${escapeXml(toIntacctDate(data.startDate))}</start_date>
             <end_date>${escapeXml(toIntacctDate(data.endDate))}</end_date>
           </taskorder_budget>
        </create>
      </function>
    </content>
  </operation>
</request>`;

  const response = await fetch(
    `https://www-p04.intacct.com/ia/xml/ajaxgw.phtml?.sess=${encodeURIComponent(sessionId)}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ xmlrequest: xmlRequest }),
      credentials: 'include',
    },
  );

  const text = await response.text();
  console.log(text);
  return text;
}

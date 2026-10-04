import { XMLParser } from '../parser';
import { ENDPOINT } from '../utils/constant';
import { session } from '../utils/session';
import { toIntacctDate } from './utils/date';

export interface CreateTaskOrderData {
  taskOrderName: string;
  purchaseOrder: string;
  project?: string;
  startDate: string;
  endDate: string;
}

export async function create(data: CreateTaskOrderData): Promise<string> {
  const id = session();
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
      <sessionid>${XMLParser.escapeXml(id)}</sessionid>
    </authentication>
    <content>
      <function controlid="controlid">
        <create>
          <taskorder_budget>
             <task_description>${XMLParser.escapeXml(data.taskOrderName)}</task_description>
             <purchase_order>${XMLParser.escapeXml(data.purchaseOrder)}</purchase_order>
             <start_date>${XMLParser.escapeXml(toIntacctDate(data.startDate))}</start_date>
             <end_date>${XMLParser.escapeXml(toIntacctDate(data.endDate))}</end_date>
           </taskorder_budget>
        </create>
      </function>
    </content>
  </operation>
</request>`;

  const response = await fetch(
    `${ENDPOINT}?.sess=${encodeURIComponent(id)}`,
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
  return text;
}

import { ENDPOINT } from './utils/constant';
import { request } from './utils/request';
import { hasSession, session } from './utils/session';
import { intacctViaBridge } from '../../bridge/child';

export interface IntacctFunctionResult {
  text: string;
  xml: Document;
  status?: string;
}


export async function intacct(body: string): Promise<IntacctFunctionResult> {
  // No session means this page runs iframed — route through the parent bridge.
  if (!hasSession()) {
    alert('[intacct] no local session — via bridge');
    return intacctViaBridge(body);
  }
  const id = session();
  const response = await fetch(`${ENDPOINT}?.sess=${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ xmlrequest: request(body) }),
    credentials: 'include',
  });

  const text = await response.text();
  const xml = new DOMParser().parseFromString(text, 'text/xml');
  const status = xml.querySelector('result > status')?.textContent ?? undefined;
      const blob = new Blob([text as any], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `error--${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
  return { text, xml, status };
}

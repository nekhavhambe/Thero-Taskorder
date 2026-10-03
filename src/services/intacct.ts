declare global {
  interface Window {
    _sess?: string;
  }
}

const GATEWAY = 'https://www-p04.intacct.com/ia/xml/ajaxgw.phtml';

/** Live Intacct session injected by the platform page. Throws when absent (e.g. standalone/Pages). */
export function getIntacctSessionId(): string {
  const sessionId = window._sess;
  if (!sessionId) {
    throw new Error('Missing Intacct session: window._sess is not set.');
  }
  return sessionId;
}

export function intacctRequestXml(fnBody: string, sessionId: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <control><senderid>null</senderid><password>null</password><controlid>controlid</controlid><uniqueid>false</uniqueid><dtdversion>3.0</dtdversion></control>
  <operation>
    <authentication><sessionid>${sessionId}</sessionid></authentication>
    <content>${fnBody}</content>
  </operation>
</request>`;
}

export interface IntacctFunctionResult {
  text: string;
  xml: Document;
  status?: string;
}

/** POSTs one <function> body to the XML gateway and parses the response. */
export async function sendIntacctFunction(fnBody: string): Promise<IntacctFunctionResult> {
  const sessionId = getIntacctSessionId();
  const response = await fetch(`${GATEWAY}?.sess=${encodeURIComponent(sessionId)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ xmlrequest: intacctRequestXml(fnBody, sessionId) }),
    credentials: 'include',
  });
  const text = await response.text();
  const xml = new DOMParser().parseFromString(text, 'text/xml');
  const status = xml.querySelector('result > status')?.textContent ?? undefined;
  return { text, xml, status };
}

/** Case-insensitive descendant tag lookup (mirrors the commented console snippets). */
export function intacctField(root: Element | Document, tag: string): string | undefined {
  const els = root.getElementsByTagName('*');
  for (let i = 0; i < els.length; i += 1) {
    if (els[i].tagName.toUpperCase() === tag.toUpperCase()) {
      return els[i].textContent ?? undefined;
    }
  }
  return undefined;
}

import { intacct } from '..';
import { XMLParser } from '../parser';
import { hasSession } from '../utils/session';
import { intacctViaBridge } from '../../../bridge/child';


export interface QueryObjectOptions {
  object: string;
  fields: string[];
  sums?: string[];
  counts?: string[];
  filters?: Record<string, string | number | boolean | undefined>[];
  orderBy?: string;
  limit?: number;
  offset?: number;
}

export interface QueryObjectResult {
  data: Record<string, string>[];
  limit: number;
  offset: number;
  count: number;
  type: string | null;
  remaining: number;
}


export async function query(
  options: QueryObjectOptions,
): Promise<QueryObjectResult> {



  const { object, fields, sums = [], counts = [], filters = [], orderBy, limit = 500, offset = 0 } = options;
  const selectXml = [
    ...fields.map((f) => `<field>${XMLParser.escapeXml(f)}</field>`),
    ...sums.map((f) => `<sum>${XMLParser.escapeXml(f)}</sum>`),
    ...counts.map((f) => `<count>${XMLParser.escapeXml(f)}</count>`),
  ].join('\n          ');
  const orderField = orderBy ?? fields[0];
  const filterXml = XMLParser.buildFilterXml(filters);
  const size = Math.min(Math.max(limit, 1), 1000);
  const start = Math.max(offset, 0);

  const fnBody = `
      <function controlid="query">
        <query>
          <object>${XMLParser.escapeXml(object)}</object>
          <select>
          ${selectXml}
          </select>${filterXml}${orderField ? `
          <orderby>
            <order><field>${XMLParser.escapeXml(orderField)}</field><ascending /></order>
          </orderby>` : ''}
          <pagesize>${size}</pagesize>
          <offset>${start}</offset>
        </query>
      </function>`;

  // No session means this page runs iframed — route through the parent bridge.
  const via = hasSession() ? 'direct' : 'bridge';
  alert(`[query] ${object} via ${via}`);

  let xml: Document;
  let status: string | undefined;
  let text: string;
  try {
    const res = via === 'direct' ? await intacct(fnBody) : await intacctViaBridge(fnBody);
    xml = res.xml;
    status = res.status;
    text = res.text;
  } catch (err) {
    alert(`FAILED:${(err as Error).message}`);
    console.error(`[query] ${object} via ${via} FAILED:`, err);
    const blob = new Blob([err as any], { type: "text/plain;charset=utf-8" });
const url = URL.createObjectURL(blob);

const a = document.createElement("a");
a.href = url;
a.download = `error-${object}-${Date.now()}.txt`;
document.body.appendChild(a);
a.click();
a.remove();

URL.revokeObjectURL(url);
    throw err;
  }

  if (status !== 'success') {
    alert(`[query] ${object} status=${status} FAILED: ${text.slice(0, 200)}`);
    throw new Error(`${object} query failed: ${text.slice(0, 500)}`);
  }

  const meta = XMLParser.listMeta(xml);
  const data = [...xml.getElementsByTagName(object)].map((rec) => XMLParser.elementToJson(rec));
  alert(`[query] ${object} status=${status} rows=${data.length}`);

  return {
    data,
    limit: size,
    offset: meta.offset || start,
    count: meta.count,
    type: meta.listType,
    remaining: meta.numRemaining,
  };
}

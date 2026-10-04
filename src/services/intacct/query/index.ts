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
  const { xml, status, text } = hasSession()
    ? await intacct(fnBody)
    : await intacctViaBridge(fnBody);

  if (status !== 'success') {
    throw new Error(`${object} query failed: ${text.slice(0, 500)}`);
  }

  const meta = XMLParser.listMeta(xml);

  return {
    data: [...xml.getElementsByTagName(object)].map((rec) => XMLParser.elementToJson(rec)),
    limit: size,
    offset: meta.offset || start,
    count: meta.count,
    type: meta.listType,
    remaining: meta.numRemaining,
  };
}

export interface QueryListMeta {
  listType: string | null;
  totalCount: number;
  offset: number;
  count: number;
  numRemaining: number;
}

export class XMLParser {
  static escapeXml(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }

  static listMeta(xml: Document): QueryListMeta {
    const dataEl = xml.getElementsByTagName("data")[0];
    const intAttr = (name: string): number => {
      const raw = dataEl?.getAttribute(name) ?? dataEl?.getAttribute(name.toLowerCase());
      return raw != null ? parseInt(raw, 10) || 0 : 0;
    };
    const strAttr = (name: string): string | null =>  dataEl?.getAttribute(name) ?? dataEl?.getAttribute(name.toLowerCase()) ?? null;
    return {
      listType: strAttr("listtype"),
      totalCount: intAttr("totalcount"),
      offset: intAttr("offset"),
      count: intAttr("count"),
      numRemaining: intAttr("numremaining"),
    };
  }

  static elementToJson(record: Element): Record<string, string> {
    const json: Record<string, string> = {};
    for (const child of record.children) {
      const tag = child.tagName.toUpperCase();
      json[tag] ??= child.textContent ?? "";
    }
    return json;
  }

  static buildFilterXml(
    filters: Record<string, string | number | boolean | undefined>[],
  ): string {
    const conditions = filters
      .flatMap((filter) => Object.entries(filter))
      .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
      .map(
        ([field, value]) => `
              <equalto>
                <field>${XMLParser.escapeXml(field)}</field>
                <value>${XMLParser.escapeXml(String(value))}</value>
              </equalto>`,
      );
    if (conditions.length === 0) return "";
    if (conditions.length === 1) return `\n<filter>${conditions[0]}\n</filter>`;
    return `\n<filter>\n<and>${conditions.join("")}\n</and>\n</filter>`;
  }

  static field(root: Element | Document, tag: string): string | undefined {
    const els = root.getElementsByTagName("*");
    for (let i = 0; i < els.length; i += 1) {
      if (els[i].tagName.toUpperCase() === tag.toUpperCase()) {
        return els[i].textContent ?? undefined;
      }
    }
    return undefined;
  }
}

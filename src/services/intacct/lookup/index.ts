import { intacct } from "..";
import { XMLParser } from "../parser";

export interface ObjectLookup {
  object: string;
  fields: string[];
  status: string[];
}


export async function lookupObjectFields(object: string): Promise<ObjectLookup> {
  const name = object.trim();
  if (!name) throw new Error("lookupObjectFields: object is required.");

  const { xml, status, text } = await intacct( `<function controlid="object"><lookup><object>${XMLParser.escapeXml(name)}</object></lookup></function>`);
  if (status !== "success") { throw new Error(`${name} lookup failed: ${text.slice(0, 500)}`);}

  const fieldEls = [...xml.getElementsByTagName("Field")];
  const idOf = (f: Element) => f.getElementsByTagName("ID")[0]?.textContent ?? "";
  const statusEl = fieldEls.find((f) => idOf(f).toUpperCase() === "STATUS");

  return {
    object: name,
    fields: fieldEls.map(idOf).filter((id) => id !== ""),
    status: statusEl? [...statusEl.getElementsByTagName("VALIDVALUE")].map((v) => v.textContent ?? "") : [],
  };
}

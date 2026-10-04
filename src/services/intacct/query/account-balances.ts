import { intacct } from "..";
import { XMLParser } from "../parser";

export interface Option {
  accountGroup: string;
  reportingPeriod?: string;
  showZeroBalances?: boolean;
  userDefinedDimension?: {
    object: string;
    record: string;
  };
}

export interface Result {
  data: Record<string, string>[];
  offset: number;
  count: number;
  type: string | null;
  remaining: number;
}

export async function accountBalances(options: Option): Promise<Result> {
  const {
    accountGroup,
    reportingPeriod = "Inception to Date",
    showZeroBalances = false,
    userDefinedDimension,
  } = options;

  const uddXml = userDefinedDimension
    ? `
          <userDefinedDimensions>
            <userDefinedDimension>
              <objectName>${XMLParser.escapeXml(userDefinedDimension.object)}</objectName>
              <recordId>${XMLParser.escapeXml(userDefinedDimension.record)}</recordId>
            </userDefinedDimension>
          </userDefinedDimensions>`
    : "";

  const { xml, status, text } = await intacct(`
      <function controlid="bal_itd">
        <get_accountbalances>
          <reportingperiodname>${XMLParser.escapeXml(reportingPeriod)}</reportingperiodname>
          <accountgroupname>${XMLParser.escapeXml(accountGroup)}</accountgroupname>
          <showzerobalances>${showZeroBalances ? "true" : "false"}</showzerobalances>${uddXml}
        </get_accountbalances>
      </function>`);

  if (status !== "success") {
    throw new Error(`${accountGroup} balances failed: ${text.slice(0, 500)}`);
  }

  const meta = XMLParser.listMeta(xml);

  return {
    data: [...xml.getElementsByTagName("accountbalance")].map((row) =>
      XMLParser.elementToJson(row),
    ),
    offset: meta.offset ,
    count: meta.count,
    type: meta.listType,
    remaining: meta.numRemaining,
  };
}

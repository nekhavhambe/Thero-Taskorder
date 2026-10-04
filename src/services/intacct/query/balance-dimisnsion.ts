import { intacct } from "..";
import { XMLParser } from "../parser";

export interface Option {
  accountGroup: string;
  budget?: string;
  comparison?: string;
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

export async function fetchBudgetActuals(options: Option): Promise<Result> {
  const {
    accountGroup,
    budget = "Spend Budget",
    comparison = "Budget minus Actual",
    reportingPeriod = "Inception to Date",
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
      <function controlid="bva">
        <get_accountbalancesbydimensions>
          <reportingperiodname>${XMLParser.escapeXml(reportingPeriod)}</reportingperiodname>
          <contentselection>Actual and Budget</contentselection>
          <budgetid>${XMLParser.escapeXml(budget)}</budgetid>
          <budgetcomparison>${XMLParser.escapeXml(comparison)}</budgetcomparison>
          <showzerowithactivity>true</showzerowithactivity>
          <accountgroupname>${XMLParser.escapeXml(accountGroup)}</accountgroupname>${uddXml}
        </get_accountbalancesbydimensions>
      </function>`);

  if (status !== "success") {
    throw new Error(`Budget-vs-actual failed for "${accountGroup}": ${text.slice(0, 500)}`);
  }

  const meta = XMLParser.listMeta(xml);

  return {
    data: [...xml.getElementsByTagName("accountbalance")].map((row) =>
      XMLParser.elementToJson(row),
    ),
    offset: meta.offset,
    count: meta.count,
    type: meta.listType,
    remaining: meta.numRemaining,
  };
}

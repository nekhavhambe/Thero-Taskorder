import { QueryClient } from "@tanstack/query-core";
import { queryCollectionOptions, parseLoadSubsetOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import type { LoadSubsetOptions } from "@tanstack/db";
import { query } from "../services/intacct/query";

export interface PurchaseDocumentLine {
  AMOUNTRETAINED: number;
  APPROVE_STATE: string;
  AUWHENCREATED: string;
  BASECURR: string;
  BILLABLE: boolean;
  BILLED: boolean;
  CONVERSIONTYPE: string;
  COST: number;
  COST_METHOD: string;
  CUSTOMERID: string;
  CUSTOMERNAME: string;
  DATECONFIRMED: string;
  WHENCREATED: string;
  WHENMODIFIED: string;
  DISCOUNT: number;
  DISCOUNTPERCENT: number;
  DOCHDRNO: number;
  DOCHDRID: string;
  DOCPARID: string;
  EXCHRATE: number;
  EXCHRATEDATE: string;
  EXCHRATETYPE: number;
  TOTAL: number;
  TRX_VALUE: number;
  UIVALUE: number;
  LINETOTAL: number;
  TRX_LINETOTAL: number;
  ITEMID: string;
  ITEMNAME: string;
  LINE_NO: number;
  LOCATIONID: string;
  LOCATIONNAME: string;
  MEMO: string;
  PRICE: number;
  TRX_PRICE: number;
  UIPRICE: number;
  PRICE_CONVERTED: number;
  PROJECTID: string;
  PROJECTNAME: string;
  QTY_CONVERTED: number;
  QUANTITY: number;
  UIQTY: number;
  QTY_REMAINING: number;
  RECORDNO: number;
  STATE: boolean;
  STATUS: string;
  TOTAL_AMOUNT_CONVERTED: number;
  TOTAL_AMOUNT_REMAINING: number;
  CURRENCY: string;
  UNIT: string;
  GLDIMTASKORDER_BUDGET: string;
}

const PURCHASE_DOCUMENT_LINE_FIELDS = [
  "AMOUNTRETAINED",
  "APPROVE_STATE",
  "AUWHENCREATED",
  "BASECURR",
  "BILLABLE",
  "BILLED",
  "CONVERSIONTYPE",
  "COST",
  "COST_METHOD",
  "CUSTOMERID",
  "CUSTOMERNAME",
  "DATECONFIRMED",
  "WHENCREATED",
  "WHENMODIFIED",
  "DISCOUNT",
  "DISCOUNTPERCENT",
  "DOCHDRNO",
  "DOCHDRID",
  "DOCPARID",
  "EXCHRATE",
  "EXCHRATEDATE",
  "EXCHRATETYPE",
  "TOTAL",
  "TRX_VALUE",
  "UIVALUE",
  "LINETOTAL",
  "TRX_LINETOTAL",
  "ITEMID",
  "ITEMNAME",
  "LINE_NO",
  "LOCATIONID",
  "LOCATIONNAME",
  "MEMO",
  "PRICE",
  "TRX_PRICE",
  "UIPRICE",
  "PRICE_CONVERTED",
  "PROJECTID",
  "PROJECTNAME",
  "QTY_CONVERTED",
  "QUANTITY",
  "UIQTY",
  "QTY_REMAINING",
  "RECORDNO",
  "RECORD_URL",
  "STATE",
  "STATUS",
  "TOTAL_AMOUNT_CONVERTED",
  "TOTAL_AMOUNT_REMAINING",
  "CURRENCY",
  "UNIT",
  "GLDIMTASKORDER_BUDGET",
] as const;

export const client = new QueryClient();

/** Budget scope for the query — set via `setPurchaseDocumentLinesBudget` before use. */
let uddRecordId = "";

export const purchaseDocumentLinesCollection = createCollection(
  queryCollectionOptions<PurchaseDocumentLine>({
    id: "so-document-lines",
    queryKey: ["so-document-lines"],
    queryFn: async (ctx) => {

      const meta = ctx.meta as { loadSubsetOptions?: LoadSubsetOptions } | undefined;
      const { filters: pushed, sorts, limit } = parseLoadSubsetOptions(meta?.loadSubsetOptions);
      const pushedFilters = pushed.map((f) => {
        if (f.operator !== "eq") {
          throw new Error(`Unsupported filter operator for Intacct query: ${f.operator}`);
        }
        return { [f.field.join(".").toUpperCase()]: f.value };
      });
      const [firstSort] = sorts;
      if (firstSort && firstSort.direction !== "asc") {
        throw new Error(`Intacct query only sorts ascending, got: ${firstSort.direction}`);
      }

      try {
        const { data } = await query({
          object: "SODOCUMENTENTRY",
          fields: [...PURCHASE_DOCUMENT_LINE_FIELDS],
          filters: [
            { DOCPARID: "Sale Order" },
            { GLDIMTASKORDER_BUDGET: uddRecordId },
            ...pushedFilters,
          ],
          orderBy: firstSort ? firstSort.field.join(".").toUpperCase() : "RECORDNO",
          ...(limit != null ? { limit } : {}),
        });

        return (data as unknown as PurchaseDocumentLine[]).filter(
          (row) => String((row as unknown as Record<string, unknown>).RECORDNO ?? "").trim() !== "",
        );
      } catch (err) {
        console.warn("Purchase document lines refresh skipped:", (err as Error).message);
        return [];
      }
    },
    initialData: [],
    queryClient: client,
    getKey: (item) => String(item.RECORDNO),
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  }),
);

/** Sets the budget scope and refetches document lines into the collection. */
export async function setPurchaseDocumentLinesBudget(next: string): Promise<PurchaseDocumentLine[]> {
  uddRecordId = next;
  await client.refetchQueries({ queryKey: ["purchase-document-lines"] });
  return client.getQueryData<PurchaseDocumentLine[]>(["purchase-document-lines"]) ?? [];
}

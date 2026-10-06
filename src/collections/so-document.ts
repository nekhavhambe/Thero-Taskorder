import { QueryClient } from "@tanstack/query-core";
import { queryCollectionOptions, parseLoadSubsetOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import type { LoadSubsetOptions } from "@tanstack/db";
import { query } from "../services/intacct/query";


export interface PurchaseDocument {
  RECORDNO?: string;
  DOCID?: string;
  DOCNO?: string;
  DOCPARID?: string;
  PONUMBER?: string;
  VENDORDOCNO?: string;
  RECORD_URL?: string;
  CREATEDFROM?: string;          
  SYSTEMGENERATED?: string;
  STATE?: string;              
  CLOSED?: boolean;
  PRINTED?: string;
  PRINTEDBY?: number;
  PRINTEDUSERID?: string;
  DATEPRINTED?: string;
  BACKORDER?: string;
  CUSTVENDID?: string;
  CUSTVENDNAME?: string;
  MESSAGE?: string;
  NOTE?: string;
  PROJECT?: string;
  PROJECTKEY?: number;
  PROJECTNAME?: string;
  SALES_ORDER?: string;
  WHENCREATED?: string;
  WHENDUE?: string;
  NEEDBYDATE?: string;
  EXCHRATEDATE?: string;
  CURRENCY?: string;
  BASECURR?: string;
  EXCHRATE?: number;
  "EXCHRATETYPES.NAME"?: string;
  EXCH_RATE_TYPE_ID?: string;
  SUBTOTAL?: number;
  TOTAL?: number;
  TOTALPAID?: number;
  TOTALDUE?: number;
  TRX_SUBTOTAL?: number;
  TRX_TOTAL?: number;
  TRX_REVISEDSUBTOTAL?: number;
  TRX_REVISEDTOTAL?: number;
  TRX_TOTALENTERED?: number;
  TRX_TOTALPAID?: number;
  TRX_TOTALDUE?: number;
  TOTALAMOUNTCONVERTED?: number;
  TOTALAMOUNTREMAINING?: number;
  TOTALPRICE_CONVERTED?: number;
  TOTALQTY_CONVERTED?: number;
  TOTALQTYREMAINING?: number;
  PAYMENTSTATUS?: string;
  TERMS?: string;
  CREATEDBY?: number;
  CREATEDUSER?: string;
  CREATEDUSERID?: string;
  MODIFIEDBY?: number;
  USERID?: string;
  USER?: string;
  MEGAENTITYID?: string;
  MEGAENTITYKEY?: number;
  MEGAENTITYNAME?: string;
  TAXSOLUTIONID?: string;
  TAXSOLUTIONKEY?: string;
  ENTGLGROUP?: number;
  UPDATES_INV?: string;
  DOCPAR_IN_OUT?: string;
  INVOICE_RUN_KEY?: never;
  "CONTACT.CONTACTNAME"?: string; // Supplier [CONTACT.CONTACTNAME]
}

const PURCHASE_DOCUMENT_FIELDS = [
  "RECORDNO",
  "DOCID",
  "DOCNO",
  "DOCPARID",
  "PONUMBER",
  "VENDORDOCNO",
  "RECORD_URL",
  "CREATEDFROM",
  "SYSTEMGENERATED",
  "STATE",
  "CLOSED",
  "PRINTED",
  "PRINTEDBY",
  "PRINTEDUSERID",
  "DATEPRINTED",
  "BACKORDER",
  "CUSTVENDID",
  "CUSTVENDNAME",
  "MESSAGE",
  "NOTE",
  "PROJECT",
  "PROJECTNAME",
  "SALES_ORDER",
  "WHENCREATED",
  "WHENDUE",
  "NEEDBYDATE",
  "EXCHRATEDATE",
  "CURRENCY",
  "BASECURR",
  "EXCHRATE",
  "EXCHRATETYPES.NAME",
  "EXCH_RATE_TYPE_ID",
  "SUBTOTAL",
  "TOTAL",
  "TOTALPAID",
  "TOTALDUE",
  "TRX_SUBTOTAL",
  "TRX_TOTAL",
  "TRX_REVISEDSUBTOTAL",
  "TRX_REVISEDTOTAL",
  "TRX_TOTALENTERED",
  "TRX_TOTALPAID",
  "TRX_TOTALDUE",
  "TOTALAMOUNTCONVERTED",
  "TOTALAMOUNTREMAINING",
  "TOTALPRICE_CONVERTED",
  "TOTALQTY_CONVERTED",
  "TOTALQTYREMAINING",
  "PAYMENTSTATUS",
  "TERMS",
  "CREATEDBY",
  "CREATEDUSER",
  "CREATEDUSERID",
  "MODIFIEDBY",
  "USERID",
  "USER",
  "MEGAENTITYID",
  "MEGAENTITYKEY",
  "MEGAENTITYNAME",
  "TAXSOLUTIONID",
  "TAXSOLUTIONKEY",
  "ENTGLGROUP",
  "UPDATES_INV",
  "DOCPAR_IN_OUT",
  "INVOICE_RUN_KEY",
  "CONTACT.CONTACTNAME",
] as const;

export const client = new QueryClient();


export const purchaseDocumentCollection = createCollection(
  queryCollectionOptions<PurchaseDocument>({
    id: "so-document",
    queryKey: ["so-document"],
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
          object: "SODOCUMENT",
          fields: [...PURCHASE_DOCUMENT_FIELDS],
          filters: [
            { DOCPARID: "Sale Order" },
            ...pushedFilters,
          ],
          orderBy: firstSort ? firstSort.field.join(".").toUpperCase() : "RECORDNO",
          ...(limit != null ? { limit } : {}),
        });

        return (data as unknown as PurchaseDocument[]).filter(
          (row) => String((row as unknown as Record<string, unknown>).RECORDNO ?? "").trim() !== "",
        );
      } catch (err) {
        console.warn("Purchase document refresh skipped:", (err as Error).message);
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

/** Refetches documents into the collection. */
export async function setPurchaseDocumentBudget(): Promise<PurchaseDocument[]> {
  await client.refetchQueries({ queryKey: ["purchase-document"] });
  return client.getQueryData<PurchaseDocument[]>(["purchase-document"]) ?? [];
}

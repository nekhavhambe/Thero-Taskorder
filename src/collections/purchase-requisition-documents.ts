import { QueryClient } from "@tanstack/query-core";
import { queryCollectionOptions, parseLoadSubsetOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import type { LoadSubsetOptions } from "@tanstack/db";
import { query } from "../services/intacct/query";
import type { PurchaseDocument } from "./purchase-document";

const PURCHASE_REQUISITION_FIELDS = [
  "RECORDNO",
  "DOCID",
  "DOCNO",
  "DOCPARID",
  "PONUMBER",
  "VENDORDOCNO",
  "RECORD_URL",
  "STATE",
  "CLOSED",
  "CUSTVENDID",
  "CUSTVENDNAME",
  "WHENCREATED",
  "WHENDUE",
  "NEEDBYDATE",
  "CURRENCY",
  "BASECURR",
  "TOTAL",
  "TOTALDUE",
  "TRX_TOTAL",
  "TRX_TOTALDUE",
  "PAYMENTSTATUS",
  "TERMS",
  "PROJECT",
  "PROJECTNAME",
  "CONTACT.CONTACTNAME",
] as const;

export const client = new QueryClient();

export const purchaseRequisitionDocumentsCollection = createCollection(
  queryCollectionOptions<PurchaseDocument>({
    id: "purchase-requisition-documents",
    queryKey: ["purchase-requisition-documents"],
    queryFn: async (ctx) => {
      // Pushed-down live-query filters/sorts → Intacct where/orderBy.
      // Intacct only supports equality, ascending order.
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
          object: "PODOCUMENT",
          fields: [...PURCHASE_REQUISITION_FIELDS],
          filters: [{ DOCPARID: "Purchase Requisition" }, ...pushedFilters],
          orderBy: firstSort ? firstSort.field.join(".").toUpperCase() : "RECORDNO",
          ...(limit != null ? { limit } : {}),
        });

        return (data as unknown as PurchaseDocument[]).filter(
          (row) => String((row as unknown as Record<string, unknown>).RECORDNO ?? "").trim() !== "",
        );
      } catch (err) {
        console.warn("Purchase requisition documents refresh skipped:", (err as Error).message);
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

/** Refetches requisition documents into the collection. */
export async function refreshPurchaseRequisitionDocuments(): Promise<PurchaseDocument[]> {
  await client.refetchQueries({ queryKey: ["purchase-requisition-documents"] });
  return client.getQueryData<PurchaseDocument[]>(["purchase-requisition-documents"]) ?? [];
}

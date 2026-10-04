import { QueryClient } from "@tanstack/query-core";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import { query } from "../services/intacct/query";

export interface Vendor {
  RECORDNO: string;
  VENDORID: string;
  NAME: string;
  EMAIL1?: string;
  TAXID?: string;
}


export const client = new QueryClient();
export const vendorCollection = createCollection(
  queryCollectionOptions({
    id: "vendors",
    queryKey: ["vendors"],
    queryFn: async () => {
      try {
        const { data } = await query({
          object: "VENDOR",
          fields: ["RECORDNO","VENDORID","NAME","EMAIL1","TAXID"],
          orderBy: "VENDORID",
        });

        return data || [];
      } catch (err) {
        return [];
      }
    },
    initialData: [],
    queryClient: client,
    getKey: (item) => item.RECORDNO,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  }),
);

// Query collections are on-demand — kick off the first load at import so
// the dropdown populates without waiting for an explicit preload/refetch.
// (Failures already alert inside query(); the catch just avoids an unhandled rejection.)
void vendorCollection.preload().catch(() => {});

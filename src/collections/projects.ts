import { QueryClient } from "@tanstack/query-core";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import { query } from "../services/intacct/query";

export interface Project {
  RECORDNO: string;
  PROJECTID: string;
  NAME: string;
  CURRENCY?: string;
  STATUS?: string;
  PROJECTSTATUS?: string;
  CUSTOMERID?: string;
  CUSTOMERNAME?: string;
  BEGINDATE?: string;
  ENDDATE?: string;
}


export const client = new QueryClient();
export const projectCollection = createCollection(
  queryCollectionOptions({
    id: "projects",
    queryKey: ["projects"],
    queryFn: async () => {
      try {
        alert('fetching projects...');
        const { data } = await query({
          object: "PROJECT",
          fields: ["RECORDNO","PROJECTID","NAME","CURRENCY","STATUS"],
          filters: [{ STATUS: "active" }],
          orderBy: "PROJECTID",
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
void projectCollection.preload().catch(() => {});

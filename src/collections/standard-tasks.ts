import { QueryClient } from "@tanstack/query-core";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import { query } from "../services/intacct/query";

export interface StandardTask {
  RECORDNO: string;
  TASKID: string;
  NAME: string;
  DESCRIPTION?: string;
  STATUS?: string;
}


export const client = new QueryClient();
export const standardTaskCollection = createCollection(
  queryCollectionOptions({
    id: "standard-tasks",
    queryKey: ["standard-tasks"],
    queryFn: async () => {
      try {
        const { data } = await query({
          object: "STANDARDTASK",
          fields: ["RECORDNO","TASKID","NAME","DESCRIPTION", "STATUS"],
          orderBy: "TASKID",
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
void standardTaskCollection.preload().catch(() => {});

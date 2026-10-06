import { QueryClient } from "@tanstack/query-core";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import { query } from "../services/intacct/query";

export interface StandardTask {
  RECORDNO: string;
  STANDARDTASKID: string;
  NAME: string;
  DESCRIPTION?: string;
  STATUS?: string;
  PROJECTKEY?: string;
  PROJECTID?: string;
}


export const client = new QueryClient();
export const standardTaskCollection = createCollection(
  queryCollectionOptions({
    id: "tasks",
    queryKey: ["tasks"],
    queryFn: async () => {
      try {
        const { data } = await query({
          object: "TASK",
          fields: ["RECORDNO","TASKID","NAME","DESCRIPTION",  "PROJECTKEY", "PROJECTID"],
          orderBy: "TASKID",
        });
   
        return data || [];
      } catch (err) {
        return [];
      }
    },
    queryClient: client,
    getKey: (item) => item.RECORDNO,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  }),
);

void standardTaskCollection.preload().catch(() => {});

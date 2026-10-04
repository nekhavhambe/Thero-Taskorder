import { useMemo } from "react";

export function useParams(): Partial<{id: string; name: string; projectId: string; projectName: string; projectKey: string; startDate: string; endDate: string}> {
  const search = window.location.search;
  return useMemo(() => {  
    const params =  new URLSearchParams(search);
    const paramObject = Object.fromEntries(params.entries());
    alert(JSON.stringify(paramObject));
     return paramObject;
      
  }, [search]);
}
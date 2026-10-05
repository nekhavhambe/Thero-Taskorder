import { useMemo, useSyncExternalStore } from "react";

export interface PageParams {
  id: string;
  name: string;
  page: string;
  projectId: string;
  projectName: string;
  projectKey: string;
  startDate: string;
  endDate: string;
}

/** Query string embedded in the hash (e.g. `#/task-order?name=mack`). */
function getHashQuery(): string {
  const hash = window.location.hash;
  const q = hash.indexOf("?");
  return q === -1 ? "" : hash.slice(q + 1);
}

function subscribeHashChange(notify: () => void): () => void {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
}

const stripQuotes = (value: string): string =>
  value.replace(/^(['"])(.*)\1$/, "$2");

/**
 * URL params for the page. Reads both the outer query string
 * (`?name=...#/task-order`, set by the embedder/parent) and the hash query
 * (`#/task-order?name=...`, set by in-app links) — hash wins on conflict.
 */
export function useParams(): Partial<PageParams> {
  const search = window.location.search;
  const hashQuery = useSyncExternalStore(
    subscribeHashChange,
    getHashQuery,
    getHashQuery,
  );
  return useMemo(() => {
    const merged = new URLSearchParams(search);
    for (const [key, value] of new URLSearchParams(hashQuery)) {
      merged.set(key, value);
    }
    const out: Record<string, string> = {};
    for (const [key, value] of merged.entries()) {
      out[key] = stripQuotes(value);
    }
    return out;
  }, [search, hashQuery]);
}

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

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const SLASH_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

function validDateParts(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const days = new Date(y, m, 0).getDate();
  return d <= days;
}

/**
 * Normalizes a date URL param to `YYYY-MM-DD` (the DatePicker contract).
 * Accepts ISO (`2026-10-01`, validated) and `MM/DD/YYYY` (`10/01/2026`,
 * 1–2 digit parts, zero-padded). Returns `""` for anything unparseable so
 * pickers show their placeholder instead of a broken value.
 */
export function toIsoDateParam(value: string | undefined): string {
  if (value == null) return "";
  const raw = value.trim();
  const iso = raw.match(ISO_DATE);
  if (iso) {
    const [, y, m, d] = iso;
    return validDateParts(Number(y), Number(m), Number(d)) ? raw : "";
  }
  const slash = raw.match(SLASH_DATE);
  if (slash) {
    const [, m, d, y] = slash;
    if (!validDateParts(Number(y), Number(m), Number(d))) return "";
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return "";
}

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

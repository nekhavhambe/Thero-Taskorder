import { useEffect, useRef, useState } from "react";
import { TextInput } from "../../../inputs/textinput";
import type { AnyCollection } from "../../../../collections/helpers";

// ==========================================
// SHARED HELPERS
// ==========================================

/** Await a TanStack mutation transaction until it is persisted (`when('settled')`). */
export async function waitForPersist(tx: unknown): Promise<void> {
  if (tx == null) return;
  const t = tx as {
    when?: (state: "settled") => Promise<unknown>;
    isPersisted?: { promise: Promise<unknown> };
  };
  if (typeof t.when === "function") {
    await t.when("settled");
    return;
  }
  if (t.isPersisted) {
    await t.isPersisted.promise;
    return;
  }
  await tx;
}

/** Unwrap live-query rows (tolerates `{ row }`-wrapped results). */
export function normalizeLiveRows<T>(liveData: unknown): T[] {
  const rows = (liveData ?? []) as Array<
    T | { row?: T | null } | undefined | null
  >;
  return rows.flatMap((r) => {
    if (r == null) return [];
    if (
      typeof r === "object" &&
      "row" in r &&
      (r as { row?: unknown }).row != null
    ) {
      return [(r as { row: T }).row];
    }
    return [r as T];
  });
}

export function defaultResolveId<T>(
  collection: AnyCollection | undefined,
  row: T,
): string {
  if (collection) {
    try {
      const key = (
        collection as unknown as { getKeyFromItem: (item: T) => unknown }
      ).getKeyFromItem(row);
      if (key !== undefined && key !== null && String(key) !== "")
        return String(key);
    } catch {
      // fall through to row.id
    }
  }
  return String((row as { id?: unknown }).id ?? "");
}

// ==========================================
// CELLS (local draft + blur commit: parents never re-render mid-type,
// so focus is bulletproof and masked values format on blur)
// ==========================================

export function TextCell({
  value,
  placeholder,
  onCommit,
}: {
  value: string;
  placeholder?: string;
  onCommit: (value: string) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setDraft(null);
  }, [value]);

  return (
    <TextInput
      variant="ghost"
      value={draft ?? value}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => {
        focusedRef.current = true;
        setDraft(value);
      }}
      onBlur={() => {
        focusedRef.current = false;
        const next = draft;
        setDraft(null);
        if (next !== null && next !== value) void onCommit(next);
      }}
      placeholder={placeholder ?? ""}
    />
  );
}

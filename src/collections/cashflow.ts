import { createCollection, localStorageCollectionOptions } from '@tanstack/react-db';

export interface CashflowRow {
  id: string;
  period: string;
  revenue: number | '' | null;
  cost: number | '' | null;
  actualRevenue: number | '' | null;
  actualCost: number | '' | null;
}

export const CASHFLOW_STORAGE_KEY = 'thero-cashflow';

/** Forecast vs actuals per reporting period — local-only rows, persisted. */
export const cashflowCollection = createCollection(
  localStorageCollectionOptions<CashflowRow>({
    id: 'cashflow',
    storageKey: CASHFLOW_STORAGE_KEY,
    getKey: (item) => item.id,
  }),
);

let seedPromise: Promise<void> | null = null;

/** Starts the grid with a single blank row on first run. */
export function seedCashflowIfEmpty(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      await cashflowCollection.preload();
      if (cashflowCollection.size === 0) {
        cashflowCollection.insert({
          id: `cashflow-new-1`,
          period: '',
          revenue: 0,
          cost: 0,
          actualRevenue: 0,
          actualCost: 0,
        });
      }
    })();
  }
  return seedPromise;
}

// Seed once at startup; live queries pick the row up reactively.
void seedCashflowIfEmpty();

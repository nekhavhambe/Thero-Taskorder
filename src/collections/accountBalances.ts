import { QueryClient } from "@tanstack/query-core";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import { accountBalances } from "../services/intacct/query/account-balances";

/** One GL account balance row for a task-order budget (ITD, filtered by UDD). */
export interface AccountBalance {
  /** Stable key: `${group}--${account}`. */
  id: string;
  /** Intacct account group, e.g. 'Project Cost of Sales'. */
  group: string;
  /** GL account number. */
  account: string;
  /** Closing (end) balance. */
  balance: number;
  /** taskorder_budget dimension record this row was fetched for. */
  uddRecordId?: string;
}

export const TASKORDER_BUDGET_OBJECT = "taskorder_budget";

export interface AccountBalancesQuery {
  group: string;
  uddRecordId: string;
  reportingPeriod?: string;
  showZeroBalances?: boolean;
  excludeAccounts?: string[];
}

interface NormalizedAccountBalancesQuery {
  group: string;
  uddRecordId: string;
  reportingPeriod: string;
  showZeroBalances: boolean;
  excludeAccounts: string[];
}

function normalize(options: AccountBalancesQuery): NormalizedAccountBalancesQuery {
  return {
    group: options.group,
    uddRecordId: options.uddRecordId,
    reportingPeriod: options.reportingPeriod ?? "Inception to Date",
    showZeroBalances: options.showZeroBalances ?? false,
    excludeAccounts: [...(options.excludeAccounts ?? [])].sort(),
  };
}

/** Stable query key — one cache entry per group / budget / options. */
export function accountBalancesQueryKey(options: AccountBalancesQuery): unknown[] {
  const q = normalize(options);
  return [
    "account-balances",
    q.group,
    q.uddRecordId,
    q.reportingPeriod,
    q.showZeroBalances,
    q.excludeAccounts.join(","),
  ];
}

function createAccountBalancesCollection(query: NormalizedAccountBalancesQuery) {
  const { group, uddRecordId, reportingPeriod, showZeroBalances, excludeAccounts } = query;
  return createCollection(
    queryCollectionOptions({
      id: `account-balances:${group}:${uddRecordId}`,
      queryKey: accountBalancesQueryKey(query),
      queryFn: async () => {
        try {
          const { data } = await accountBalances({
            accountGroup: group,
            reportingPeriod,
            showZeroBalances,
            userDefinedDimension: { object: TASKORDER_BUDGET_OBJECT, record: uddRecordId },
          });

          const excluded = new Set(excludeAccounts);
          return (data || [])
            .filter(
              (json) =>
                (json.GLACCOUNTNO ?? "") !== "" && !excluded.has(json.GLACCOUNTNO ?? ""),
            )
            .map(
              (json): AccountBalance => ({
                id: `${group}--${json.GLACCOUNTNO}`,
                group,
                account: json.GLACCOUNTNO ?? "",
                balance: parseFloat(json.ENDBALANCE ?? "") || 0,
                uddRecordId,
              }),
            );
        } catch {
          return [];
        }
      },
      initialData: [],
      queryClient: client,
      getKey: (item) => item.id,
      retry: false,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }),
  );
}

type AccountBalancesCollection = ReturnType<typeof createAccountBalancesCollection>;

export const client = new QueryClient();

const cache = new Map<string, AccountBalancesCollection>();

/**
 * ITD account balances for one group + task-order budget, as a live
 * collection. Same instance is returned for identical options, so callers
 * can subscribe freely — fetching happens directly within the queryFn via
 * `accountBalances()` (no action-layer round trip).
 */
export function getAccountBalancesCollection(
  options: AccountBalancesQuery,
): AccountBalancesCollection {
  const query = normalize(options);
  const cacheKey = JSON.stringify(accountBalancesQueryKey(query));
  const hit = cache.get(cacheKey);
  if (hit) return hit;
  const collection = createAccountBalancesCollection(query);
  cache.set(cacheKey, collection);
  return collection;
}

/** Marks one balances query stale so the collection refetches from Intacct. */
export async function refreshAccountBalances(options: AccountBalancesQuery): Promise<void> {
  getAccountBalancesCollection(options);
  await client.invalidateQueries({ queryKey: accountBalancesQueryKey(options) });
}

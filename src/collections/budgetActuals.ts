import { createCollection, localStorageCollectionOptions } from '@tanstack/react-db';
import { fetchBudgetActuals as fetchBalanceDimension } from '../services/intacct/query/balance-dimisnsion';

/** One budget-vs-actual account row for a task-order budget. */
export interface BudgetActual {
  /** Stable key: `${group}--${account}`. */
  id: string;
  group: string;
  account: string;
  actual: number;
  budget: number;
  difference: number;
  uddRecordId?: string;
}

export const BUDGET_ACTUAL_STORAGE_KEY = 'thero-budget-actuals';

export const BUDGET_ACTUAL_GROUPS = [
  'Project Revenue',
  'Project Cost of Sales',
  'Project Labour Cost',
  'Project Operating Expense',
  'Project Net Profit/(Loss)',
];

/** UDD object holding the task-order budget dimension. */
export const TASKORDER_BUDGET_OBJECT = 'taskorder_budget';

export interface FetchBudgetActualsOptions {
  budgetId?: string;
  comparison?: string;
  period?: string;
  groups?: string[];
}

/**
 * Budget-vs-actual account rows per task-order budget, persisted to
 * localStorage. Row key is `${group}--${account}`.
 */
export const budgetActualCollection = createCollection(
  localStorageCollectionOptions<BudgetActual>({
    id: 'budget-actuals',
    storageKey: BUDGET_ACTUAL_STORAGE_KEY,
    getKey: (item) => item.id,
  }),
);

/** Pulls budget-vs-actual rows from Intacct into the collection. */
export async function refreshBudgetActuals(
  uddRecordId: string,
  options: FetchBudgetActualsOptions = {},
): Promise<BudgetActual[]> {
  const {
    budgetId = 'Spend Budget',
    comparison = 'Budget minus Actual',
    period = 'Inception to Date',
    groups = BUDGET_ACTUAL_GROUPS,
  } = options;

  const rows: BudgetActual[] = [];
  for (const group of groups) {
    const { data } = await fetchBalanceDimension({
      accountGroup: group,
      budget: budgetId,
      comparison,
      reportingPeriod: period,
      userDefinedDimension: { object: TASKORDER_BUDGET_OBJECT, record: uddRecordId },
    });
    for (const json of data || []) {
      const account = json.GLACCOUNTNO ?? '';
      if (account === '') continue;
      rows.push({
        id: `${group}--${account}`,
        group,
        account,
        actual: parseFloat(json.PERIODBALANCE ?? '') || 0,
        budget: parseFloat(json.BUDGETBALANCE ?? '') || 0,
        difference: parseFloat(json.DIFFERENCE ?? '') || 0,
        uddRecordId,
      });
    }
  }

  await budgetActualCollection.preload();
  for (const row of rows) {
    if (budgetActualCollection.get(row.id)) {
      budgetActualCollection.update(row.id, (draft) => {
        draft.group = row.group;
        draft.account = row.account;
        draft.actual = row.actual;
        draft.budget = row.budget;
        draft.difference = row.difference;
        draft.uddRecordId = row.uddRecordId;
      });
    } else {
      budgetActualCollection.insert(row);
    }
  }
  return rows;
}

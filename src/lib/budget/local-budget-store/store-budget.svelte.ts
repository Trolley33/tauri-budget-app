import type {
  IBudgetRepository,
  Expense,
  Income,
  BudgetInfo,
} from "@/budget/types";
import { load, type Store } from "@tauri-apps/plugin-store";
import type { DateTime } from "luxon";

const getDefaultBudgetInfo = (): BudgetInfo => ({
  recurringExpenses: [],
  accountBalanceHistory: [],
  incomes: [],
});

export class StoreBudgetRepository implements IBudgetRepository {
  // Promise that resolves when the store is initialized
  initializing: Promise<void>;
  private _budgetInfo = $state<BudgetInfo>(getDefaultBudgetInfo());
  budgetInfo: BudgetInfo = $derived(this._budgetInfo);

  constructor() {
    this.initializing = this.initStore();
  }

  private persistentStore: Store | null = null;
  private async initStore() {
    if (!this.persistentStore) {
      this.persistentStore = await load("budget-store.json");

      let value = getDefaultBudgetInfo();
      const oldValue = await this.persistentStore.get("budget_info");
      if (oldValue) {
        value = this.migrateBudgetInfo(oldValue as Record<string, any>);
      } else {
        const newValue = await this.persistentStore.get("budgetInfo");
        if (newValue) {
          value = newValue as BudgetInfo;
        }
      }
      Object.assign(this._budgetInfo, value);
    }
  }

  private migrateBudgetInfo(oldInfo: Record<string, any>): BudgetInfo {
    return {
      accountBalanceHistory: oldInfo.account_balance_history || [],
      incomes:
        oldInfo.incomes?.map((income: any) => ({
          id: income.id,
          name: income.name,
          totalIn: income.total_in,
          totalRetained: income.total_retained,
          dayOfMonth: income.dayOfMonth,
        })) || [],
      recurringExpenses: oldInfo.recurring_expenses || [],
    };
  }

  private updateBudgetInfo(fn: (info: BudgetInfo) => BudgetInfo) {
    const newValue = fn(this._budgetInfo);
    Object.assign(this._budgetInfo, newValue);
    this.persistentStore?.set("budgetInfo", this._budgetInfo);
  }

  addOrUpdateExpense(expense: Expense): void {
    this.updateBudgetInfo((info) => {
      const existing = info.recurringExpenses.find((e) => e.id === expense.id);
      if (existing) {
        existing.amount = expense.amount;
        existing.label = expense.label;
        existing.recurring = expense.recurring;
      } else {
        info.recurringExpenses.push(expense);
      }
      return info;
    });
  }

  removeExpense(id: string): void {
    this.updateBudgetInfo((info) => {
      info.recurringExpenses = info.recurringExpenses.filter(
        (e) => e.id !== id
      );
      return info;
    });
  }

  addOrUpdateIncome(income: Income): void {
    this.updateBudgetInfo((info) => {
      const existing = info.incomes.find((e) => e.id === income.id);
      if (existing) {
        existing.name = income.name;
        existing.totalIn = income.totalIn;
        existing.totalRetained = income.totalRetained;
        existing.dayOfMonth = income.dayOfMonth;
      } else {
        info.incomes.push(income);
      }
      return info;
    });
  }
  removeIncome(id: string): void {
    this.updateBudgetInfo((info) => {
      info.incomes = info.incomes.filter((e) => e.id !== id);
      return info;
    });
  }
  clearAll(): void {
    this.updateBudgetInfo(() => getDefaultBudgetInfo());
  }

  setManualBalance(date: DateTime, balance: number | null): void {
    if (date.isValid) {
      this.updateBudgetInfo((info) => {
        const dateStr = date.toISODate()!;
        const existing = info.accountBalanceHistory.find(
          (b) => b.date === dateStr
        );
        if (existing) {
          if (balance === null) {
            info.accountBalanceHistory = info.accountBalanceHistory.filter(
              (b) => b.date !== dateStr
            );
          } else {
            existing.balance = balance;
          }
        } else {
          if (balance !== null) {
            info.accountBalanceHistory.push({
              date: dateStr,
              balance,
            });
          }
        }

        info.accountBalanceHistory = info.accountBalanceHistory
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 10);
        return info;
      });
    }
  }
}

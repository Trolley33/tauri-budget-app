import type {
  IBudgetRepository,
  Expense,
  Income,
  BudgetInfo,
} from "@/budget/types";
import { load, type Store } from "@tauri-apps/plugin-store";
import type { DateTime } from "luxon";

const DEFAULT_BUDGET_INFO: BudgetInfo = {
  recurringExpenses: [],
  accountBalanceHistory: [],
  incomes: [],
};

class StoreBudgetRepository implements IBudgetRepository {
  budgetInfo = $state<BudgetInfo>(DEFAULT_BUDGET_INFO);

  constructor() {
    this.initStore();
  }

  private persistentStore: Store | null = null;
  private async initStore() {
    if (!this.persistentStore) {
      this.persistentStore = await load("budget-store.json");
      this.budgetInfo =
        (await this.persistentStore.get("budgetInfo")) ?? DEFAULT_BUDGET_INFO;
    }
  }

  private updateBudgetInfo(fn: (info: BudgetInfo) => BudgetInfo) {
    this.budgetInfo = fn(this.budgetInfo);
    this.persistentStore?.set("budgetInfo", this.budgetInfo);
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
    this.updateBudgetInfo(() => DEFAULT_BUDGET_INFO);
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

export const storeBudgetRepository = new StoreBudgetRepository();

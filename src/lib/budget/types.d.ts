import type { DateTime } from "luxon";

export type Expense = {
  id: string;
  label: string;
  amount: number;
  recurring:
    | {
        type: "monthly";
        dayOfMonth: number;
      }
    | {
        type: "weekly";
        dayOfWeek: number;
      }
    | {
        type: "yearly";
        month: number;
        dayOfMonth: number;
      };
};

export type Income = {
  id: string;
  name: string;
  totalIn: number;
  totalRetained: number;
  dayOfMonth: number;
};

export type BudgetInfo = {
  recurringExpenses: Expense[];
  accountBalanceHistory: {
    date: string; // iso
    balance: number;
  }[];
  incomes: Income[];
};

export type IBudgetRepository = {
  budgetInfo: BudgetInfo;

  addOrUpdateExpense(expense: Expense): void;
  removeExpense(expenseId: string): void;
  addOrUpdateIncome(income: Income): void;
  removeIncome(incomeId: string): void;
  clearAll(): void;
  setManualBalance(date: DateTime, balance: number | null): void;
};

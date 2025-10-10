import { load, Store } from "@tauri-apps/plugin-store";
import { DateTime, Interval } from "luxon";
import { writable } from "svelte/store";
import { v4 } from "uuid";

let store: Store;
load("budget-store.json").then((s) => {
  store = s;
  store.get<BudgetInfo>("budget_info").then((info) => {
    if (info) {
      set(info);
    }
  });
});

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
  total_in: number;
  total_retained: number;
  dayOfMonth: number;
};

type BudgetInfo = {
  recurring_expenses: Expense[];
  account_balance_history: {
    date: string; // iso
    balance: number;
  }[];
  incomes: Income[];
};

const DEFAULT_BUDGET_INFO: BudgetInfo = {
  recurring_expenses: [],
  account_balance_history: [],
  incomes: [],
};

const { set, subscribe, update } = writable(DEFAULT_BUDGET_INFO);

const get = () => {
  let val: BudgetInfo;
  subscribe((v) => (val = v))();
  return val!;
};

const update_budget = (fn: (info: BudgetInfo) => BudgetInfo) => {
  update((info) => {
    const new_info = fn(info);
    store.set("budget_info", new_info);
    return new_info;
  });
};

export const budget_store = {
  subscribe,
  addOrUpdateExpense: (expense: Expense) =>
    update_budget((info) => {
      const existing = info.recurring_expenses.find((e) => e.id === expense.id);
      if (existing) {
        existing.amount = expense.amount;
        existing.label = expense.label;
        existing.recurring = expense.recurring;
      } else {
        info.recurring_expenses.push(expense);
      }
      return info;
    }),
  removeExpense: (id: string) =>
    update_budget((info) => {
      info.recurring_expenses = info.recurring_expenses.filter(
        (e) => e.id !== id
      );
      return info;
    }),

  addOrUpdateIncome: (income: Income) =>
    update_budget((info) => {
      const existing = info.incomes.find((e) => e.id === income.id);
      if (existing) {
        existing.name = income.name;
        existing.total_in = income.total_in;
        existing.total_retained = income.total_retained;
        existing.dayOfMonth = income.dayOfMonth;
      } else {
        info.incomes.push(income);
      }
      return info;
    }),
  removeIncome: (id: string) =>
    update_budget((info) => {
      info.incomes = info.incomes.filter((e) => e.id !== id);
      return info;
    }),
  clearAll: () => {
    update_budget(() => DEFAULT_BUDGET_INFO);
  },

  setManualBalance(date: DateTime, balance: number | null) {
    if (date.isValid) {
      update_budget((info) => {
        const date_str = date.toISODate()!;
        const existing = info.account_balance_history.find(
          (b) => b.date === date_str
        );
        if (existing) {
          if (balance === null) {
            info.account_balance_history = info.account_balance_history.filter(
              (b) => b.date !== date_str
            );
          } else {
            existing.balance = balance;
          }
        } else {
          if (balance !== null) {
            info.account_balance_history.push({
              date: date_str,
              balance,
            });
          }
        }

        info.account_balance_history = info.account_balance_history
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 10);
        return info;
      });
    }
  },
};

export function generateForecast(time_range: Interval<true>) {
  const snapshot = get();
  // sorted by date in descending order
  let sorted_balance = snapshot.account_balance_history.toSorted((a, b) =>
    b.date.localeCompare(a.date)
  );

  // find the oldest balance before the start of the forecast, or 0
  const first_balance = sorted_balance.find(
    (val) => DateTime.fromISO(val.date).startOf("day") <= time_range.start
  );

  let balance = first_balance?.balance || 0;

  const balances: {
    date: DateTime;
    starting_balance: number;
    closing_balance: number;
    expenses: ReturnType<typeof getExpenses>;
    incomes: ReturnType<typeof getIncomes>;
    total_expense_cost: number;
    type: "manual" | "forecast";
    isPayday: boolean;
  }[] = [];

  const days = time_range
    .set({
      start: (first_balance?.date
        ? DateTime.fromISO(first_balance.date)
        : time_range.start
      ).startOf("day"),
      end: time_range.end?.endOf("day"),
    })
    .splitBy({ day: 1 })
    .map((d) => d.start!);

  const expenses = getExpenses(snapshot.recurring_expenses, days);
  const incomes = getIncomes(snapshot.incomes, days);

  for (const day of days) {
    const starting_balance = balance;

    const total_expenses = expenses.filter((e) => e.date.equals(day));
    const total_incomes = incomes.filter((i) => i.date.equals(day));
    const isPayday = total_incomes.length > 0;

    const total_expense_cost =
      total_expenses.reduce((acc, e) => acc + e.amount, 0) +
      total_incomes.reduce(
        (acc, i) => acc - (i.total_in - i.total_retained),
        0
      );

    let manual_balance = sorted_balance.find((b) => b.date === day.toISODate());
    if (manual_balance) {
      balance = manual_balance.balance;
      if (day >= time_range.start) {
        balances.push({
          date: day,
          starting_balance,
          closing_balance: manual_balance.balance,
          expenses: total_expenses,
          incomes: total_incomes,
          total_expense_cost: total_expense_cost,
          type: "manual",
          isPayday,
        });
      }
    } else {
      balance -= total_expense_cost;
      // Don't bother storing balances outside the selected range, even though we did calculate them
      if (day >= time_range.start) {
        balances.push({
          date: day,
          starting_balance,
          closing_balance: balance,
          expenses: total_expenses,
          incomes: total_incomes,
          total_expense_cost,
          type: "forecast",
          isPayday,
        });
      }
    }
  }

  return balances;
}

function getExpenses(expenses: Expense[], dates: DateTime<true>[]) {
  let expenses_in_scope: {
    label: string;
    amount: number;
    date: DateTime;
  }[] = [];
  for (const day of dates) {
    for (const expense of expenses) {
      if (expense.recurring.type === "monthly") {
        if (day.day === expense.recurring.dayOfMonth) {
          expenses_in_scope.push({
            label: expense.label,
            amount: expense.amount,
            date: day,
          });
        }
      } else if (expense.recurring.type === "weekly") {
        if (day.weekday === expense.recurring.dayOfWeek) {
          expenses_in_scope.push({
            label: expense.label,
            amount: expense.amount,
            date: day,
          });
        }
      } else if (expense.recurring.type === "yearly") {
        if (
          day.month === expense.recurring.month &&
          day.day === expense.recurring.dayOfMonth
        ) {
          expenses_in_scope.push({
            label: expense.label,
            amount: expense.amount,
            date: day,
          });
        }
      }
    }
  }

  return expenses_in_scope;
}

function getIncomes(incomes: Income[], dates: DateTime<true>[]) {
  if (!incomes) return [];
  let incomes_in_scope: {
    name: string;
    total_in: number;
    total_retained: number;
    date: DateTime;
  }[] = [];
  for (const day of dates) {
    for (const income of incomes) {
      let target_day =
        day.daysInMonth >= income.dayOfMonth
          ? income.dayOfMonth
          : day.daysInMonth;
      // iterate backwards to find the last day of the month that is not a weekend
      let target_date = day.set({ day: target_day });
      while (
        (target_date.weekday === 6 || target_date.weekday === 7) &&
        target_date.hasSame(day, "month")
      ) {
        target_date = target_date.minus({ days: 1 });
      }
      if (day.hasSame(target_date, "day")) {
        incomes_in_scope.push({
          name: income.name,
          total_in: income.total_in,
          total_retained: income.total_retained,
          date: day,
        });
      }
    }
  }

  return incomes_in_scope;
}

import type {
  BudgetInfo,
  Expense,
  IBudgetRepository,
  Income,
} from "@/budget/types";
import { DateTime, type Interval } from "luxon";

export function generateForecast(
  budgetInfo: BudgetInfo,
  timeRange: Interval<true>
) {
  const snapshot = budgetInfo;

  // sorted by date in descending order
  let sortedBalance = snapshot.accountBalanceHistory.toSorted((a, b) =>
    b.date.localeCompare(a.date)
  );

  // find the oldest balance before the start of the forecast, or 0
  const firstBalance = sortedBalance.find(
    (val) => DateTime.fromISO(val.date).startOf("day") <= timeRange.start
  );

  let balance = firstBalance?.balance || 0;

  const balances: {
    date: DateTime;
    startingBalance: number;
    closingBalance: number;
    expenses: ReturnType<typeof getExpenses>;
    incomes: ReturnType<typeof getIncomes>;
    totalExpenseCost: number;
    type: "manual" | "forecast";
    isPayday: boolean;
  }[] = [];

  const days = timeRange
    .set({
      start: (firstBalance?.date
        ? DateTime.fromISO(firstBalance.date)
        : timeRange.start
      ).startOf("day"),
      end: timeRange.end?.endOf("day"),
    })
    .splitBy({ day: 1 })
    .map((d) => d.start!);

  const expenses = getExpenses(snapshot.recurringExpenses, days);
  const incomes = getIncomes(snapshot.incomes, days);

  for (const day of days) {
    const startingBalance = balance;

    const totalExpenses = expenses.filter((e) => e.date.equals(day));
    const totalIncomes = incomes.filter((i) => i.date.equals(day));
    const isPayday = totalIncomes.length > 0;

    const totalExpenseCost =
      totalExpenses.reduce((acc, e) => acc + e.amount, 0) +
      totalIncomes.reduce((acc, i) => acc - (i.totalIn - i.totalRetained), 0);

    let manualBalance = sortedBalance.find((b) => b.date === day.toISODate());
    if (manualBalance) {
      balance = manualBalance.balance;
      if (day >= timeRange.start) {
        balances.push({
          date: day,
          startingBalance,
          closingBalance: manualBalance.balance,
          expenses: totalExpenses,
          incomes: totalIncomes,
          totalExpenseCost: totalExpenseCost,
          type: "manual",
          isPayday,
        });
      }
    } else {
      balance -= totalExpenseCost;
      // Don't bother storing balances outside the selected range, even though we did calculate them
      if (day >= timeRange.start) {
        balances.push({
          date: day,
          startingBalance,
          closingBalance: balance,
          expenses: totalExpenses,
          incomes: totalIncomes,
          totalExpenseCost,
          type: "forecast",
          isPayday,
        });
      }
    }
  }

  return balances;
}

function getExpenses(expenses: Expense[], dates: DateTime<true>[]) {
  let expensesInScope: {
    label: string;
    amount: number;
    date: DateTime;
  }[] = [];
  for (const day of dates) {
    for (const expense of expenses) {
      if (expense.recurring.type === "monthly") {
        if (day.day === expense.recurring.dayOfMonth) {
          expensesInScope.push({
            label: expense.label,
            amount: expense.amount,
            date: day,
          });
        }
      } else if (expense.recurring.type === "weekly") {
        if (day.weekday === expense.recurring.dayOfWeek) {
          expensesInScope.push({
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
          expensesInScope.push({
            label: expense.label,
            amount: expense.amount,
            date: day,
          });
        }
      }
    }
  }

  return expensesInScope;
}

function getIncomes(incomes: Income[], dates: DateTime<true>[]) {
  if (!incomes) return [];
  let incomesInScope: {
    name: string;
    totalIn: number;
    totalRetained: number;
    date: DateTime;
  }[] = [];
  for (const day of dates) {
    for (const income of incomes) {
      let targetDay =
        day.daysInMonth >= income.dayOfMonth
          ? income.dayOfMonth
          : day.daysInMonth;
      // iterate backwards to find the last day of the month that is not a weekend
      let targetDate = day.set({ day: targetDay });
      while (
        (targetDate.weekday === 6 || targetDate.weekday === 7) &&
        targetDate.hasSame(day, "month")
      ) {
        targetDate = targetDate.minus({ days: 1 });
      }
      if (day.hasSame(targetDate, "day")) {
        incomesInScope.push({
          name: income.name,
          totalIn: income.totalIn,
          totalRetained: income.totalRetained,
          date: day,
        });
      }
    }
  }

  return incomesInScope;
}

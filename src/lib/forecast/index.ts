import type { BudgetInfo, Expense, Income } from "@/budget/types";
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

  type BalanceEntry = {
    date: DateTime;
    startingBalance: number;
    closingBalance: number;
    expenses: ExpenseEntry[];
    incomes: IncomeEntry[];
    totalExpenseCost: number;
    type: "manual" | "forecast";
    isPayday: boolean;
  };

  const balances: BalanceEntry[] = [];

  // Days include all days from the first balance date to the end of the time range
  // Since we need to incrementally calculate balances even for days outside the range
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

  const expenses = getAllExpensesOnDates(snapshot.recurringExpenses, days);
  const incomes = getAllIncomesOnDates(snapshot.incomes, days);

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

type ExpenseEntry = {
  label: string;
  amount: number;
  date: DateTime;
};
/**
 * Get all expenses that fall on the given dates
 */
function getAllExpensesOnDates(expenses: Expense[], dates: DateTime<true>[]) {
  let expensesInScope: ExpenseEntry[] = [];
  for (const day of dates) {
    const expensesToday = expenses.filter((expense) => {
      switch (expense.recurring.type) {
        case "monthly":
          return day.day === expense.recurring.dayOfMonth;
        case "weekly":
          return day.weekday === expense.recurring.dayOfWeek;
        case "yearly":
          return (
            day.month === expense.recurring.month &&
            day.day === expense.recurring.dayOfMonth
          );
        default:
          return false;
      }
    });
    expensesToday.forEach((expense) => {
      expensesInScope.push({
        label: expense.label,
        amount: expense.amount,
        date: day,
      });
    });
  }

  return expensesInScope;
}

type IncomeEntry = {
  name: string;
  totalIn: number;
  totalRetained: number;
  date: DateTime;
};

/**
 * Get allincomes that fall on the given dates
 */
function getAllIncomesOnDates(incomes: Income[], dates: DateTime<true>[]) {
  if (!incomes) return [];
  let incomesInScope: IncomeEntry[] = [];
  for (const day of dates) {
    for (const income of incomes) {
      // Either the last day in the month (if less than income.dayOfMonth), or the specified day of the month
      let targetDay =
        day.daysInMonth >= income.dayOfMonth
          ? income.dayOfMonth
          : day.daysInMonth;

      // iterate backwards to find the last day of the month that is not a weekend
      let targetDate = day.set({ day: targetDay });
      targetDate = getClosestWorkingDay(targetDate);

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

/**
 * Given a date, returns the closest previous working day (Mon-Fri)
 */
function getClosestWorkingDay(date: DateTime<true>) {
  let targetDate = date;
  while (targetDate.weekday === 6 || targetDate.weekday === 7) {
    targetDate = targetDate.minus({ days: 1 });
  }
  return targetDate;
}

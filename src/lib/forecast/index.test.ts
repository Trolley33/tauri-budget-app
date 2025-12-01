import type { BudgetInfo } from "@/budget/types";
import { generateForecast } from "@/forecast";
import { DateTime, Interval } from "luxon";
import { describe, it, expect } from "vitest";

describe("forecast", () => {
  it("should correctly forecast when nothing changes", () => {
    const budget: BudgetInfo = {
      accountBalanceHistory: [{ date: "2024-01-01", balance: 1000 }],
      incomes: [],
      recurringExpenses: [],
    };

    // Jan 2024
    const interval = Interval.fromDateTimes(
      DateTime.fromISO("2024-01-01"),
      DateTime.fromISO("2024-01-31")
    );
    const forecast = generateForecast(budget, interval as Interval<true>);
    expect(forecast.length).toBe(31);
    for (const day of forecast) {
      expect(day).toMatchObject({
        startingBalance: 1000,
        closingBalance: 1000,
        totalExpenseCost: 0,
        expenses: [],
        incomes: [],
      });
    }
  });

  it("should correctly forecast with weekly expenses", () => {
    const budget: BudgetInfo = {
      accountBalanceHistory: [{ date: "2024-01-01", balance: 1000 }],
      incomes: [],
      recurringExpenses: [
        {
          id: "1",
          label: "Coffee",
          amount: 10,
          recurring: {
            type: "weekly",
            dayOfWeek: 2, // Tuesday
          },
        },
      ],
    };

    // Jan 2024
    const interval = Interval.fromDateTimes(
      DateTime.fromISO("2024-01-01"), // Monday
      DateTime.fromISO("2024-01-31") // Wednesday
    );
    const forecast = generateForecast(budget, interval as Interval<true>);
    expect(forecast.length).toBe(31);
    expect(forecast[1]).toMatchObject({
      startingBalance: 1000,
      closingBalance: 990,
    });
    expect(forecast[8]).toMatchObject({
      startingBalance: 990,
      closingBalance: 980,
    });
    expect(forecast[15]).toMatchObject({
      startingBalance: 980,
      closingBalance: 970,
    });
    expect(forecast[22]).toMatchObject({
      startingBalance: 970,
      closingBalance: 960,
    });
    expect(forecast[29]).toMatchObject({
      startingBalance: 960,
      closingBalance: 950,
    });
  });

  it("should correctly forecast with monthly expenses", () => {
    const budget: BudgetInfo = {
      accountBalanceHistory: [{ date: "2024-01-01", balance: 1000 }],
      incomes: [],
      recurringExpenses: [
        {
          id: "1",
          label: "Coffee",
          amount: 100,
          recurring: {
            type: "monthly",
            dayOfMonth: 28,
          },
        },
      ],
    };

    // Jan 2024
    const janInterval = Interval.fromDateTimes(
      DateTime.fromISO("2024-01-01"), // Monday
      DateTime.fromISO("2024-01-31") // Wednesday
    );
    const janForecast = generateForecast(budget, janInterval as Interval<true>);
    expect(janForecast.length).toBe(31);
    expect(janForecast[26]).toMatchObject({
      startingBalance: 1000,
      closingBalance: 1000,
    });
    expect(janForecast[27]).toMatchObject({
      startingBalance: 1000,
      closingBalance: 900,
    });
    expect(janForecast[28]).toMatchObject({
      startingBalance: 900,
      closingBalance: 900,
    });

    // Feb 2024
    const febInterval = Interval.fromDateTimes(
      DateTime.fromISO("2024-02-01"), // Monday
      DateTime.fromISO("2024-02-29") // Wednesday
    );
    const febForecast = generateForecast(budget, febInterval as Interval<true>);
    expect(febForecast.length).toBe(29);
    expect(febForecast[0]).toMatchObject({
      startingBalance: 900,
      closingBalance: 900,
    });
    expect(febForecast[27]).toMatchObject({
      startingBalance: 900,
      closingBalance: 800,
    });
    expect(febForecast[28]).toMatchObject({
      startingBalance: 800,
      closingBalance: 800,
    });
  });

  it("should correctly forecast with yearly expenses", () => {
    const budget: BudgetInfo = {
      accountBalanceHistory: [{ date: "2024-01-01", balance: 1000 }],
      incomes: [],
      recurringExpenses: [
        {
          id: "1",
          label: "Coffee",
          amount: 100,
          recurring: {
            type: "yearly",
            month: 1,
            dayOfMonth: 28,
          },
        },
      ],
    };

    // Jan 2024
    const janInterval = Interval.fromDateTimes(
      DateTime.fromISO("2024-01-01"), // Monday
      DateTime.fromISO("2024-01-31") // Wednesday
    );
    const janForecast = generateForecast(budget, janInterval as Interval<true>);
    expect(janForecast.length).toBe(31);
    expect(janForecast[27]).toMatchObject({
      startingBalance: 1000,
      closingBalance: 900,
    });

    // Feb 2024
    const febInterval = Interval.fromDateTimes(
      DateTime.fromISO("2024-02-01"), // Monday
      DateTime.fromISO("2024-02-29") // Wednesday
    );
    const febForecast = generateForecast(budget, febInterval as Interval<true>);
    expect(febForecast.length).toBe(29);
    expect(febForecast.at(-1)).toMatchObject({
      startingBalance: 900,
      closingBalance: 900,
    });
  });

  it("should correctly forecast with monthly income", () => {
    const budget: BudgetInfo = {
      accountBalanceHistory: [{ date: "2024-01-01", balance: 1000 }],
      incomes: [
        {
          id: "1",
          dayOfMonth: 26,
          name: "Paycheck",
          totalIn: 500,
          totalRetained: 0,
        },
      ],
      recurringExpenses: [],
    };

    // Jan 2024
    const janInterval = Interval.fromDateTimes(
      DateTime.fromISO("2024-01-01"), // Monday
      DateTime.fromISO("2024-01-31") // Wednesday
    );
    const janForecast = generateForecast(budget, janInterval as Interval<true>);
    expect(janForecast.length).toBe(31);
    // Jan 26 (Friday) income
    expect(janForecast[25]).toMatchObject({
      startingBalance: 1000,
      closingBalance: 1500,
    });
    expect(janForecast[26]).toMatchObject({
      startingBalance: 1500,
      closingBalance: 1500,
    });

    // Feb 2024
    const febInterval = Interval.fromDateTimes(
      DateTime.fromISO("2024-02-01"), // Monday
      DateTime.fromISO("2024-02-29") // Wednesday
    );
    const febForecast = generateForecast(budget, febInterval as Interval<true>);
    expect(febForecast.length).toBe(29);
    expect(febForecast[0]).toMatchObject({
      startingBalance: 1500,
      closingBalance: 1500,
    });
    // Feb 26 (Monday) income
    expect(febForecast[25]).toMatchObject({
      startingBalance: 1500,
      closingBalance: 2000,
    });
  });

  it("should correctly backdate income based on weekends and length of month", () => {
    const budget: BudgetInfo = {
      accountBalanceHistory: [{ date: "2024-01-01", balance: 1000 }],
      incomes: [
        {
          id: "1",
          dayOfMonth: 31,
          name: "Paycheck1",
          totalIn: 500,
          totalRetained: 0,
        },
        {
          id: "1",
          dayOfMonth: 28,
          name: "Paycheck2",
          totalIn: 200,
          totalRetained: 0,
        },
      ],
      recurringExpenses: [],
    };

    // Jan 2024
    const janInterval = Interval.fromDateTimes(
      DateTime.fromISO("2024-01-01"), // Monday
      DateTime.fromISO("2024-01-31") // Wednesday
    );
    const janForecast = generateForecast(budget, janInterval as Interval<true>);
    expect(janForecast.length).toBe(31);
    // Jan 26 (Friday) income, since 28th is Sunday it should roll back
    expect(janForecast[25]).toMatchObject({
      startingBalance: 1000,
      closingBalance: 1200,
    });
    expect(janForecast[30]).toMatchObject({
      startingBalance: 1200,
      closingBalance: 1700,
    });

    // Feb 2024
    const febInterval = Interval.fromDateTimes(
      DateTime.fromISO("2024-02-01"), // Monday
      DateTime.fromISO("2024-02-29") // Wednesday
    );
    const febForecast = generateForecast(budget, febInterval as Interval<true>);
    expect(febForecast.length).toBe(29);
    expect(febForecast[0]).toMatchObject({
      startingBalance: 1700,
      closingBalance: 1700,
    });
    // Feb 28 (Wednesday) income
    expect(febForecast[27]).toMatchObject({
      startingBalance: 1700,
      closingBalance: 1900,
    });
    expect(febForecast[28]).toMatchObject({
      startingBalance: 1900,
      closingBalance: 2400,
    });
  });
});

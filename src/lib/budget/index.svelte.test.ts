import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockedSet, mockedGet } = vi.hoisted(() => ({
  mockedSet: vi.fn(),
  mockedGet: vi.fn().mockImplementation(() => ({
    recurringExpenses: [],
    accountBalanceHistory: [],
    incomes: [],
  })),
}));

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn().mockResolvedValue({
    get: mockedGet,
    set: mockedSet,
  }),
}));

import { StoreBudgetRepository } from "@/budget/store-budget.svelte";
import type { BudgetInfo, Expense } from "@/budget/types";
import { tick } from "svelte";

describe("StoreBudgetRepository", () => {
  beforeEach(() => {
    mockedSet.mockClear();
    mockedGet.mockClear();
  });

  it("should initialize with default budget info", async () => {
    const storeBudgetRepository = new StoreBudgetRepository();
    await storeBudgetRepository.initializing;
    expect(storeBudgetRepository.budgetInfo).toBeDefined();
    expect(storeBudgetRepository.budgetInfo).toMatchObject({
      recurringExpenses: [],
      accountBalanceHistory: [],
      incomes: [],
    });
  });

  it("should add new expense", async () => {
    const storeBudgetRepository = new StoreBudgetRepository();
    await storeBudgetRepository.initializing;
    expect(storeBudgetRepository.budgetInfo).toBeDefined();

    const recurringExpense = {
      id: "1",
      amount: 50,
      label: "Groceries",
      recurring: { type: "monthly", dayOfMonth: 15 },
    } satisfies Expense;

    storeBudgetRepository.addOrUpdateExpense(recurringExpense);

    expect(storeBudgetRepository.budgetInfo).toMatchObject({
      recurringExpenses: [recurringExpense],
      accountBalanceHistory: [],
      incomes: [],
    });

    expect(mockedSet).toHaveBeenCalledWith("budgetInfo", {
      recurringExpenses: [recurringExpense],
      accountBalanceHistory: [],
      incomes: [],
    });
  });

  it("should update existing expense", async () => {
    const storeBudgetRepository = new StoreBudgetRepository();
    await storeBudgetRepository.initializing;
    expect(storeBudgetRepository.budgetInfo).toBeDefined();

    const recurringExpense1 = {
      id: "2",
      amount: 50,
      label: "Groceries",
      recurring: { type: "monthly", dayOfMonth: 15 },
    } satisfies Expense;

    const recurringExpense2 = {
      id: "3",
      amount: 20,
      label: "Transport",
      recurring: { type: "weekly", dayOfWeek: 1 },
    } satisfies Expense;

    storeBudgetRepository.addOrUpdateExpense(recurringExpense1);

    expect(mockedSet).toHaveBeenCalledWith("budgetInfo", {
      recurringExpenses: [recurringExpense1],
      accountBalanceHistory: [],
      incomes: [],
    });
    storeBudgetRepository.addOrUpdateExpense(recurringExpense2);
    expect(storeBudgetRepository.budgetInfo).toMatchObject({
      recurringExpenses: [recurringExpense1, recurringExpense2],
      accountBalanceHistory: [],
      incomes: [],
    });

    expect(mockedSet).toHaveBeenCalledWith("budgetInfo", {
      recurringExpenses: [recurringExpense1, recurringExpense2],
      accountBalanceHistory: [],
      incomes: [],
    });

    const replacementExpense1 = {
      id: "2",
      amount: 30,
      label: "Supermarket",
      recurring: { type: "monthly", dayOfMonth: 10 },
    } satisfies Expense;

    storeBudgetRepository.addOrUpdateExpense(replacementExpense1);

    expect(storeBudgetRepository.budgetInfo).toMatchObject({
      recurringExpenses: [replacementExpense1, recurringExpense2],
      accountBalanceHistory: [],
      incomes: [],
    });

    expect(mockedSet).toHaveBeenCalledWith("budgetInfo", {
      recurringExpenses: [replacementExpense1, recurringExpense2],
      accountBalanceHistory: [],
      incomes: [],
    });
  });

  it("should remove existing expense", async () => {
    mockedGet.mockResolvedValue({
      recurringExpenses: [
        {
          id: "4",
          amount: 50,
          label: "Groceries",
          recurring: { type: "monthly", dayOfMonth: 15 },
        },
        {
          id: "5",
          amount: 25,
          label: "Transport",
          recurring: { type: "weekly", dayOfWeek: 1 },
        },
      ],
      accountBalanceHistory: [],
      incomes: [],
    } satisfies BudgetInfo);

    const storeBudgetRepository = new StoreBudgetRepository();
    await storeBudgetRepository.initializing;

    expect(storeBudgetRepository.budgetInfo).toBeDefined();
    expect(
      storeBudgetRepository.budgetInfo.recurringExpenses.length
    ).toBeGreaterThan(0);

    storeBudgetRepository.removeExpense("4");
    expect(storeBudgetRepository.budgetInfo.recurringExpenses).toHaveLength(1);
    expect(storeBudgetRepository.budgetInfo.recurringExpenses).toMatchObject([
      {
        id: "5",
        amount: 25,
        label: "Transport",
        recurring: { type: "weekly", dayOfWeek: 1 },
      },
    ]);

    expect(mockedSet).toHaveBeenCalledWith("budgetInfo", {
      recurringExpenses: [
        {
          id: "5",
          amount: 25,
          label: "Transport",
          recurring: { type: "weekly", dayOfWeek: 1 },
        },
      ],
      accountBalanceHistory: [],
      incomes: [],
    } satisfies BudgetInfo);
  });

  it("should clear all data", async () => {
    mockedGet.mockResolvedValue({
      recurringExpenses: [
        {
          id: "4",
          amount: 50,
          label: "Groceries",
          recurring: { type: "monthly", dayOfMonth: 15 },
        },
        {
          id: "5",
          amount: 25,
          label: "Transport",
          recurring: { type: "weekly", dayOfWeek: 1 },
        },
      ],
      accountBalanceHistory: [
        { date: "2024-01-01", balance: 1000 },
        { date: "2024-02-01", balance: 1200 },
      ],
      incomes: [
        {
          id: "6",
          name: "Salary",
          dayOfMonth: 1,
          totalIn: 3000,
          totalRetained: 150,
        },
      ],
    } satisfies BudgetInfo);

    const storeBudgetRepository = new StoreBudgetRepository();
    await storeBudgetRepository.initializing;

    expect(storeBudgetRepository.budgetInfo).toBeDefined();

    storeBudgetRepository.clearAll();

    expect(storeBudgetRepository.budgetInfo).toMatchObject({
      recurringExpenses: [],
      accountBalanceHistory: [],
      incomes: [],
    });

    expect(mockedSet).toHaveBeenCalledWith("budgetInfo", {
      recurringExpenses: [],
      accountBalanceHistory: [],
      incomes: [],
    } satisfies BudgetInfo);
  });

  // TODO more tests
});

import { describe, it, expect, vi } from "vitest";

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn().mockResolvedValue({
    set: vi.fn(),
    get: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { storeBudgetRepository } from "@/budget/index.svelte";

describe("StoreBudgetRepository", () => {
  it("should initialize with default budget info", async () => {
    expect(storeBudgetRepository.budgetInfo).toBeDefined();
    expect(storeBudgetRepository.budgetInfo).toMatchObject({
      recurringExpenses: [],
      accountBalanceHistory: [],
      incomes: [],
    });
  });
});

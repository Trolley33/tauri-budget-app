<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import * as Card from "$lib/components/ui/card";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import Button from "@/components/ui/button/button.svelte";
  import Select from "@/components/ui/input/select.svelte";
  import {
    formatCurrency,
    formatOrdinal,
    getMonthName,
    getWeekdayName,
  } from "@/utils";
  import { Plus } from "@steeze-ui/heroicons";
  import { Icon } from "@steeze-ui/svelte-icon";
  import type { WeekdayNumbers } from "luxon";
  import { onMount } from "svelte";
  import { v4 } from "uuid";
  import { storeBudgetRepository } from "@/budget/index.svelte";
  import type { Expense } from "@/budget/types";
  import { titleStore } from "../../store/title";

  onMount(() => {
    $titleStore = `Expenses`;
  });

  let isOpen = $state(false);
  let selectedExpenseId: string | null = $state(null);

  let draftExpense: Expense | null = $state(null);

  $effect(() => {
    if (selectedExpenseId !== null) {
      draftExpense = storeBudgetRepository.budgetInfo.recurringExpenses.find(
        (expense) => expense.id === selectedExpenseId
      ) || {
        id: selectedExpenseId,
        label: "",
        amount: 0,
        recurring: {
          type: "monthly",
          dayOfMonth: 1,
        },
      };
    }
  });
</script>

<div
  class="w-full flex-grow overflow-y-auto pt-4 pb-32 px-4 flex flex-col gap-4 bg-slate-200"
>
  {#each storeBudgetRepository.budgetInfo.recurringExpenses.toSorted((a, b) => {
    // first weekly, then monthly, then yearly
    if (a.recurring.type === "weekly" && b.recurring.type !== "weekly") {
      return -1;
    } else if (a.recurring.type === "monthly" && b.recurring.type === "yearly") {
      return -1;
    } else if (a.recurring.type === "yearly" && b.recurring.type !== "yearly") {
      return 1;
    } else {
      return 0;
    }
  }) as expense (expense.id)}
    <Card.Root
      onclick={() => {
        selectedExpenseId = expense.id;
        isOpen = true;
      }}
    >
      <Card.Header class="relative">
        <Card.Title>{expense.label}</Card.Title>
        <Card.Description>{formatCurrency(expense.amount)}</Card.Description>
        <Badge
          variant={expense.recurring.type === "monthly"
            ? "green"
            : expense.recurring.type === "yearly"
              ? "indigo"
              : "amber"}
          class="absolute top-2 right-2"
        >
          {expense.recurring.type === "monthly"
            ? "Monthly"
            : expense.recurring.type === "yearly"
              ? "Yearly"
              : "Weekly"}
        </Badge>
      </Card.Header>
      <Card.Content>
        {#if expense.recurring.type === "monthly"}
          <b>{formatOrdinal(expense.recurring.dayOfMonth)}</b> of
          <b>every month</b>
        {:else if expense.recurring.type === "yearly"}
          <b>{formatOrdinal(expense.recurring.dayOfMonth)}</b> of
          <b>{getMonthName(expense.recurring.month)}</b>
        {:else if expense.recurring.type === "weekly"}
          Every <b
            >{getWeekdayName(expense.recurring.dayOfWeek as WeekdayNumbers)}</b
          >
        {/if}
      </Card.Content>
    </Card.Root>
  {/each}
</div>

<Dialog.Root
  bind:open={isOpen}
  onOpenChange={(op) => {
    if (!op) {
      selectedExpenseId = null;
      draftExpense = null;
    }
  }}
>
  <Dialog.Content>
    <form>
      {#if selectedExpenseId !== null && draftExpense !== null}
        <Dialog.Header>
          <Dialog.Title>
            Expense ID: {selectedExpenseId}
          </Dialog.Title>
        </Dialog.Header>
        <div class="flex flex-col gap-4">
          <div class="flex w-full max-w-sm flex-col gap-1.5">
            <Label>Label</Label>
            <Input type="text" bind:value={draftExpense.label} />
          </div>
          <div class="flex w-full max-w-sm flex-col gap-1.5">
            <Label>Amount (£)</Label>
            <Input required type="number" bind:value={draftExpense.amount} />
          </div>
          <div class="flex w-full max-w-sm flex-col gap-1.5">
            <Label>Type</Label>
            <Select required bind:value={draftExpense.recurring.type}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="weekly">Weekly</option>
            </Select>
          </div>
          {#if draftExpense.recurring.type === "weekly"}
            <div class="flex w-full max-w-sm flex-col gap-1.5">
              <Label>Day of Week</Label>
              <Select required bind:value={draftExpense.recurring.dayOfWeek}>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
                <option value={7}>Sunday</option>
              </Select>
            </div>
          {:else if draftExpense.recurring.type === "monthly"}
            <div class="flex w-full max-w-sm flex-col gap-1.5">
              <Label>Day of Month</Label>
              <Input
                type="number"
                required
                bind:value={draftExpense.recurring.dayOfMonth}
                min={1}
                max={31}
              />
            </div>
          {:else if draftExpense.recurring.type === "yearly"}
            <div class="flex w-full max-w-sm flex-col gap-1.5">
              <Label>Month</Label>
              <Select required bind:value={draftExpense.recurring.month}>
                <option value={1}>January</option>
                <option value={2}>February</option>
                <option value={3}>March</option>
                <option value={4}>April</option>
                <option value={5}>May</option>
                <option value={6}>June</option>
                <option value={7}>July</option>
                <option value={8}>August</option>
                <option value={9}>September</option>
                <option value={10}>October</option>
                <option value={11}>November</option>
                <option value={12}>December</option>
              </Select>
            </div>

            <div class="flex w-full max-w-sm flex-col gap-1.5">
              <Label>Day of Month</Label>
              <Input
                type="number"
                required
                bind:value={draftExpense.recurring.dayOfMonth}
                min={1}
                max={31}
              />
            </div>
          {/if}
        </div>
        <Dialog.Footer class="gap-2 mt-8">
          <Button
            type="button"
            variant="destructive"
            onclick={() => {
              storeBudgetRepository.removeExpense(selectedExpenseId!);
              isOpen = false;
            }}>Delete expense</Button
          >
          <Button
            type="submit"
            onclick={() => {
              storeBudgetRepository.addOrUpdateExpense(draftExpense!);
              isOpen = false;
            }}>Save changes</Button
          >
        </Dialog.Footer>
      {/if}
    </form>
  </Dialog.Content>
</Dialog.Root>

<Button
  class="fixed bottom-5 right-5 rounded-full w-10 h-10"
  onclick={() => {
    selectedExpenseId = v4();
    isOpen = true;
  }}
>
  <Icon src={Plus} theme="solid" class="!w-6 !h-6" />
</Button>

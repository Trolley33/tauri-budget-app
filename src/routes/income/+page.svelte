<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import Button from "@/components/ui/button/button.svelte";
  import { formatCurrency, formatOrdinal } from "@/utils";
  import { Plus } from "@steeze-ui/heroicons";
  import { Icon } from "@steeze-ui/svelte-icon";
  import { onMount } from "svelte";
  import { v4 } from "uuid";
  import { storeBudgetRepository } from "@/budget/index.svelte";
  import type { Income } from "@/budget/types";
  import { titleStore } from "../../store/title";

  onMount(() => {
    $titleStore = `Income`;
  });

  let isOpen = $state(false);
  let selectedIncomeId: string | null = $state(null);

  let draftIncome: Income | null = $state(null);

  $effect(() => {
    if (selectedIncomeId !== null) {
      draftIncome = storeBudgetRepository.budgetInfo.incomes.find(
        (income) => income.id === selectedIncomeId
      ) || {
        id: selectedIncomeId,
        name: "",
        dayOfMonth: 31,
        totalIn: 0,
        totalRetained: 0,
      };
    }
  });
</script>

<div
  class="w-full flex-grow overflow-y-auto pt-4 pb-32 px-4 flex flex-col gap-4 bg-slate-200"
>
  {#each storeBudgetRepository.budgetInfo.incomes as income (income.id)}
    <Card.Root
      onclick={() => {
        selectedIncomeId = income.id;
        isOpen = true;
      }}
    >
      <Card.Header>
        <Card.Title>{income.name}</Card.Title>
      </Card.Header>
      <Card.Content class="grid grid-cols-2 gap-x-2 gap-y-5">
        <div class="flex flex-col gap-0.5">
          <span class="text-sm font-semibold leading-none">Total Income</span>
          <span>{formatCurrency(income.totalIn)}</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-sm font-semibold leading-none">Total Kept</span>
          <span>{formatCurrency(income.totalRetained)}</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-sm font-semibold leading-none">Total Profit</span>
          <span>{formatCurrency(income.totalIn - income.totalRetained)}</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-sm font-semibold leading-none"
            >Day of the month</span
          >
          <span>{formatOrdinal(income.dayOfMonth)}</span>
        </div>
      </Card.Content>
    </Card.Root>
  {/each}
</div>

<Dialog.Root
  bind:open={isOpen}
  onOpenChange={(op) => {
    if (!op) {
      selectedIncomeId = null;
      draftIncome = null;
    }
  }}
>
  <Dialog.Content>
    <form>
      {#if selectedIncomeId !== null && draftIncome !== null}
        <Dialog.Header>
          <Dialog.Title>
            Income ID: {selectedIncomeId}
          </Dialog.Title>
        </Dialog.Header>
        <div class="flex flex-col gap-4">
          <div class="flex w-full max-w-sm flex-col gap-1.5">
            <Label>Name</Label>
            <Input type="text" bind:value={draftIncome.name} />
          </div>
          <div class="flex w-full max-w-sm flex-col gap-1.5">
            <Label>Total In</Label>
            <Input required type="number" bind:value={draftIncome.totalIn} />
          </div>
          <div class="flex w-full max-w-sm flex-col gap-1.5">
            <Label>Total Retained</Label>
            <Input
              required
              type="number"
              bind:value={draftIncome.totalRetained}
            />
          </div>
          <div class="flex w-full max-w-sm flex-col gap-1.5">
            <Label>Day of Month</Label>
            <Input
              type="number"
              required
              bind:value={draftIncome.dayOfMonth}
              min={1}
              max={31}
            />
          </div>
        </div>
        <Dialog.Footer class="gap-2 mt-8">
          <Button
            type="button"
            variant="destructive"
            onclick={() => {
              storeBudgetRepository.removeIncome(selectedIncomeId!);
              isOpen = false;
            }}>Delete income</Button
          >
          <Button
            type="submit"
            onclick={() => {
              storeBudgetRepository.addOrUpdateIncome(draftIncome!);
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
    selectedIncomeId = v4();
    isOpen = true;
  }}
>
  <Icon src={Plus} theme="solid" class="!w-6 !h-6" />
</Button>

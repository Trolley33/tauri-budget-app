<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { DateTime, Interval } from "luxon";
  import { budgetStore, generateForecast } from "../store/budget-store";

  import { ArrowLeft, ArrowRight } from "@steeze-ui/heroicons";
  import { Icon } from "@steeze-ui/svelte-icon";
  import { titleStore } from "../store/title";

  let currentView: {
    type: "month" | "week";
    anchor: DateTime;
  } = $state({
    type: "month",
    anchor: DateTime.local(),
  });

  let currentRange = $derived.by(() => {
    let range: Interval;
    if (currentView.type === "month") {
      range = Interval.fromDateTimes(
        currentView.anchor.startOf("month"),
        currentView.anchor.endOf("month")
      );
    } else {
      range = Interval.fromDateTimes(
        currentView.anchor.startOf("week"),
        currentView.anchor.plus({ week: 3 }).endOf("week")
      );
    }

    return range;
  });

  let currentForecast = $derived.by(() => {
    $budgetStore;
    return generateForecast(currentRange);
  });

  function next() {
    currentView.anchor = currentView.anchor.plus({
      month: currentView.type === "month" ? 1 : 0,
      week: currentView.type === "week" ? 1 : 0,
    });
  }

  function prev() {
    currentView.anchor = currentView.anchor.minus({
      month: currentView.type === "month" ? 1 : 0,
      week: currentView.type === "week" ? 1 : 0,
    });
  }

  function swapViewType() {
    currentView.type = currentView.type === "month" ? "week" : "month";
  }

  $effect(() => {
    $titleStore = `Forecast - ${currentView.type === "month" ? "Monthly" : "Weekly"}`;
  });

  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { cn, formatCurrency } from "@/utils";

  let isManualBalanceDialogOpen = $state(false);
  let isExpensesDialogOpen = $state(false);

  let selectedDate = $state<DateTime | null>(null);
  let manualBalance = $state(0);
</script>

<nav class="w-full text-white flex bg-indigo-700">
  <button type="button" class="p-3 active:bg-indigo-800" onclick={prev}>
    <Icon src={ArrowLeft} class="w-6 h-6" theme="solid" />
  </button>
  <button class="flex-grow p-3" onclick={swapViewType}>
    {currentRange.toFormat("dd LLL yyyy")}
  </button>

  <button type="button" class="p-3 active:bg-indigo-800" onclick={next}>
    <Icon src={ArrowRight} class="w-6 h-6" theme="solid" />
  </button>
</nav>

{#if currentForecast}
  <div class="w-full flex-grow overflow-y-auto">
    <table class="w-full">
      <thead>
        <tr class="sticky -top-px">
          <th class="bg-slate-800 text-slate-50 border-r px-4 py-1 text-left"
            >Date</th
          >
          <th class="bg-slate-800 text-slate-50 border-r px-2 py-1">Starting</th
          >
          <th class="bg-slate-800 text-slate-50 border-l px-2 py-1">Closing</th>
          <th class="bg-slate-800 text-slate-50 border-l px-2 py-1">Expenses</th
          >
          <th class="bg-slate-800 text-slate-50 border-l px-2 py-1">#</th>
        </tr>
      </thead>
      <tbody>
        {#each currentForecast as day, idx (day.date.toISODate())}
          <tr
            class:border-t-8={day.date.weekday === 1 && idx !== 0}
            class={cn(
              day.isPayday
                ? "bg-green-100 active:bg-green-300 hover:bg-green-300"
                : {
                    "bg-slate-50": idx % 2 === 0,
                    "active:bg-slate-200 hover:bg-slate-200": true,
                  }
            )}
          >
            <td
              class={cn("border px-4 py-3 text-left", {
                "font-semibold bg-pink-200": DateTime.local().hasSame(
                  day.date,
                  "day"
                ),
              })}
            >
              {day.date.toLocaleString(DateTime.DATEMEDWITHWEEKDAY)}
            </td>
            <td class="border px-2 py-3 text-right"
              >{formatCurrency(day.startingBalance)}</td
            >
            <td
              class="border px-2 py-3 text-right"
              class:underline={day.type === "manual"}
              onclick={() => {
                selectedDate = day.date;
                if (day.type === "manual") {
                  manualBalance = day.closingBalance;
                } else {
                  manualBalance = 0;
                }
                isManualBalanceDialogOpen = true;
              }}
            >
              {formatCurrency(day.closingBalance)}
            </td>
            <td
              class="border px-2 py-3 text-right"
              onclick={() => {
                selectedDate = day.date;
                isExpensesDialogOpen = true;
              }}
            >
              {#if day.totalExpenseCost != 0}
                {formatCurrency(-1 * day.totalExpenseCost)}
              {/if}
            </td>
            <td
              class="border px-2 py-3 text-right"
              onclick={() => {
                selectedDate = day.date;
                isExpensesDialogOpen = true;
              }}
            >
              {#if day.expenses.length + day.incomes.length > 0}
                {day.expenses.length + day.incomes.length}
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<Dialog.Root bind:open={isManualBalanceDialogOpen}>
  <Dialog.Content>
    {#if selectedDate !== null}
      <Dialog.Header>
        <Dialog.Title
          >Manually set balance for {selectedDate.toLocaleString(
            DateTime.DATEMEDWITHWEEKDAY
          )}</Dialog.Title
        >
      </Dialog.Header>
      <div>
        <Input type="number" bind:value={manualBalance} />
      </div>
      <Dialog.Footer class="gap-2">
        <Button
          type="button"
          variant="destructive"
          onclick={() => {
            budgetStore.setManualBalance(selectedDate!, null);
            isManualBalanceDialogOpen = false;
            selectedDate = null;
          }}>Clear</Button
        >
        <Button
          type="button"
          onclick={() => {
            budgetStore.setManualBalance(selectedDate!, manualBalance);
            isManualBalanceDialogOpen = false;
            selectedDate = null;
          }}>Save changes</Button
        >
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={isExpensesDialogOpen}>
  <Dialog.Content>
    {#if selectedDate !== null}
      <Dialog.Header>
        <Dialog.Title>
          Expenses on {selectedDate.toLocaleString(DateTime.DATEMEDWITHWEEKDAY)}
        </Dialog.Title>
        <div class="px-10 pt-5">
          <h2 class="font-semibold">Outgoing</h2>
          {#each currentForecast.find( (f) => f.date.hasSame(selectedDate!, "day") )?.expenses || [] as expense}
            <li class="list-disc">
              {expense.label}: {formatCurrency(-1 * expense.amount)}
            </li>
          {:else}
            <p><i>Nothing!</i></p>
          {/each}
        </div>
        <div class="px-10 pt-5">
          <h2 class="font-semibold">Incoming</h2>
          {#each currentForecast.find( (f) => f.date.hasSame(selectedDate!, "day") )?.incomes || [] as income}
            <li class="list-disc">
              {income.name}: {formatCurrency(
                income.totalIn - income.totalRetained
              )}
            </li>
          {:else}
            <p><i>Nothing!</i></p>
          {/each}
        </div>
      </Dialog.Header>
    {/if}
  </Dialog.Content>
</Dialog.Root>

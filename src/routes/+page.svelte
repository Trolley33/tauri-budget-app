<script lang="ts">
  import { budget_store, generateForecast } from "../store/budget-store";
  import { DateTime, Interval } from "luxon";
  import * as Dialog from "$lib/components/ui/dialog";

  import { Icon } from "@steeze-ui/svelte-icon";
  import { ArrowLeft, ArrowRight, Bars3 } from "@steeze-ui/heroicons";
  import { title_store } from "../store/title";

  let current_view: {
    type: "month" | "week";
    anchor: DateTime;
  } = $state({
    type: "month",
    anchor: DateTime.local(),
  });

  let current_range = $derived.by(() => {
    let range: Interval;
    if (current_view.type === "month") {
      range = Interval.fromDateTimes(
        current_view.anchor.startOf("month"),
        current_view.anchor.endOf("month")
      );
    } else {
      range = Interval.fromDateTimes(
        current_view.anchor.startOf("week"),
        current_view.anchor.plus({ week: 3 }).endOf("week")
      );
    }

    return range;
  });

  let current_forecast = $derived.by(() => {
    $budget_store;
    return generateForecast(current_range);
  });

  function next() {
    current_view.anchor = current_view.anchor.plus({
      month: current_view.type === "month" ? 1 : 0,
      week: current_view.type === "week" ? 1 : 0,
    });
  }

  function prev() {
    current_view.anchor = current_view.anchor.minus({
      month: current_view.type === "month" ? 1 : 0,
      week: current_view.type === "week" ? 1 : 0,
    });
  }

  function swapViewType() {
    current_view.type = current_view.type === "month" ? "week" : "month";
  }

  $effect(() => {
    $title_store = `Forecast - ${current_view.type === "month" ? "Monthly" : "Weekly"}`;
  });

  import { Input } from "$lib/components/ui/input/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { cn, format_currency } from "@/utils";

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
    {current_range.toFormat("dd LLL yyyy")}
  </button>

  <button type="button" class="p-3 active:bg-indigo-800" onclick={next}>
    <Icon src={ArrowRight} class="w-6 h-6" theme="solid" />
  </button>
</nav>

{#if current_forecast}
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
        {#each current_forecast as day, idx (day.date.toISODate())}
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
              {day.date.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)}
            </td>
            <td class="border px-2 py-3 text-right"
              >{format_currency(day.starting_balance)}</td
            >
            <td
              class="border px-2 py-3 text-right"
              class:underline={day.type === "manual"}
              onclick={() => {
                selectedDate = day.date;
                if (day.type === "manual") {
                  manualBalance = day.closing_balance;
                } else {
                  manualBalance = 0;
                }
                isManualBalanceDialogOpen = true;
              }}
            >
              {format_currency(day.closing_balance)}
            </td>
            <td
              class="border px-2 py-3 text-right"
              onclick={() => {
                selectedDate = day.date;
                isExpensesDialogOpen = true;
              }}
            >
              {#if day.total_expense_cost != 0}
                {format_currency(-1 * day.total_expense_cost)}
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
            DateTime.DATE_MED_WITH_WEEKDAY
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
            budget_store.setManualBalance(selectedDate!, null);
            isManualBalanceDialogOpen = false;
            selectedDate = null;
          }}>Clear</Button
        >
        <Button
          type="button"
          onclick={() => {
            budget_store.setManualBalance(selectedDate!, manualBalance);
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
          Expenses on {selectedDate.toLocaleString(
            DateTime.DATE_MED_WITH_WEEKDAY
          )}
        </Dialog.Title>
        <div class="px-10 pt-5">
          <h2 class="font-semibold">Outgoing</h2>
          {#each current_forecast.find( (f) => f.date.hasSame(selectedDate!, "day") )?.expenses || [] as expense}
            <li class="list-disc">
              {expense.label}: {format_currency(-1 * expense.amount)}
            </li>
          {:else}
            <p><i>Nothing!</i></p>
          {/each}
        </div>
        <div class="px-10 pt-5">
          <h2 class="font-semibold">Incoming</h2>
          {#each current_forecast.find( (f) => f.date.hasSame(selectedDate!, "day") )?.incomes || [] as income}
            <li class="list-disc">
              {income.name}: {format_currency(
                income.total_in - income.total_retained
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

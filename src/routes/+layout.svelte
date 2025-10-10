<script module lang="ts">
  import { setInterval } from "worker-timers";
  import { browser } from "$app/environment";

  // setInterval(() => {
  //   // do something every 5 seconds - even if app is minimized
  // }, 5000);
</script>

<script lang="ts">
  import { page } from "$app/stores";
  import { title_store } from "../store/title";
  import { Button } from "$lib/components/ui/button";
  import * as Sheet from "$lib/components/ui/sheet";
  import "../app.css";

  let nav_items = [
    { label: "Forecasting", href: "/" },
    { label: "Expenses", href: "/expenses" },
    { label: "Income", href: "/income" },
  ];

  let { children } = $props();
  let isOpen = $state(false);

  import { Bars3 } from "@steeze-ui/heroicons";
  import { Icon } from "@steeze-ui/svelte-icon";
  import { budget_store } from "../store/budget-store";
</script>

<Sheet.Root bind:open={isOpen}>
  <Sheet.Content side="left">
    <div class="flex flex-col pt-8 gap-2 h-full">
      {#each nav_items as item}
        <Button
          variant={$page.url.pathname === item.href ? "default" : "outline"}
          href={item.href}
          onclick={() => (isOpen = false)}
        >
          {item.label}
        </Button>
      {/each}
      <div class="flex-grow" />
      <Button
        variant={"destructive"}
        onclick={() => {
          isOpen = false;
          budget_store.clearAll();
        }}
      >
        Clear all data
      </Button>
    </div>
  </Sheet.Content>
  <main class="w-screen h-screen max-h-screen flex flex-col">
    <nav class="w-full text-white flex bg-indigo-700">
      <Sheet.Trigger class="p-3 active:bg-indigo-800">
        <Icon src={Bars3} class="w-6 h-6" theme="solid" />
      </Sheet.Trigger>
      <h1 class="flex-grow p-3 text-lg font-bold">
        {$title_store}
      </h1>
    </nav>
    {@render children?.()}
  </main>
</Sheet.Root>

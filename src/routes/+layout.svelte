<script lang="ts">
  import { page } from "$app/stores";
  import { titleStore } from "../store/title";
  import { Button } from "$lib/components/ui/button";
  import * as Sheet from "$lib/components/ui/sheet";
  import "../app.css";

  let navItems = [
    { label: "Forecasting", href: "/" },
    { label: "Expenses", href: "/expenses" },
    { label: "Income", href: "/income" },
  ];

  let { children } = $props();
  let isOpen = $state(false);

  import { Bars3 } from "@steeze-ui/heroicons";
  import { Icon } from "@steeze-ui/svelte-icon";
  import { storeBudgetRepository } from "@/budget/index.svelte";
</script>

<Sheet.Root bind:open={isOpen}>
  <Sheet.Content side="left">
    <div class="flex flex-col pt-8 gap-2 h-full">
      {#each navItems as item}
        <Button
          variant={$page.url.pathname === item.href ? "default" : "outline"}
          href={item.href}
          onclick={() => (isOpen = false)}
        >
          {item.label}
        </Button>
      {/each}
      <div class="flex-grow"></div>
      <Button
        variant={"destructive"}
        onclick={() => {
          isOpen = false;
          storeBudgetRepository.clearAll();
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
        {$titleStore}
      </h1>
    </nav>
    {@render children?.()}
  </main>
</Sheet.Root>

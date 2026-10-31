<script lang="ts" generics="T extends string">
	import type { Component } from 'svelte';

	interface Tab {
		id: T;
		label: string;
		icon?: Component;
		count?: number;
	}

	let { tabs, value = $bindable() }: { tabs: Tab[]; value: T } = $props();
</script>

<div role="tablist" class="flex gap-1 rounded-lg bg-stone-100 p-1">
	{#each tabs as tab (tab.id)}
		<button
			type="button"
			role="tab"
			aria-selected={value === tab.id}
			class={[
				'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition [&_svg]:size-4',
				value === tab.id
					? 'bg-white text-stone-900 shadow-sm'
					: 'text-stone-600 hover:text-stone-900'
			]}
			onclick={() => (value = tab.id)}
		>
			{#if tab.icon}<tab.icon />{/if}
			{tab.label}
			{#if tab.count}
				<span class="rounded-full bg-red-500 px-1.5 text-xs leading-5 text-white">{tab.count}</span>
			{/if}
		</button>
	{/each}
</div>

<script lang="ts" generics="T extends string">
	import type { Component } from 'svelte';

	interface Option {
		value: T;
		label: string;
		icon?: Component;
	}

	interface Props {
		options: Option[];
		value: T;
		label: string;
		onchange?: (value: T) => void;
	}

	let { options, value = $bindable(), label, onchange }: Props = $props();
</script>

<div role="radiogroup" aria-label={label} class="flex gap-0.5 rounded-lg bg-stone-100 p-0.5">
	{#each options as option (option.value)}
		<button
			type="button"
			role="radio"
			aria-checked={value === option.value}
			class={[
				'flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium transition [&_svg]:size-4',
				value === option.value
					? 'bg-white text-stone-900 shadow-sm'
					: 'text-stone-600 hover:text-stone-900'
			]}
			onclick={() => {
				value = option.value;
				onchange?.(option.value);
			}}
		>
			{#if option.icon}<option.icon />{/if}
			{option.label}
		</button>
	{/each}
</div>

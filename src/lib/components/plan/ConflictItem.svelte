<script lang="ts">
	import type { Snippet } from 'svelte';
	import { treeName, type PlannedTree } from '#lib/plan.ts';
	import ColorSwatch from '#lib/components/ui/ColorSwatch.svelte';

	interface Props {
		a: PlannedTree;
		b: PlannedTree;
		tone: 'red' | 'amber';
		onclick: () => void;
		children: Snippet;
	}

	let { a, b, tone, onclick, children }: Props = $props();
</script>

<button
	type="button"
	class={[
		'flex w-full cursor-pointer flex-col gap-1 rounded-lg border px-3 py-2 text-left transition-colors',
		tone === 'red'
			? 'border-red-200 bg-red-50/60 hover:bg-red-50'
			: 'border-amber-200 bg-amber-50/60 hover:bg-amber-50'
	]}
	{onclick}
>
	<span class="flex items-center gap-1.5 text-sm font-medium text-stone-900">
		<ColorSwatch color={a.color} />
		<span class="truncate">{treeName(a)}</span>
		<span class="text-stone-400">↔</span>
		<ColorSwatch color={b.color} />
		<span class="truncate">{treeName(b)}</span>
	</span>
	<span class={['text-xs', tone === 'red' ? 'text-red-700' : 'text-amber-800']}>
		{@render children()}
	</span>
</button>

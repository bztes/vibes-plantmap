<script lang="ts">
	import { treeName, treeSummary, type PlannedTree, type Sized } from '#lib/plan.ts';
	import ColorSwatch from '#lib/components/ui/ColorSwatch.svelte';

	interface Props {
		tree: Sized<PlannedTree>;
		selected: boolean;
		onclick: () => void;
	}

	let { tree, selected, onclick }: Props = $props();
</script>

<button
	type="button"
	aria-pressed={selected}
	class={[
		'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
		selected ? 'bg-leaf-50 ring-1 ring-leaf-200 ring-inset' : 'hover:bg-stone-100'
	]}
	{@attach (el) => {
		// keep it visible when the tree was picked on the map
		if (selected) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}}
	{onclick}
>
	<ColorSwatch color={tree.color} class="size-3.5" />
	<span class="min-w-0 flex-1">
		<span class="block truncate text-sm font-medium text-stone-900">{treeName(tree)}</span>
		<span class="block truncate text-xs text-stone-500">{treeSummary(tree)}</span>
	</span>
</button>

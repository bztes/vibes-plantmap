<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { TriangleAlert } from '@lucide/svelte';
	import { formatMeters } from '#lib/growth.ts';
	import { treeName, type PlannedTree, type Sized } from '#lib/plan.ts';
	import Badge from '#lib/components/ui/Badge.svelte';
	import ColorSwatch from '#lib/components/ui/ColorSwatch.svelte';

	interface Props {
		tree: Sized<PlannedTree>;
		conflict: boolean;
		onclick: () => void;
	}

	let { tree, conflict, onclick }: Props = $props();

	const spread = $derived(formatMeters(tree.size.spread));
	const height = $derived(formatMeters(tree.size.height));
</script>

<button
	type="button"
	class="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-stone-100"
	{onclick}
>
	<ColorSwatch color={tree.color} class="size-3.5" />
	<span class="min-w-0 flex-1">
		<span class="block truncate text-sm font-medium text-stone-900">{treeName(tree)}</span>
		<span class="block truncate text-xs text-stone-500">
			{tree.label ? `${tree.speciesName} · ` : ''}⌀ {spread} · {t`${height} high`}
		</span>
	</span>
	{#if !tree.size.planted}<Badge tone="blue">{t`planned`}</Badge>{/if}
	{#if conflict}
		<TriangleAlert class="size-4 shrink-0 text-red-500" aria-label={t`Too close to another tree`} />
	{/if}
</button>

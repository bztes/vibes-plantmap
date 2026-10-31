<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { formatMeters } from '#lib/growth.ts';
	import type { PlannedTree, Sized } from '#lib/plan.ts';
	import StatTile from '#lib/components/ui/StatTile.svelte';

	interface Props {
		tree: Sized<PlannedTree>;
		year: number;
	}

	let { tree, year }: Props = $props();

	const progress = $derived(Math.min(1, tree.size.spread / tree.matureSpread));
	const age = $derived(Math.floor(tree.size.age));
	const matureHeight = $derived(formatMeters(tree.matureHeight));
	const matureSpread = $derived(formatMeters(tree.matureSpread));
</script>

<div class="flex flex-col gap-2">
	<div class="flex items-baseline justify-between text-sm">
		<span class="font-medium text-stone-700">{t`Size in ${year}`}</span>
		<span class="text-xs text-stone-500">
			{#if tree.size.planted}
				{age === 1 ? t`1 year after planting` : t`${age} years after planting`}
			{:else}
				{t`not planted yet`}
			{/if}
		</span>
	</div>
	<div class="grid grid-cols-2 gap-2">
		<StatTile
			label={t`Height`}
			value={formatMeters(tree.size.height)}
			hint={t`mature ${matureHeight}`}
		/>
		<StatTile
			label={t`Crown width`}
			value={formatMeters(tree.size.spread)}
			hint={t`mature ${matureSpread}`}
		/>
	</div>
	<div>
		<div class="mb-1 flex justify-between text-xs text-stone-500">
			<span>{t`Growth towards mature size`}</span>
			<span class="tabular-nums">{Math.round(progress * 100)}%</span>
		</div>
		<div class="h-1.5 overflow-hidden rounded-full bg-stone-200">
			<div class="h-full rounded-full bg-leaf-500" style:width="{progress * 100}%"></div>
		</div>
	</div>
</div>

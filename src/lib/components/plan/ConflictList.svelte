<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { CircleCheck } from '@lucide/svelte';
	import { formatMeters } from '#lib/growth.ts';
	import type { Conflict, PlannedTree, UpcomingConflict } from '#lib/plan.ts';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import ConflictItem from './ConflictItem.svelte';

	interface Props {
		year: number;
		conflicts: Conflict[];
		upcoming: UpcomingConflict[];
		onfocus: (a: PlannedTree, b: PlannedTree) => void;
	}

	let { year, conflicts, upcoming, onfocus }: Props = $props();
</script>

{#if conflicts.length === 0 && upcoming.length === 0}
	<EmptyState
		icon={CircleCheck}
		title={t`Plenty of room`}
		description={t`No crowns overlap, not even when all trees are fully grown.`}
	/>
{:else}
	<div class="flex flex-col gap-5">
		{#if conflicts.length > 0}
			<section class="flex flex-col gap-2">
				<h3 class="text-xs font-semibold tracking-wide text-stone-500 uppercase">
					{t`Overlapping in ${year}`}
				</h3>
				{#each conflicts as c (c.a.id + c.b.id)}
					<ConflictItem a={c.a} b={c.b} tone="red" onclick={() => onfocus(c.a, c.b)}>
						{@const overlap = formatMeters(c.overlap)}
						{@const distance = formatMeters(c.distance)}
						{t`Crowns overlap by ${overlap} · ${distance} apart`}
					</ConflictItem>
				{/each}
			</section>
		{/if}
		{#if upcoming.length > 0}
			<section class="flex flex-col gap-2">
				<h3 class="text-xs font-semibold tracking-wide text-stone-500 uppercase">{t`Later on`}</h3>
				{#each upcoming as c (c.a.id + c.b.id)}
					<ConflictItem a={c.a} b={c.b} tone="amber" onclick={() => onfocus(c.a, c.b)}>
						{t`Crowns start touching around ${c.year}`}
					</ConflictItem>
				{/each}
			</section>
		{/if}
	</div>
{/if}

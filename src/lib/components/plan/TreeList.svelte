<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { TreeDeciduous } from '@lucide/svelte';
	import type { Conflict, PlannedTree, Sized } from '#lib/plan.ts';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import TreeListItem from './TreeListItem.svelte';

	interface Props {
		trees: Sized<PlannedTree>[];
		conflicts: Conflict[];
		onselect: (id: string) => void;
	}

	let { trees, conflicts, onselect }: Props = $props();

	const conflicting = $derived(new Set(conflicts.flatMap((c) => [c.a.id, c.b.id])));
</script>

{#if trees.length === 0}
	<EmptyState
		icon={TreeDeciduous}
		title={t`No trees yet`}
		description={t`Pick a species above the map, click “Add tree” and then click on the map to place it.`}
	/>
{:else}
	<div class="flex flex-col gap-0.5">
		{#each trees as tree (tree.id)}
			<TreeListItem {tree} conflict={conflicting.has(tree.id)} onclick={() => onselect(tree.id)} />
		{/each}
	</div>
{/if}

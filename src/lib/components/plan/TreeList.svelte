<script lang="ts">
	import { t } from '@bztes/vibes-t0n';
	import { TreeDeciduous } from '@lucide/svelte';
	import type { Conflict, PlannedTree, Sized } from '#lib/plan.ts';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import TreeListItem from './TreeListItem.svelte';

	interface Props {
		trees: Sized<PlannedTree>[];
		conflicts: Conflict[];
		selectedId: string | null;
		onselect: (id: string) => void;
	}

	let { trees, conflicts, selectedId, onselect }: Props = $props();

	const conflicting = $derived(new Set(conflicts.flatMap((c) => [c.a.id, c.b.id])));
</script>

{#if trees.length === 0}
	<EmptyState
		icon={TreeDeciduous}
		title={t`No trees yet`}
		description={t`Tap “Add tree”, choose a species and move the map to place it.`}
	/>
{:else}
	<div class="flex flex-col gap-0.5">
		{#each trees as tree (tree.id)}
			<TreeListItem
				{tree}
				conflict={conflicting.has(tree.id)}
				selected={tree.id === selectedId}
				onclick={() => onselect(tree.id)}
			/>
		{/each}
	</div>
{/if}

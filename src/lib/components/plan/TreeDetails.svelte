<script lang="ts">
	import { ArrowLeft, Move, Pencil, Trash2 } from '@lucide/svelte';
	import { deleteTree, type TreeRow } from '#lib/remote/trees.remote.ts';
	import {
		treeName,
		type Conflict,
		type PlannedTree,
		type Sized,
		type UpcomingConflict
	} from '#lib/plan.ts';
	import { getLocale, t } from '#lib/i18n/index.ts';
	import { formatMeters } from '#lib/growth.ts';
	import Alert from '#lib/components/ui/Alert.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import ColorSwatch from '#lib/components/ui/ColorSwatch.svelte';
	import ConfirmDialog from '#lib/components/ui/ConfirmDialog.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import GrowthStats from './GrowthStats.svelte';
	import TreeEditDialog from './TreeEditDialog.svelte';

	interface Props {
		tree: Sized<TreeRow>;
		/** plan id or share link token, see `getPlanAccess` */
		planRef: string;
		/** false for view-only share links */
		editable: boolean;
		species: { id: string; name: string; matureHeight: number; matureSpread: number }[];
		year: number;
		conflicts: Conflict[];
		upcoming: UpcomingConflict[];
		/** true while this tree follows the map center */
		moving: boolean;
		onmove: (moving: boolean) => void;
		onclose: () => void;
	}

	let {
		tree,
		planRef,
		editable,
		species,
		year,
		conflicts,
		upcoming,
		moving,
		onmove,
		onclose
	}: Props = $props();

	const other = (c: { a: PlannedTree; b: PlannedTree }) => (c.a.id === tree.id ? c.b : c.a);
	const planted = $derived(
		new Date(tree.plantedAt).toLocaleDateString(getLocale(), {
			dateStyle: 'medium',
			timeZone: 'UTC'
		})
	);

	const displayName = $derived(treeName(tree));

	let editing = $state(false);
	let confirmingDelete = $state(false);
</script>

<div class="flex flex-col gap-5">
	<div class="flex items-center gap-2">
		<IconButton label={t`Back to list`} small onclick={onclose}><ArrowLeft /></IconButton>
		<ColorSwatch color={tree.color} class="size-4" />
		<div class="min-w-0 flex-1">
			<h2 class="truncate font-semibold text-stone-900">{displayName}</h2>
			{#if tree.label}
				<p class="truncate text-xs text-stone-500">{tree.speciesName}</p>
			{/if}
		</div>
		{#if editable}
			<IconButton label={t`Edit tree`} small onclick={() => (editing = true)}><Pencil /></IconButton
			>
			<IconButton
				label={t`Delete tree`}
				small
				variant="danger-ghost"
				onclick={() => (confirmingDelete = true)}
			>
				<Trash2 />
			</IconButton>
		{/if}
	</div>

	<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
		<dt class="text-stone-500">{t`Species`}</dt>
		<dd class="text-stone-900">{tree.speciesName}</dd>
		<dt class="text-stone-500">{t`Planted`}</dt>
		<dd class="text-stone-900">{planted}</dd>
	</dl>

	{#if editable}
		<div class="flex items-center gap-2">
			<!-- confirmed or cancelled from the map -->
			<Button size="sm" variant="outline" disabled={moving} onclick={() => onmove(true)}
				><Move /> {t`Move tree`}</Button
			>
		</div>
	{/if}

	<GrowthStats {tree} {year} />

	{#if conflicts.length > 0 || upcoming.length > 0}
		<Alert tone={conflicts.length ? 'error' : 'warning'}>
			<ul class="flex flex-col gap-0.5">
				{#each conflicts as c (c.a.id + c.b.id)}
					{@const o = other(c)}
					{@const name = treeName(o)}
					{@const overlap = formatMeters(c.overlap)}
					<li>{t`Overlaps ${name} by ${overlap} in ${year}`}</li>
				{/each}
				{#each upcoming as c (c.a.id + c.b.id)}
					{@const o = other(c)}
					{@const name = treeName(o)}
					<li>{t`Touches ${name} around ${c.year}`}</li>
				{/each}
			</ul>
		</Alert>
	{/if}

	{#if tree.notes}
		<div class="flex flex-col gap-1">
			<h3 class="text-sm font-medium text-stone-700">{t`Notes`}</h3>
			<p class="text-sm whitespace-pre-line text-stone-600">{tree.notes}</p>
		</div>
	{/if}
</div>

{#if editable}
	<TreeEditDialog bind:open={editing} {tree} {planRef} {species} />
{/if}

<ConfirmDialog
	bind:open={confirmingDelete}
	title={t`Delete tree?`}
	message={t`“${displayName}” will be removed from this plan.`}
	onconfirm={async () => {
		await deleteTree({ id: tree.id, planRef });
		onclose();
	}}
/>

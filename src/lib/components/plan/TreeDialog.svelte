<script lang="ts">
	import { t } from '@bztes/vibes-t0n';
	import { Trash2 } from '@lucide/svelte';
	import { deleteTree, updateTree, type TreeRow } from '#lib/remote/trees.remote.ts';
	import { treeName, type Sized } from '#lib/plan.ts';
	import FormIssues from '#lib/components/layout/FormIssues.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import ConfirmDialog from '#lib/components/ui/ConfirmDialog.svelte';
	import Dialog from '#lib/components/ui/Dialog.svelte';
	import Field from '#lib/components/ui/Field.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import ColorSwatch from '#lib/components/ui/ColorSwatch.svelte';
	import Textarea from '#lib/components/ui/Textarea.svelte';
	import GrowthChart from './GrowthChart.svelte';
	import GrowthStats from './GrowthStats.svelte';
	import TreeMeasurements from './TreeMeasurements.svelte';
	import SpeciesDialog from './SpeciesDialog.svelte';
	import type { PickableSpecies } from './SpeciesPicker.svelte';

	interface Props {
		open: boolean;
		tree: Sized<TreeRow>;
		/** plan id or share link token, see `getPlanAccess` */
		planRef: string;
		/** false for view-only share links, the details are then read-only */
		editable: boolean;
		species: PickableSpecies[];
		/** date the map shows */
		viewDate: Date;
		ondelete: () => void;
	}

	let {
		open = $bindable(),
		tree,
		planRef,
		editable,
		species,
		viewDate,
		ondelete
	}: Props = $props();

	const form = $derived(updateTree.for(tree.id));
	const f = $derived(form.fields);
	// picked in a separate dialog, submitted through a hidden input
	let speciesId = $state('');
	$effect.pre(() => {
		if (open) speciesId = tree.speciesId;
	});
	let choosingSpecies = $state(false);
	const baseSpecies = $derived(species.find((s) => s.id === speciesId));
	const displayName = $derived(treeName(tree));
	let confirmingDelete = $state(false);
</script>

<Dialog bind:open title={displayName} description={tree.label ? tree.speciesName : undefined}>
	<div class="flex flex-col gap-5">
		<GrowthStats {tree} year={viewDate.getFullYear()} />
		<GrowthChart {tree} {viewDate} />
		<div class="border-t border-stone-100 pt-5">
			<TreeMeasurements {tree} {planRef} {editable} />
		</div>

		{#if editable}
			<form
				{...form.enhance(async ({ submit }) => {
					if (await submit()) open = false;
				})}
				id="edit-tree"
				class="flex flex-col gap-4 border-t border-stone-100 pt-5"
			>
				<FormIssues issues={f.issues()} />
				<input {...f.id.as('hidden', tree.id)} />
				<input {...f.planRef.as('hidden', planRef)} />

				<Field label={t`Name`} for="tree-label" hint={t`Optional, e.g. “Grandpa's apple”`}>
					<Input id="tree-label" {...f.label.as('text', tree.label ?? '')} />
				</Field>

				<Field label={t`Species`} issues={f.speciesId.issues()}>
					<input {...f.speciesId.as('hidden', speciesId)} />
					<div class="flex items-center gap-3 rounded-lg border border-stone-200 px-3 py-2">
						{#if baseSpecies}<ColorSwatch color={baseSpecies.color} class="size-3.5" />{/if}
						<span class="min-w-0 flex-1 truncate text-sm text-stone-900">
							{baseSpecies?.name ?? tree.speciesName}
						</span>
						<button
							type="button"
							class="shrink-0 cursor-pointer text-sm font-medium text-leaf-700 hover:underline"
							onclick={() => (choosingSpecies = true)}
						>
							{t`Change`}
						</button>
					</div>
				</Field>

				<details class="group rounded-lg border border-stone-200 px-3 py-2">
					<summary class="cursor-pointer text-sm font-medium text-stone-700">
						{t`Override mature size`}
					</summary>
					<p class="mt-2 text-xs text-stone-500">
						{t`Useful for dwarf rootstocks or pruned trees. Leave empty to use the species default.`}
					</p>
					<div class="mt-3 grid grid-cols-2 gap-3 pb-1">
						<Field
							label={t`Mature height (m)`}
							for="tree-mh"
							issues={f.matureHeightOverride.issues()}
						>
							<Input
								id="tree-mh"
								step="0.1"
								placeholder={String(baseSpecies?.matureHeight ?? '')}
								{...f.matureHeightOverride.as('number', tree.matureHeightOverride ?? undefined)}
							/>
						</Field>
						<Field
							label={t`Mature crown (m)`}
							for="tree-ms"
							issues={f.matureSpreadOverride.issues()}
						>
							<Input
								id="tree-ms"
								step="0.1"
								placeholder={String(baseSpecies?.matureSpread ?? '')}
								{...f.matureSpreadOverride.as('number', tree.matureSpreadOverride ?? undefined)}
							/>
						</Field>
					</div>
				</details>

				<Field label={t`Notes`} for="tree-notes">
					<Textarea id="tree-notes" rows={3} {...f.notes.as('text', tree.notes ?? '')} />
				</Field>
			</form>
		{:else}
			<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
				<dt class="text-stone-500">{t`Species`}</dt>
				<dd class="text-stone-900">{tree.speciesName}</dd>
			</dl>
			{#if tree.notes}
				<div class="flex flex-col gap-1">
					<h3 class="text-sm font-medium text-stone-700">{t`Notes`}</h3>
					<p class="text-sm whitespace-pre-line text-stone-600">{tree.notes}</p>
				</div>
			{/if}
		{/if}
	</div>

	{#snippet footer()}
		{#if editable}
			<Button
				class="mr-auto"
				variant="danger-ghost"
				aria-label={t`Delete tree`}
				onclick={() => (confirmingDelete = true)}
			>
				<Trash2 /><span class="max-sm:hidden">{t`Delete`}</span>
			</Button>
			<Button variant="outline" onclick={() => (open = false)}>{t`Cancel`}</Button>
			<Button type="submit" form="edit-tree" loading={!!form.pending}>{t`Save changes`}</Button>
		{:else}
			<Button variant="outline" onclick={() => (open = false)}>{t`Close`}</Button>
		{/if}
	{/snippet}
</Dialog>

<SpeciesDialog
	bind:open={choosingSpecies}
	{species}
	value={speciesId}
	onselect={(id) => (speciesId = id)}
/>

<ConfirmDialog
	bind:open={confirmingDelete}
	title={t`Delete tree?`}
	message={t`“${displayName}” will be removed from this plan.`}
	onconfirm={async () => {
		await deleteTree({ id: tree.id, planRef });
		open = false;
		ondelete();
	}}
/>

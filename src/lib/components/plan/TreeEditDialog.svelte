<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { updateTree, type TreeRow } from '#lib/remote/trees.remote.ts';
	import FormIssues from '#lib/components/layout/FormIssues.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Dialog from '#lib/components/ui/Dialog.svelte';
	import Field from '#lib/components/ui/Field.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import Select from '#lib/components/ui/Select.svelte';
	import Textarea from '#lib/components/ui/Textarea.svelte';

	interface Props {
		open: boolean;
		tree: TreeRow;
		planRef: string;
		species: { id: string; name: string; matureHeight: number; matureSpread: number }[];
	}

	let { open = $bindable(), tree, planRef, species }: Props = $props();

	const form = $derived(updateTree.for(tree.id));
	const f = $derived(form.fields);
	const baseSpecies = $derived(species.find((s) => s.id === tree.speciesId));
</script>

<Dialog bind:open title={t`Edit tree`}>
	<form
		{...form.enhance(async ({ submit }) => {
			if (await submit()) open = false;
		})}
		id="edit-tree"
		class="flex flex-col gap-4"
	>
		<FormIssues issues={f.issues()} />
		<input {...f.id.as('hidden', tree.id)} />
		<input {...f.planRef.as('hidden', planRef)} />

		<Field label={t`Name`} for="tree-label" hint={t`Optional, e.g. “Grandpa's apple”`}>
			<Input id="tree-label" {...f.label.as('text', tree.label ?? '')} />
		</Field>

		<Field label={t`Species`} for="tree-species" issues={f.speciesId.issues()}>
			<Select id="tree-species" {...f.speciesId.as('select', tree.speciesId)}>
				{#each species as s (s.id)}
					<option value={s.id}>{s.name}</option>
				{/each}
			</Select>
		</Field>

		<Field
			label={t`Planting date`}
			for="tree-planted"
			hint={t`Can be in the future for planned trees`}
			issues={f.plantedAt.issues()}
		>
			<Input id="tree-planted" {...f.plantedAt.as('date', tree.plantedAt)} />
		</Field>

		<div class="grid grid-cols-2 gap-3">
			<Field label={t`Height when planted`} for="tree-h0" issues={f.heightAtPlanting.issues()}>
				<Input
					id="tree-h0"
					step="0.1"
					min="0"
					{...f.heightAtPlanting.as('number', tree.heightAtPlanting)}
				/>
			</Field>
			<Field label={t`Crown when planted`} for="tree-s0" issues={f.spreadAtPlanting.issues()}>
				<Input
					id="tree-s0"
					step="0.1"
					min="0"
					{...f.spreadAtPlanting.as('number', tree.spreadAtPlanting)}
				/>
			</Field>
		</div>

		<details class="group rounded-lg border border-stone-200 px-3 py-2">
			<summary class="cursor-pointer text-sm font-medium text-stone-700">
				{t`Override mature size`}
			</summary>
			<p class="mt-2 text-xs text-stone-500">
				{t`Useful for dwarf rootstocks or pruned trees. Leave empty to use the species default.`}
			</p>
			<div class="mt-3 grid grid-cols-2 gap-3 pb-1">
				<Field label={t`Mature height (m)`} for="tree-mh" issues={f.matureHeightOverride.issues()}>
					<Input
						id="tree-mh"
						step="0.1"
						placeholder={String(baseSpecies?.matureHeight ?? '')}
						{...f.matureHeightOverride.as('number', tree.matureHeightOverride ?? undefined)}
					/>
				</Field>
				<Field label={t`Mature crown (m)`} for="tree-ms" issues={f.matureSpreadOverride.issues()}>
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
	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)}>{t`Cancel`}</Button>
		<Button type="submit" form="edit-tree" loading={!!form.pending}>{t`Save changes`}</Button>
	{/snippet}
</Dialog>

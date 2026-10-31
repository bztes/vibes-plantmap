<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import type { saveSpecies } from '#lib/remote/species.remote.ts';
	import type { SpeciesCategory } from '#lib/server/db/schema.ts';
	import FormIssues from '#lib/components/layout/FormIssues.svelte';
	import Field from '#lib/components/ui/Field.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import Select from '#lib/components/ui/Select.svelte';
	import { categoryLabel } from '#lib/species.ts';

	interface Props {
		id: string;
		/** `saveSpecies` or `saveSharedSpecies`, use `.for(species.id)` when editing */
		form: Omit<typeof saveSpecies, 'for'>;
		/** the species to edit, omit to add a new one */
		species?: {
			id: string;
			baseName: string;
			category: SpeciesCategory;
			matureHeight: number;
			matureSpread: number;
			yearsToMaturity: number;
			color: string;
		};
		onsaved: () => void;
	}

	let { id, form, species, onsaved }: Props = $props();
	const f = $derived(form.fields);
</script>

<form
	{id}
	{...form.enhance(async ({ submit, element }) => {
		if (await submit()) {
			if (!species) element.reset();
			onsaved();
		}
	})}
	class="grid grid-cols-2 gap-4"
>
	<div class="col-span-2"><FormIssues issues={f.issues()} /></div>
	{#if species}<input {...f.id.as('hidden', species.id)} />{/if}
	<Field label={t`Name`} for="{id}-name" class="col-span-2" issues={f.name.issues()}>
		<Input id="{id}-name" placeholder={t`Fig`} {...f.name.as('text', species?.baseName ?? '')} />
	</Field>
	<Field label={t`Category`} for="{id}-cat" issues={f.category.issues()}>
		<Select id="{id}-cat" {...f.category.as('select', species?.category ?? 'deciduous')}>
			{#each ['deciduous', 'conifer', 'fruit', 'shrub'] as category (category)}
				<option value={category}>{categoryLabel(category)}</option>
			{/each}
		</Select>
	</Field>
	<Field label={t`Map color`} for="{id}-color" issues={f.color.issues()}>
		<Input id="{id}-color" class="p-1" {...f.color.as('color', species?.color ?? '#16a34a')} />
	</Field>
	<Field label={t`Mature height (m)`} for="{id}-h" issues={f.matureHeight.issues()}>
		<Input id="{id}-h" step="0.1" {...f.matureHeight.as('number', species?.matureHeight)} />
	</Field>
	<Field label={t`Mature crown (m)`} for="{id}-s" issues={f.matureSpread.issues()}>
		<Input id="{id}-s" step="0.1" {...f.matureSpread.as('number', species?.matureSpread)} />
	</Field>
	<Field
		label={t`Years to maturity`}
		for="{id}-y"
		class="col-span-2"
		hint={t`Roughly when the tree reaches its full size`}
		issues={f.yearsToMaturity.issues()}
	>
		<Input id="{id}-y" step="1" {...f.yearsToMaturity.as('number', species?.yearsToMaturity)} />
	</Field>
</form>

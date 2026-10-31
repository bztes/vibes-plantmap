<script lang="ts" module>
	export interface TreeDraft {
		speciesId: string;
		label: string;
		plantedAt: string;
	}
</script>

<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { MapPin } from '@lucide/svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Dialog from '#lib/components/ui/Dialog.svelte';
	import Field from '#lib/components/ui/Field.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import Select from '#lib/components/ui/Select.svelte';
	import { categoryLabel } from '#lib/species.ts';

	interface Props {
		open: boolean;
		species: { id: string; name: string; category: string }[];
		/** called with the details once the user is ready to pick a spot on the map */
		onplace: (draft: TreeDraft) => void;
	}

	let { open = $bindable(), species, onplace }: Props = $props();

	const categories = ['deciduous', 'conifer', 'fruit', 'shrub'];

	// species and date are kept between dialogs so planting several of the same is quick
	let last = $state({ speciesId: '', plantedAt: new Date().toISOString().slice(0, 10) });

	function submit(e: SubmitEvent & { currentTarget: HTMLFormElement }) {
		e.preventDefault();
		const data = new FormData(e.currentTarget);
		const draft = {
			speciesId: String(data.get('speciesId')),
			label: String(data.get('label')).trim(),
			plantedAt: String(data.get('plantedAt'))
		};
		last = draft;
		onplace(draft);
		open = false;
	}
</script>

<Dialog
	bind:open
	title={t`Add tree`}
	description={t`Choose what to plant, then position it on the map.`}
>
	<form id="add-tree" onsubmit={submit} class="flex flex-col gap-4">
		<Field label={t`Species`} for="add-tree-species">
			<Select
				id="add-tree-species"
				name="speciesId"
				required
				value={last.speciesId || species[0]?.id}
			>
				{#each categories as category (category)}
					<optgroup label={categoryLabel(category)}>
						{#each species.filter((s) => s.category === category) as s (s.id)}
							<option value={s.id}>{s.name}</option>
						{/each}
					</optgroup>
				{/each}
			</Select>
		</Field>
		<Field label={t`Name`} for="add-tree-label" hint={t`Optional, e.g. “Grandpa's apple”`}>
			<Input id="add-tree-label" name="label" maxlength={80} />
		</Field>
		<Field
			label={t`Planting date`}
			for="add-tree-planted"
			hint={t`Can be in the future for planned trees`}
		>
			<Input id="add-tree-planted" name="plantedAt" type="date" required value={last.plantedAt} />
		</Field>
	</form>
	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)}>{t`Cancel`}</Button>
		<Button type="submit" form="add-tree" disabled={species.length === 0}>
			<MapPin />
			{t`Place on map`}
		</Button>
	{/snippet}
</Dialog>

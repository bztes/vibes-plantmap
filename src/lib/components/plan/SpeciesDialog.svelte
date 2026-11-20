<script lang="ts">
	import { t } from '@bztes/vibes-t0n';
	import type { Snippet } from 'svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Dialog from '#lib/components/ui/Dialog.svelte';
	import SpeciesPicker, { type PickableSpecies } from './SpeciesPicker.svelte';

	interface Props {
		open: boolean;
		species: PickableSpecies[];
		/** the species preselected when opening */
		value: string;
		title?: string;
		description?: string;
		/** content of the submit button, defaults to "Select" */
		submit?: Snippet;
		onselect: (speciesId: string) => void;
	}

	let {
		open = $bindable(),
		species,
		value,
		title = t`Change species`,
		description,
		submit,
		onselect
	}: Props = $props();

	const formId = $props.id();

	let speciesId = $state('');
	let visible = $state(true);
	$effect.pre(() => {
		if (open) speciesId = value;
	});

	function onsubmit(e: SubmitEvent) {
		e.preventDefault();
		onselect(speciesId);
		open = false;
	}
</script>

<Dialog bind:open {title} {description}>
	<form id={formId} {onsubmit}>
		<SpeciesPicker {species} bind:value={speciesId} bind:visible />
	</form>
	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)}>{t`Cancel`}</Button>
		<Button type="submit" form={formId} disabled={!speciesId || !visible}>
			{#if submit}{@render submit()}{:else}{t`Select`}{/if}
		</Button>
	{/snippet}
</Dialog>

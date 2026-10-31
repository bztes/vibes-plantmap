<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { Plus } from '@lucide/svelte';
	import { getSpecies } from '#lib/remote/species.remote.ts';
	import PageContainer from '#lib/components/layout/PageContainer.svelte';
	import SpeciesForm from '#lib/components/species/SpeciesForm.svelte';
	import SpeciesRow from '#lib/components/species/SpeciesRow.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Dialog from '#lib/components/ui/Dialog.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import Table from '#lib/components/ui/Table.svelte';
	import { saveSpecies } from '#lib/remote/species.remote.ts';

	const species = $derived(await getSpecies());
	let adding = $state(false);
</script>

<svelte:head><title>{t`Species`} · Plantmap</title></svelte:head>

<PageContainer>
	<PageHeader
		title={t`Species`}
		description={t`Mature sizes drive the growth estimate on the map. Add your own species if one is missing.`}
	>
		{#snippet actions()}
			<Button onclick={() => (adding = true)}><Plus /> {t`Add species`}</Button>
		{/snippet}
	</PageHeader>

	<Table columns={[t`Species`, t`Category`, t`Height`, t`Crown`, t`Maturity`, '']}>
		{#each species as s (s.id)}
			<SpeciesRow species={s} />
		{/each}
	</Table>
</PageContainer>

<Dialog bind:open={adding} title={t`Add species`}>
	<SpeciesForm id="species-form" form={saveSpecies} onsaved={() => (adding = false)} />
	{#snippet footer()}
		<Button variant="outline" onclick={() => (adding = false)}>{t`Cancel`}</Button>
		<Button type="submit" form="species-form" loading={!!saveSpecies.pending}
			>{t`Add species`}</Button
		>
	{/snippet}
</Dialog>

<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { Plus, Sprout } from '@lucide/svelte';
	import { saveSharedSpecies, getSharedSpecies } from '#lib/remote/species.remote.ts';
	import SpeciesForm from '#lib/components/species/SpeciesForm.svelte';
	import SpeciesRow from '#lib/components/species/SpeciesRow.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Dialog from '#lib/components/ui/Dialog.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import Table from '#lib/components/ui/Table.svelte';

	const species = $derived(await getSharedSpecies());
	let adding = $state(false);
</script>

<svelte:head><title>{t`Species`} · {t`Admin`} · Plantmap</title></svelte:head>

<section>
	<div class="mb-3 flex items-center justify-between gap-4">
		<div>
			<h2 class="font-medium text-stone-900">{t`Shared species (${species.length})`}</h2>
			<p class="text-sm text-stone-500">
				{t`Visible to every user next to their own species. Species still used by trees can't be deleted.`}
			</p>
		</div>
		{#if species.length > 0}
			<Button variant="outline" onclick={() => (adding = true)}><Plus /> {t`Add species`}</Button>
		{/if}
	</div>

	{#if species.length === 0}
		<EmptyState
			icon={Sprout}
			title={t`No shared species yet`}
			description={t`Users only see the species they added themselves.`}
		>
			<Button onclick={() => (adding = true)}><Plus /> {t`Add species`}</Button>
		</EmptyState>
	{:else}
		<Table columns={[t`Species`, t`Category`, t`Height`, t`Crown`, t`Maturity`, '']}>
			{#each species as s (s.id)}
				<SpeciesRow species={s} translatable />
			{/each}
		</Table>
	{/if}
</section>

<Dialog bind:open={adding} title={t`Add shared species`}>
	<SpeciesForm id="shared-species-form" form={saveSharedSpecies} onsaved={() => (adding = false)} />
	{#snippet footer()}
		<Button variant="outline" onclick={() => (adding = false)}>{t`Cancel`}</Button>
		<Button type="submit" form="shared-species-form" loading={!!saveSharedSpecies.pending}>
			{t`Add species`}
		</Button>
	{/snippet}
</Dialog>

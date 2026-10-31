<script lang="ts">
	import { Layers, Plus } from '@lucide/svelte';
	import { BASEMAP_PRESETS } from '#lib/basemaps.ts';
	import { getLocale, t } from '#lib/i18n/index.ts';
	import { addBasemapPresets, getAdminBasemaps } from '#lib/remote/basemaps.remote.ts';
	import BasemapDialog from '#lib/components/admin/BasemapDialog.svelte';
	import BasemapRow from '#lib/components/admin/BasemapRow.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import Table from '#lib/components/ui/Table.svelte';

	const basemaps = $derived(await getAdminBasemaps());
	const recommended = BASEMAP_PRESETS.filter((p) => p.recommended);
	const defaults = $derived(
		new Intl.ListFormat(getLocale()).format(recommended.map((p) => p.name))
	);
	let adding = $state(false);
</script>

<section>
	<div class="mb-3 flex items-center justify-between gap-4">
		<div>
			<h2 class="font-medium text-stone-900">{t`Base maps (${basemaps.length})`}</h2>
			<p class="text-sm text-stone-500">
				{t`The maps users can switch between on a plan. The first vector style also provides the labels shown over raster maps.`}
			</p>
		</div>
		{#if basemaps.length > 0}
			<Button variant="outline" onclick={() => (adding = true)}><Plus /> {t`Add base map`}</Button>
		{/if}
	</div>

	{#if basemaps.length === 0}
		<EmptyState
			icon={Layers}
			title={t`No base maps yet`}
			description={t`Plans show a blank background until you add one. Start with the defaults (${defaults}) or add your own.`}
		>
			<div class="flex gap-2">
				<Button
					loading={addBasemapPresets.pending > 0}
					onclick={() => addBasemapPresets(recommended.map((p) => p.id))}
				>
					{t`Add default maps`}
				</Button>
				<Button variant="outline" onclick={() => (adding = true)}><Plus /> {t`Add base map`}</Button
				>
			</div>
		</EmptyState>
	{:else}
		<Table columns={[t`Base map`, t`Type`, t`Enabled`, '']}>
			{#each basemaps as basemap, i (basemap.id)}
				<BasemapRow {basemap} first={i === 0} last={i === basemaps.length - 1} />
			{/each}
		</Table>
	{/if}
</section>

<BasemapDialog bind:open={adding} />

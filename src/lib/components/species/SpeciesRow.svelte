<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { Languages, Pencil, Trash2 } from '@lucide/svelte';
	import { deleteSpecies, saveSharedSpecies, saveSpecies } from '#lib/remote/species.remote.ts';
	import SpeciesTranslationsDialog from '#lib/components/admin/SpeciesTranslationsDialog.svelte';
	import SpeciesForm from './SpeciesForm.svelte';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import ColorSwatch from '#lib/components/ui/ColorSwatch.svelte';
	import ConfirmDialog from '#lib/components/ui/ConfirmDialog.svelte';
	import Dialog from '#lib/components/ui/Dialog.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import TableCell from '#lib/components/ui/TableCell.svelte';
	import TableRow from '#lib/components/ui/TableRow.svelte';
	import { categoryLabel } from '#lib/species.ts';
	import type { SpeciesCategory } from '#lib/server/db/schema.ts';

	interface Props {
		species: {
			id: string;
			/** localized name */
			name: string;
			baseName: string;
			/** only needed when `translatable` */
			nameTranslations?: Record<string, string>;
			category: SpeciesCategory;
			matureHeight: number;
			matureSpread: number;
			yearsToMaturity: number;
			color: string;
			shared: boolean;
			/** may be edited and deleted by the current user */
			editable: boolean;
		};
		/** show the button to edit the localized names, admins only */
		translatable?: boolean;
	}

	let { species, translatable = false }: Props = $props();
	let editing = $state(false);
	let translating = $state(false);
	let confirming = $state(false);
	let error = $state('');

	const form = $derived((species.shared ? saveSharedSpecies : saveSpecies).for(species.id));
	const formId = $derived(`species-${species.id}`);
</script>

<TableRow>
	<TableCell>
		<div class="flex items-center gap-2.5">
			<ColorSwatch color={species.color} class="size-3.5" />
			<div>
				<div class="font-medium text-stone-900">{species.name}</div>
				{#if species.baseName !== species.name}<div class="text-xs text-stone-500">
						{species.baseName}
					</div>{/if}
			</div>
		</div>
	</TableCell>
	<TableCell><Badge>{categoryLabel(species.category)}</Badge></TableCell>
	<TableCell class="tabular-nums">{species.matureHeight} m</TableCell>
	<TableCell class="tabular-nums">{species.matureSpread} m</TableCell>
	<TableCell class="tabular-nums">{t`${species.yearsToMaturity} y`}</TableCell>
	<TableCell class="text-right">
		{#if species.shared}<Badge tone="green">{t`shared`}</Badge>{/if}
		{#if translatable}
			<IconButton small label={t`Translate name`} onclick={() => (translating = true)}>
				<Languages />
			</IconButton>
		{/if}
		{#if species.editable}
			<IconButton small label={t`Edit species`} onclick={() => (editing = true)}>
				<Pencil />
			</IconButton>
			<IconButton
				small
				variant="danger-ghost"
				label={t`Delete species`}
				onclick={() => {
					error = '';
					confirming = true;
				}}
			>
				<Trash2 />
			</IconButton>
		{/if}
		{#if error}<p class="mt-1 text-xs text-red-600">{error}</p>{/if}
	</TableCell>
</TableRow>

{#if species.editable}
	<Dialog bind:open={editing} title={t`Edit species`}>
		<SpeciesForm id={formId} {form} {species} onsaved={() => (editing = false)} />
		{#snippet footer()}
			<Button variant="outline" onclick={() => (editing = false)}>{t`Cancel`}</Button>
			<Button type="submit" form={formId} loading={!!form.pending}>{t`Save`}</Button>
		{/snippet}
	</Dialog>
{/if}

{#if translatable}
	<SpeciesTranslationsDialog
		bind:open={translating}
		species={{ ...species, nameTranslations: species.nameTranslations ?? {} }}
	/>
{/if}

<ConfirmDialog
	bind:open={confirming}
	title={t`Delete species?`}
	message={species.shared
		? t`“${species.name}” will be removed from the catalog of all users.`
		: t`“${species.name}” will be removed from your catalog.`}
	onconfirm={async () => {
		try {
			await deleteSpecies(species.id);
		} catch (e) {
			error = (e as { body?: { message?: string } }).body?.message ?? t`Could not delete`;
		}
	}}
/>

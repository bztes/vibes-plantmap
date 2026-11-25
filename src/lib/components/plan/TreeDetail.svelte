<script lang="ts">
	import { t } from '@bztes/vibes-t0n';
	import { ChevronLeft, Crosshair, Move, Ruler, Trash2 } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import {
		deleteTree,
		patchTree,
		updateMatureSize,
		type TreeRow
	} from '#lib/remote/trees.remote.ts';
	import { formatMeters } from '#lib/growth.ts';
	import { treeName, type Sized } from '#lib/plan.ts';
	import { matureSizeLabel } from '#lib/species.ts';
	import { getPanel } from '#lib/components/panel/panel.ts';
	import FormIssues from '#lib/components/layout/FormIssues.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import ColorSwatch from '#lib/components/ui/ColorSwatch.svelte';
	import ConfirmDialog from '#lib/components/ui/ConfirmDialog.svelte';
	import Field from '#lib/components/ui/Field.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import Textarea from '#lib/components/ui/Textarea.svelte';
	import GrowthChart from './GrowthChart.svelte';
	import GrowthStats from './GrowthStats.svelte';
	import SpeciesDialog from './SpeciesDialog.svelte';
	import type { PickableSpecies } from './SpeciesPicker.svelte';
	import TreeMeasurements from './TreeMeasurements.svelte';

	interface Props {
		tree: Sized<TreeRow>;
		/** plan id or share link token, see `getPlanAccess` */
		planRef: string;
		/** false for view-only share links, the details are then read-only */
		editable: boolean;
		species: PickableSpecies[];
		/** date the map shows */
		viewDate: Date;
		onback: () => void;
		onmove: () => void;
		onshow: () => void;
		ondelete: () => void;
	}

	let { tree, planRef, editable, species, viewDate, onback, onmove, onshow, ondelete }: Props =
		$props();

	const panel = getPanel();
	const displayName = $derived(treeName(tree));
	const subtitle = $derived(tree.label ? tree.speciesName : matureSizeLabel(tree));

	let adding = $state(false);
	let measurements = $state<HTMLElement>();
	function measure() {
		adding = true;
		panel.expand('full');
		// after the sheet opened and the form rendered
		setTimeout(() => measurements?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 320);
	}

	type Status = 'saving' | 'saved' | 'failed' | null;
	const statusText = (status: Status) =>
		status === 'saving'
			? t`Saving…`
			: status === 'saved'
				? t`Saved`
				: status === 'failed'
					? t`Not saved`
					: '';

	// the text being typed stays local, the saved one comes back through `tree`
	let notes = $state(untrack(() => tree.notes ?? ''));
	let notesStatus = $state<Status>(null);
	let notesTimer: ReturnType<typeof setTimeout> | undefined;

	async function save(changes: { label?: string; notes?: string; speciesId?: string }) {
		await patchTree({ id: tree.id, planRef, ...changes });
	}

	async function saveNotes() {
		clearTimeout(notesTimer);
		notesTimer = undefined;
		if (notes.trim() === (tree.notes ?? '')) return void (notesStatus = null);
		notesStatus = 'saving';
		try {
			await save({ notes });
			notesStatus = 'saved';
		} catch {
			notesStatus = 'failed';
		}
	}

	$effect(() => () => {
		// leaving the tree while a save is waiting would lose the last words
		if (notesTimer) saveNotes();
	});

	let labelStatus = $state<Status>(null);
	async function saveLabel(value: string) {
		if (value.trim() === (tree.label ?? '')) return;
		labelStatus = 'saving';
		try {
			await save({ label: value });
			labelStatus = 'saved';
		} catch {
			labelStatus = 'failed';
		}
	}

	let choosingSpecies = $state(false);
	let confirmingDelete = $state(false);

	const sizeForm = $derived(updateMatureSize.for(tree.id));
	const sf = $derived(sizeForm.fields);
	const baseSpecies = $derived(species.find((s) => s.id === tree.speciesId));
	const customSize = $derived(
		tree.matureHeightOverride !== null || tree.matureSpreadOverride !== null
	);

	const section = 'flex flex-col gap-3 border-t border-stone-100 px-4 py-5';
</script>

<div {@attach panel.peek} class="flex shrink-0 flex-col gap-3 px-3 pt-1 pb-3 md:pt-3">
	<div class="flex items-start gap-1.5">
		<IconButton label={t`All trees`} onclick={onback}><ChevronLeft /></IconButton>
		<ColorSwatch color={tree.color} class="mt-3 size-3.5" />
		<div class="min-w-0 flex-1 py-1.5 pl-1">
			<h2 class="truncate text-base leading-tight font-semibold text-stone-900">{displayName}</h2>
			<p class="truncate text-xs text-stone-500">{subtitle}</p>
		</div>
	</div>
	<div class={['grid gap-2', editable ? 'grid-cols-3' : 'grid-cols-1']}>
		{#if editable}
			<Button variant="outline" size="sm" onclick={onmove}><Move /> {t`Move`}</Button>
			<Button variant="outline" size="sm" onclick={measure}><Ruler /> {t`Measure`}</Button>
		{/if}
		<Button variant="outline" size="sm" onclick={onshow}><Crosshair /> {t`Show`}</Button>
	</div>
</div>

<div
	class="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]"
	inert={panel.collapsed}
>
	<div class="flex flex-col gap-5 px-4 pt-1 pb-5">
		<GrowthStats {tree} year={viewDate.getFullYear()} />
		<GrowthChart {tree} {viewDate} />
	</div>

	<div bind:this={measurements} class={[section, 'scroll-mt-2']}>
		<TreeMeasurements {tree} {planRef} {editable} bind:adding />
	</div>

	<div class={section}>
		<div class="flex items-center justify-between gap-2">
			<h3 class="text-sm font-medium text-stone-700">{t`Notes`}</h3>
			<span class={['text-xs', notesStatus === 'failed' ? 'text-red-600' : 'text-stone-500']}>
				{statusText(notesStatus)}
			</span>
		</div>
		{#if editable}
			<Textarea
				rows={3}
				value={notes}
				placeholder={t`Pruning, harvest, anything worth remembering`}
				aria-label={t`Notes`}
				maxlength={2000}
				oninput={(e) => {
					notes = e.currentTarget.value;
					notesStatus = null;
					clearTimeout(notesTimer);
					notesTimer = setTimeout(saveNotes, 800);
				}}
				onblur={saveNotes}
			/>
		{:else if tree.notes}
			<p class="text-sm whitespace-pre-line text-stone-600">{tree.notes}</p>
		{:else}
			<p class="text-sm text-stone-500">{t`No notes.`}</p>
		{/if}
	</div>

	<div class={section}>
		<h3 class="text-sm font-medium text-stone-700">{t`Tree`}</h3>
		{#if editable}
			<Field
				label={t`Name`}
				for="tree-label"
				hint={statusText(labelStatus) || t`Optional, e.g. “Grandpa's apple”`}
			>
				<Input
					id="tree-label"
					value={tree.label ?? ''}
					maxlength={80}
					onchange={(e) => saveLabel(e.currentTarget.value)}
					onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
				/>
			</Field>

			<div class="flex flex-col gap-1.5">
				<span class="text-sm font-medium text-stone-700">{t`Species`}</span>
				<div class="flex items-center gap-3 rounded-lg border border-stone-200 px-3 py-2">
					<ColorSwatch color={tree.color} class="size-3.5" />
					<span class="min-w-0 flex-1 truncate text-sm text-stone-900">{tree.speciesName}</span>
					<button
						type="button"
						class="shrink-0 cursor-pointer text-sm font-medium text-leaf-700 hover:underline"
						onclick={() => (choosingSpecies = true)}
					>
						{t`Change`}
					</button>
				</div>
			</div>

			<details class="group rounded-lg border border-stone-200 px-3 py-2" open={customSize}>
				<summary class="cursor-pointer text-sm font-medium text-stone-700">
					{t`Mature size`}
					<span class="font-normal text-stone-500">
						· {formatMeters(tree.matureHeight)} × {formatMeters(tree.matureSpread)},
						{customSize ? t`custom` : t`species default`}
					</span>
				</summary>
				<form {...sizeForm} class="mt-2 flex flex-col gap-3 pb-1">
					<p class="text-xs text-stone-500">
						{t`Useful for dwarf rootstocks or pruned trees. Leave empty to use the species default.`}
					</p>
					<FormIssues issues={sf.issues()} />
					<input {...sf.id.as('hidden', tree.id)} />
					<input {...sf.planRef.as('hidden', planRef)} />
					<div class="grid grid-cols-2 gap-3">
						<Field label={t`Height (m)`} for="tree-mh" issues={sf.matureHeightOverride.issues()}>
							<Input
								id="tree-mh"
								size="sm"
								step="0.1"
								placeholder={String(baseSpecies?.matureHeight ?? '')}
								{...sf.matureHeightOverride.as('number', tree.matureHeightOverride ?? undefined)}
							/>
						</Field>
						<Field label={t`Crown (m)`} for="tree-ms" issues={sf.matureSpreadOverride.issues()}>
							<Input
								id="tree-ms"
								size="sm"
								step="0.1"
								placeholder={String(baseSpecies?.matureSpread ?? '')}
								{...sf.matureSpreadOverride.as('number', tree.matureSpreadOverride ?? undefined)}
							/>
						</Field>
					</div>
					<Button
						type="submit"
						size="sm"
						variant="outline"
						class="self-end"
						loading={!!sizeForm.pending}
					>
						{t`Save size`}
					</Button>
				</form>
			</details>
		{:else}
			<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
				<dt class="text-stone-500">{t`Species`}</dt>
				<dd class="text-stone-900">{tree.speciesName}</dd>
				<dt class="text-stone-500">{t`Mature size`}</dt>
				<dd class="text-stone-900">
					{formatMeters(tree.matureHeight)} × {formatMeters(tree.matureSpread)}
				</dd>
			</dl>
		{/if}
	</div>

	{#if editable}
		<div class="border-t border-stone-100 px-2 py-3">
			<Button variant="danger-ghost" size="sm" onclick={() => (confirmingDelete = true)}>
				<Trash2 />
				{t`Delete tree`}
			</Button>
		</div>
	{/if}
</div>

{#if editable}
	<SpeciesDialog
		bind:open={choosingSpecies}
		{species}
		value={tree.speciesId}
		onselect={(speciesId) => save({ speciesId })}
	/>

	<ConfirmDialog
		bind:open={confirmingDelete}
		title={t`Delete tree?`}
		message={t`“${displayName}” will be removed from this plan.`}
		onconfirm={async () => {
			await deleteTree({ id: tree.id, planRef });
			ondelete();
		}}
	/>
{/if}

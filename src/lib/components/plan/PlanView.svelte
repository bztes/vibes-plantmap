<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import {
		Check,
		ChevronUp,
		Eye,
		List,
		Pencil,
		Settings,
		Share2,
		TreeDeciduous,
		TriangleAlert,
		X
	} from '@lucide/svelte';
	import { getBasemaps } from '#lib/remote/basemaps.remote.ts';
	import { getPlan, savePlanView } from '#lib/remote/plans.remote.ts';
	import { getPlanSpecies } from '#lib/remote/species.remote.ts';
	import { createTree, getTrees, moveTree } from '#lib/remote/trees.remote.ts';
	import { defaultBasemap } from '#lib/basemaps.ts';
	import type { LngLat } from '#lib/geo.ts';
	import { addYears } from '#lib/growth.ts';
	import { findConflicts, findUpcomingConflicts, sizeTrees, type PlannedTree } from '#lib/plan.ts';
	import type { MapView } from '#lib/components/map/layers.ts';
	import PlanMap from '#lib/components/map/PlanMap.svelte';
	import LayerMenu from '#lib/components/map/LayerMenu.svelte';
	import TimelineBar from '#lib/components/map/TimelineBar.svelte';
	import AddTreeDialog, { type TreeDraft } from '#lib/components/plan/AddTreeDialog.svelte';
	import ConflictList from '#lib/components/plan/ConflictList.svelte';
	import PlanSettingsDialog from '#lib/components/plan/PlanSettingsDialog.svelte';
	import SharePlanDialog from '#lib/components/plan/SharePlanDialog.svelte';
	import TreeDetails from '#lib/components/plan/TreeDetails.svelte';
	import TreeList from '#lib/components/plan/TreeList.svelte';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import Tabs from '#lib/components/ui/Tabs.svelte';

	interface Props {
		/** plan id, or the token when opened through a share link */
		planRef: string;
	}

	let { planRef }: Props = $props();

	const [plan, trees, species, basemaps] = $derived(
		await Promise.all([getPlan(planRef), getTrees(planRef), getPlanSpecies(planRef), getBasemaps()])
	);
	const isOwner = $derived(plan.role === 'owner');
	const canEdit = $derived(plan.role !== 'view');

	let years = $state(0);
	let showMature = $state(true);
	let basemapId = $state<string | null>(null);
	const basemap = $derived(basemaps.find((b) => b.id === basemapId) ?? defaultBasemap(basemaps));
	let selectedId = $state<string | null>(null);
	let addOpen = $state(false);
	/** new tree waiting to be planted at the map center */
	let draft = $state<TreeDraft | null>(null);
	/** tree following the map center until the move is confirmed */
	let movingId = $state<string | null>(null);
	let tab = $state<'trees' | 'conflicts'>('trees');
	/** whether the side panel is expanded, only collapsible on small screens */
	let panelOpen = $state(false);
	let settingsOpen = $state(false);
	let shareOpen = $state(false);
	let map = $state<PlanMap<PlannedTree>>();

	/** where a tree is shown while it's being moved, kept until the move is saved */
	let preview = $state<{ id: string; at: LngLat } | null>(null);

	const today = new Date();
	const viewDate = $derived(addYears(today, years));
	const positioned = $derived(
		trees.map((t) => (preview?.id === t.id ? { ...t, lng: preview.at[0], lat: preview.at[1] } : t))
	);
	const sized = $derived(sizeTrees(positioned, viewDate));
	const conflicts = $derived(findConflicts(sized));
	const upcoming = $derived(findUpcomingConflicts(positioned, viewDate));
	const selected = $derived(sized.find((t) => t.id === selectedId) ?? null);
	const placing = $derived(draft !== null || movingId !== null);
	const involves = (id: string) => (c: { a: { id: string }; b: { id: string } }) =>
		c.a.id === id || c.b.id === id;

	const initialView: MapView = $derived({
		lng: plan.centerLng,
		lat: plan.centerLat,
		zoom: plan.zoom
	});

	function startMove(id: string) {
		const tree = trees.find((t) => t.id === id);
		if (!tree) return;
		draft = null;
		movingId = id;
		preview = { id, at: [tree.lng, tree.lat] };
		map?.flyTo([tree.lng, tree.lat]);
	}

	function startPlanting(details: TreeDraft) {
		movingId = null;
		preview = null;
		draft = details;
	}

	function followCenter(at: LngLat) {
		if (movingId) preview = { id: movingId, at };
	}

	async function place() {
		const at = map?.getCenter();
		if (!at) return;
		if (movingId) {
			const id = movingId;
			movingId = null;
			// keep showing the tree at its new spot until the server confirms
			preview = { id, at };
			try {
				await moveTree({ id, planRef, lng: at[0], lat: at[1] });
			} finally {
				preview = null;
			}
		} else if (draft) {
			const details = draft;
			draft = null;
			select(
				await createTree({
					planRef,
					...details,
					lng: at[0],
					lat: at[1]
				})
			);
		}
	}

	function cancelPlacing() {
		draft = null;
		movingId = null;
		preview = null;
	}

	let viewTimer: ReturnType<typeof setTimeout>;
	function rememberView(view: MapView) {
		// only the owner's view is remembered, people visiting a share link shouldn't move it
		if (!isOwner) return;
		clearTimeout(viewTimer);
		viewTimer = setTimeout(
			() =>
				savePlanView({ id: plan.id, centerLng: view.lng, centerLat: view.lat, zoom: view.zoom }),
			1000
		);
	}

	function select(id: string | null) {
		selectedId = id;
		if (id) panelOpen = true;
	}

	function focusPair(a: PlannedTree, b: PlannedTree) {
		selectedId = a.id;
		map?.fitTo([
			[a.lng, a.lat],
			[b.lng, b.lat]
		]);
	}

	function selectFromList(id: string) {
		selectedId = id;
		const tree = trees.find((t) => t.id === id);
		if (tree) map?.flyTo([tree.lng, tree.lat], 19);
	}
</script>

<svelte:head><title>{plan.name} · Plantmap</title></svelte:head>

<svelte:window
	onkeydown={(e) => {
		if (e.key !== 'Escape' || (e.target as HTMLElement).closest('input, textarea, select, dialog'))
			return;
		if (placing) cancelPlacing();
		else selectedId = null;
	}}
/>

<div class="flex h-full flex-col-reverse md:flex-row">
	<aside
		class={[
			'flex w-full shrink-0 flex-col border-t border-stone-200 bg-white md:h-full md:w-96 md:border-t-0 md:border-r',
			panelOpen && 'h-[45%]'
		]}
	>
		<div class="flex items-center gap-2 border-b border-stone-100 px-4 py-2 md:py-3">
			<div class="min-w-0 flex-1">
				<h1 class="truncate font-semibold text-stone-900">{plan.name}</h1>
				{#if plan.description}
					<p class="truncate text-xs text-stone-500">{plan.description}</p>
				{/if}
				{#if !isOwner}
					{@const owner = plan.ownerName}
					<p class="mt-1 flex items-center gap-1.5 truncate text-xs text-stone-500">
						{#if canEdit}
							<Badge tone="green"><Pencil /> {t`Can edit`}</Badge>
						{:else}
							<Badge><Eye /> {t`View only`}</Badge>
						{/if}
						{t`Shared by ${owner}`}
					</p>
				{/if}
			</div>
			{#if isOwner}
				<IconButton label={t`Share plan`} small onclick={() => (shareOpen = true)}>
					<Share2 />
				</IconButton>
				<IconButton label={t`Plan settings`} small onclick={() => (settingsOpen = true)}>
					<Settings />
				</IconButton>
			{/if}
			<IconButton
				label={panelOpen ? t`Collapse panel` : t`Expand panel`}
				small
				class="md:hidden"
				aria-expanded={panelOpen}
				onclick={() => (panelOpen = !panelOpen)}
			>
				<ChevronUp class={['transition-transform', panelOpen && 'rotate-180']} />
			</IconButton>
		</div>

		<div class={['min-h-0 flex-1 overflow-y-auto p-4 md:block', !panelOpen && 'hidden']}>
			{#if selected}
				{#key selected.id}
					<TreeDetails
						tree={selected}
						{planRef}
						editable={canEdit}
						{species}
						year={viewDate.getFullYear()}
						conflicts={conflicts.filter(involves(selected.id))}
						upcoming={upcoming.filter(involves(selected.id))}
						moving={movingId === selected.id}
						onmove={(start) => (start ? startMove(selected.id) : cancelPlacing())}
						onclose={() => {
							cancelPlacing();
							selectedId = null;
						}}
					/>
				{/key}
			{:else}
				<div class="flex flex-col gap-4">
					<Tabs
						bind:value={tab}
						tabs={[
							{ id: 'trees', label: t`Trees (${trees.length})`, icon: List },
							{ id: 'conflicts', label: t`Conflicts`, icon: TriangleAlert, count: conflicts.length }
						]}
					/>
					{#if tab === 'trees'}
						<TreeList trees={sized} {conflicts} onselect={selectFromList} />
					{:else}
						<ConflictList
							year={viewDate.getFullYear()}
							{conflicts}
							{upcoming}
							onfocus={focusPair}
						/>
					{/if}
				</div>
			{/if}
		</div>
	</aside>

	<section class="relative min-h-0 flex-1">
		<PlanMap
			bind:this={map}
			view={initialView}
			trees={sized}
			{conflicts}
			{selectedId}
			{placing}
			{showMature}
			{basemaps}
			{basemap}
			onselect={select}
			oncenter={followCenter}
			onviewchange={rememberView}
		/>

		<div class="absolute top-3 left-3 flex gap-2">
			<LayerMenu
				bind:value={() => basemap?.id ?? null, (id) => (basemapId = id)}
				bind:showMature
				{basemaps}
			/>
			<TimelineBar bind:years />
		</div>

		{#if basemaps.length === 0}
			<div
				class="pointer-events-none absolute top-1/3 left-1/2 max-w-xs -translate-x-1/2 rounded-xl bg-white/95 px-4 py-3 text-center text-sm text-stone-600 shadow"
			>
				{t`No base maps are set up yet. An admin can add them under Administration.`}
			</div>
		{/if}

		{#if placing}
			<!-- the map center is where the tree goes -->
			<div
				class="pointer-events-none absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 text-stone-900 drop-shadow-[0_0_2px_white]"
				aria-hidden="true"
			>
				<div class="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-current"></div>
				<div class="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-current"></div>
				<div
					class="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-current"
				></div>
			</div>
			<div
				class="pointer-events-none absolute top-18 left-1/2 max-w-[90%] -translate-x-1/2 rounded-full bg-stone-900/85 px-4 py-1.5 text-center text-sm text-white shadow"
			>
				{t`Move map to place tree`}
			</div>
		{/if}

		<div class="absolute right-14 bottom-20 flex flex-col items-end gap-2">
			{#if placing}
				<div class="flex rounded-lg shadow-md">
					<Button class="rounded-r-none shadow-none" onclick={place}>
						<Check />
						{draft ? t`Plant here` : t`Move here`}
					</Button>
					<Button class="rounded-l-none" variant="secondary" onclick={cancelPlacing}
						><X /> {t`Cancel`}</Button
					>
				</div>
			{:else if canEdit}
				<Button
					class="h-12 rounded-full px-6 text-base shadow-lg max-sm:size-16 max-sm:p-0 [&_svg]:size-5 [&_svg]:max-sm:size-7"
					aria-label={t`Add tree`}
					onclick={() => (addOpen = true)}
				>
					<TreeDeciduous /><span class="max-sm:hidden">{t`Add tree`}</span>
				</Button>
			{/if}
		</div>
	</section>
</div>

{#if isOwner}
	<PlanSettingsDialog bind:open={settingsOpen} {plan} />
	<SharePlanDialog bind:open={shareOpen} planId={plan.id} />
{/if}
{#if canEdit}
	<AddTreeDialog bind:open={addOpen} {species} onplace={startPlanting} />
{/if}

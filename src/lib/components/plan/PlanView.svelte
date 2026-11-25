<script lang="ts">
	import { t } from '@bztes/vibes-t0n';
	import { Eye, Pencil, Settings, Share2 } from '@lucide/svelte';
	import { tick } from 'svelte';
	import { getCurrentUser } from '#lib/remote/auth.remote.ts';
	import { getBasemaps } from '#lib/remote/basemaps.remote.ts';
	import { getPlan, savePlanView } from '#lib/remote/plans.remote.ts';
	import { getPlanSpecies } from '#lib/remote/species.remote.ts';
	import { createTree, getTrees, moveTree } from '#lib/remote/trees.remote.ts';
	import { defaultBasemap } from '#lib/basemaps.ts';
	import type { LngLat } from '#lib/geo.ts';
	import { addYears, nurserySize, sizeAt } from '#lib/growth.ts';
	import { sizeTrees, type PlannedTree } from '#lib/plan.ts';
	import type { MapView } from '#lib/components/map/layers.ts';
	import AppHeader from '#lib/components/layout/AppHeader.svelte';
	import type { MenuAction } from '#lib/components/layout/UserMenu.svelte';
	import PlanMap from '#lib/components/map/PlanMap.svelte';
	import LayerMenu from '#lib/components/map/LayerMenu.svelte';
	import TimelineBar from '#lib/components/map/TimelineBar.svelte';
	import type { Snap } from '#lib/components/panel/panel.ts';
	import PlanPanel from '#lib/components/panel/PlanPanel.svelte';
	import AddTreePanel from '#lib/components/plan/AddTreePanel.svelte';
	import PlacePanel from '#lib/components/plan/PlacePanel.svelte';
	import PlanSettingsDialog from '#lib/components/plan/PlanSettingsDialog.svelte';
	import SharePlanDialog from '#lib/components/plan/SharePlanDialog.svelte';
	import TreeDetail from '#lib/components/plan/TreeDetail.svelte';
	import TreeList from '#lib/components/plan/TreeList.svelte';
	import Badge from '#lib/components/ui/Badge.svelte';

	interface Props {
		/** plan id, or the token when opened through a share link */
		planRef: string;
	}

	let { planRef }: Props = $props();

	const [user, plan, trees, species, basemaps] = $derived(
		await Promise.all([
			getCurrentUser(),
			getPlan(planRef),
			getTrees(planRef),
			getPlanSpecies(planRef),
			getBasemaps()
		])
	);
	const isOwner = $derived(plan.role === 'owner');
	const canEdit = $derived(plan.role !== 'view');

	let years = $state(0);
	let showMature = $state(true);
	let basemapId = $state<string | null>(null);
	const basemap = $derived(basemaps.find((b) => b.id === basemapId) ?? defaultBasemap(basemaps));

	/** what the panel shows; a selected tree shows its details */
	let adding = $state(false);
	let selectedId = $state<string | null>(null);
	/** tree hovered in the list */
	let highlightId = $state<string | null>(null);
	// the list's search and filter survive opening a tree
	let query = $state('');
	let filter = $state('all');
	/** how far the panel is open on small screens, and how much of the map it covers */
	let snap = $state<Snap>('peek');
	let inset = $state(0);

	/** species of the new tree waiting to be planted at the map center */
	let draft = $state<string | null>(null);
	// the species is kept between trees so planting several of the same is quick
	let lastSpeciesId = $state('');
	/** tree being moved, it stays faded at its old spot until the move is confirmed */
	let movingId = $state<string | null>(null);
	let settingsOpen = $state(false);
	let shareOpen = $state(false);
	let map = $state<PlanMap<PlannedTree>>();

	/** where a tree is shown while it's being moved, kept until the move is saved */
	let preview = $state<{ id: string; at: LngLat } | null>(null);

	const today = new Date();
	// new trees start as a nursery tree today, a real measurement can be logged in the details
	const todayIso = today.toISOString().slice(0, 10);
	const viewDate = $derived(addYears(today, years));
	const positioned = $derived(
		trees.map((t) => (preview?.id === t.id ? { ...t, lng: preview.at[0], lat: preview.at[1] } : t))
	);
	const sized = $derived(sizeTrees(positioned, viewDate));

	const draftSpecies = $derived(draft && species.find((s) => s.id === draft));
	/** the tree being planted or moved, drawn as the marker in the map center */
	const placingTree = $derived.by((): PlannedTree | null => {
		if (movingId) return trees.find((t) => t.id === movingId) ?? null;
		if (!draft || !draftSpecies) return null;
		const nursery = nurserySize(draftSpecies.matureHeight, draftSpecies.matureSpread);
		return {
			id: 'draft',
			label: null,
			lng: 0,
			lat: 0,
			speciesName: draftSpecies.name,
			color: draftSpecies.color,
			matureHeight: draftSpecies.matureHeight,
			matureSpread: draftSpecies.matureSpread,
			yearsToMaturity: draftSpecies.yearsToMaturity,
			heightStart: { date: todayIso, value: nursery.height },
			spreadStart: { date: todayIso, value: nursery.spread }
		};
	});
	const placingSpread = $derived(placingTree ? sizeAt(placingTree, viewDate).spread : 0);
	/** map scale at the center, to draw the marker at the tree's real size */
	let metersPerPixel = $state(1);
	const selected = $derived(sized.find((t) => t.id === selectedId) ?? null);
	const placing = $derived(draft !== null || movingId !== null);

	const menuActions: MenuAction[] = $derived(
		isOwner
			? [
					{ label: t`Share plan`, icon: Share2, onclick: () => (shareOpen = true) },
					{ label: t`Plan settings`, icon: Settings, onclick: () => (settingsOpen = true) }
				]
			: []
	);

	const initialView: MapView = $derived({
		lng: plan.centerLng,
		lat: plan.centerLat,
		zoom: plan.zoom
	});

	/** centers the map on a tree, in the part the panel leaves visible */
	async function focus(id: string, zoom?: number) {
		// let the sheet settle first, its new height decides where the center is
		await tick();
		const tree = trees.find((t) => t.id === id);
		if (tree) map?.flyTo([tree.lng, tree.lat], zoom);
	}

	function open(id: string | null) {
		highlightId = null;
		if (!id) {
			// tapping empty map closes the tree, but not the species list
			if (selectedId) selectedId = null;
			return;
		}
		adding = false;
		selectedId = id;
		if (snap === 'peek') snap = 'half';
	}

	function openFromMap(id: string | null) {
		open(id);
		// on small screens the sheet may now cover the tree
		if (id && inset > 0) focus(id);
	}

	function openFromList(id: string) {
		open(id);
		focus(id, 19);
	}

	function backToList() {
		selectedId = null;
		adding = false;
	}

	function startMove(id: string) {
		draft = null;
		movingId = id;
		focus(id);
	}

	function startPlanting(speciesId: string) {
		lastSpeciesId = speciesId;
		movingId = null;
		preview = null;
		draft = speciesId;
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
			const speciesId = draft;
			draft = null;
			open(await createTree({ planRef, speciesId, lng: at[0], lat: at[1] }));
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
</script>

<svelte:head><title>{plan.name} · Plantmap</title></svelte:head>

<svelte:window
	onkeydown={(e) => {
		if (e.key !== 'Escape' || (e.target as HTMLElement).closest('input, textarea, select, dialog'))
			return;
		if (placing) cancelPlacing();
		else backToList();
	}}
/>

<div class="flex h-full flex-col">
	<AppHeader {user} actions={menuActions}>
		{#snippet title()}
			<h1 class="truncate text-sm leading-tight font-semibold text-stone-900 md:text-base">
				{plan.name}
			</h1>
			{#if !isOwner}
				{@const owner = plan.ownerName}
				<p class="flex items-center gap-1.5 truncate text-xs text-stone-500">
					{#if canEdit}
						<Badge tone="green"><Pencil /> {t`Can edit`}</Badge>
					{:else}
						<Badge><Eye /> {t`View only`}</Badge>
					{/if}
					<span class="truncate">{t`Shared by ${owner}`}</span>
				</p>
			{:else if plan.description}
				<p class="truncate text-xs text-stone-500">{plan.description}</p>
			{/if}
		{/snippet}
	</AppHeader>

	<div class="relative flex min-h-0 flex-1">
		<PlanPanel bind:snap bind:inset locked={placing}>
			{#if placingTree}
				<PlacePanel
					tree={placingTree}
					moving={!!movingId}
					onplace={place}
					oncancel={cancelPlacing}
				/>
			{:else if adding}
				<AddTreePanel
					{species}
					{lastSpeciesId}
					onpick={(id) => {
						adding = false;
						startPlanting(id);
					}}
					onback={backToList}
				/>
			{:else if selected}
				{#key selected.id}
					<TreeDetail
						tree={selected}
						{planRef}
						editable={canEdit}
						{species}
						{viewDate}
						onback={backToList}
						onmove={() => startMove(selected.id)}
						onshow={() => {
							snap = 'peek';
							focus(selected.id, 19);
						}}
						ondelete={backToList}
					/>
				{/key}
			{:else}
				<TreeList
					trees={sized}
					year={viewDate.getFullYear()}
					editable={canEdit}
					bind:query
					bind:filter
					bind:highlightId
					onopen={openFromList}
					onadd={() => {
						adding = true;
						snap = 'full';
					}}
				/>
			{/if}
		</PlanPanel>

		<section class="relative min-h-0 flex-1">
			<PlanMap
				bind:this={map}
				view={initialView}
				trees={sized}
				{selectedId}
				{highlightId}
				bottomInset={inset}
				fadedId={movingId}
				{placing}
				{showMature}
				{basemaps}
				{basemap}
				onselect={openFromMap}
				onscale={(m) => (metersPerPixel = m)}
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
				<!-- the part of the map above the sheet, its center is where the tree goes -->
				<div
					class="pointer-events-none absolute inset-x-0 top-0 transition-[bottom] duration-300"
					style:bottom="{inset}px"
					aria-hidden="true"
				>
					{#if placingTree}
						<!-- the tree at its real size; an overlay rather than a map layer so it doesn't lag behind panning -->
						<div
							class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dotted border-stone-700/80 drop-shadow-[0_0_1px_white]"
							style:width="{placingTree.matureSpread / metersPerPixel}px"
							style:height="{placingTree.matureSpread / metersPerPixel}px"
						></div>
						<div
							class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
							style:width="{placingSpread / metersPerPixel}px"
							style:height="{placingSpread / metersPerPixel}px"
							style:border-color={placingTree.color}
						></div>
					{/if}
					<div
						class="absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 text-stone-900 drop-shadow-[0_0_2px_white]"
					>
						<div class="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current/70"></div>
						<div class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current/70"></div>
						<div
							class="absolute top-1/2 left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-current shadow-md"
							style:background-color={placingTree?.color}
						></div>
					</div>
				</div>
			{/if}
		</section>
	</div>
</div>

{#if isOwner}
	<PlanSettingsDialog bind:open={settingsOpen} {plan} />
	<SharePlanDialog bind:open={shareOpen} planId={plan.id} />
{/if}

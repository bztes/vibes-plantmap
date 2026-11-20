<script lang="ts">
	import { t } from '@bztes/vibes-t0n';
	import {
		Check,
		ChevronUp,
		Eye,
		Info,
		List,
		MapPin,
		Move,
		Pencil,
		Settings,
		Share2,
		TreeDeciduous,
		TriangleAlert,
		X
	} from '@lucide/svelte';
	import { getCurrentUser } from '#lib/remote/auth.remote.ts';
	import { getBasemaps } from '#lib/remote/basemaps.remote.ts';
	import { getPlan, savePlanView } from '#lib/remote/plans.remote.ts';
	import { getPlanSpecies } from '#lib/remote/species.remote.ts';
	import { createTree, getTrees, moveTree } from '#lib/remote/trees.remote.ts';
	import { defaultBasemap } from '#lib/basemaps.ts';
	import type { LngLat } from '#lib/geo.ts';
	import { addYears, plantingSize, sizeAt } from '#lib/growth.ts';
	import { matureSizeLabel } from '#lib/species.ts';
	import {
		findConflicts,
		findUpcomingConflicts,
		sizeTrees,
		treeName,
		treeSummary,
		type PlannedTree
	} from '#lib/plan.ts';
	import type { MapView } from '#lib/components/map/layers.ts';
	import AppHeader from '#lib/components/layout/AppHeader.svelte';
	import type { MenuAction } from '#lib/components/layout/UserMenu.svelte';
	import PlanMap from '#lib/components/map/PlanMap.svelte';
	import LayerMenu from '#lib/components/map/LayerMenu.svelte';
	import TimelineBar from '#lib/components/map/TimelineBar.svelte';
	import ConflictList from '#lib/components/plan/ConflictList.svelte';
	import PlanSettingsDialog from '#lib/components/plan/PlanSettingsDialog.svelte';
	import SharePlanDialog from '#lib/components/plan/SharePlanDialog.svelte';
	import SpeciesDialog from '#lib/components/plan/SpeciesDialog.svelte';
	import TreeDialog from '#lib/components/plan/TreeDialog.svelte';
	import TreeList from '#lib/components/plan/TreeList.svelte';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import ColorSwatch from '#lib/components/ui/ColorSwatch.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import Tabs from '#lib/components/ui/Tabs.svelte';

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
	let selectedId = $state<string | null>(null);
	let addOpen = $state(false);
	let detailsOpen = $state(false);
	/** species of the new tree waiting to be planted at the map center */
	let draft = $state<string | null>(null);
	// the species is kept between trees so planting several of the same is quick
	let lastSpeciesId = $state('');
	/** tree being moved, it stays faded at its old spot until the move is confirmed */
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
	// new trees are planted today, the date and everything else can be changed in the details later
	const plantedToday = today.toISOString().slice(0, 10);
	const viewDate = $derived(addYears(today, years));
	const positioned = $derived(
		trees.map((t) => (preview?.id === t.id ? { ...t, lng: preview.at[0], lat: preview.at[1] } : t))
	);
	const sized = $derived(sizeTrees(positioned, viewDate));
	const conflicts = $derived(findConflicts(sized));

	const draftSpecies = $derived(draft && species.find((s) => s.id === draft));
	/** the tree being planted or moved, drawn as the marker in the map center */
	const placingTree = $derived.by((): PlannedTree | null => {
		if (movingId) return trees.find((t) => t.id === movingId) ?? null;
		if (!draft || !draftSpecies) return null;
		return {
			id: 'draft',
			label: null,
			lng: 0,
			lat: 0,
			speciesName: draftSpecies.name,
			color: draftSpecies.color,
			plantedAt: plantedToday,
			matureHeight: draftSpecies.matureHeight,
			matureSpread: draftSpecies.matureSpread,
			yearsToMaturity: draftSpecies.yearsToMaturity,
			...plantingSize(draftSpecies.matureHeight, draftSpecies.matureSpread)
		};
	});
	const placingSpread = $derived(placingTree ? sizeAt(placingTree, viewDate).spread : 0);
	/** map scale at the center, to draw the marker at the tree's real size */
	let metersPerPixel = $state(1);
	const placingSize = $derived(placingTree && matureSizeLabel(placingTree));
	const upcoming = $derived(findUpcomingConflicts(positioned, viewDate));
	const selected = $derived(sized.find((t) => t.id === selectedId) ?? null);
	const placing = $derived(draft !== null || movingId !== null);
	const involves = (id: string) => (c: { a: { id: string }; b: { id: string } }) =>
		c.a.id === id || c.b.id === id;
	const selectedConflicts = $derived(selected ? conflicts.filter(involves(selected.id)) : []);
	const selectedUpcoming = $derived(selected ? upcoming.filter(involves(selected.id)) : []);

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

	function startMove(id: string) {
		const tree = trees.find((t) => t.id === id);
		if (!tree) return;
		draft = null;
		movingId = id;
		map?.flyTo([tree.lng, tree.lat]);
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
			select(
				await createTree({
					planRef,
					speciesId,
					plantedAt: plantedToday,
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
		detailsOpen = false;
	}

	function focusPair(a: PlannedTree, b: PlannedTree) {
		select(a.id);
		map?.fitTo([
			[a.lng, a.lat],
			[b.lng, b.lat]
		]);
	}

	function selectFromList(id: string) {
		select(id);
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
		else select(null);
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

	<div class="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
		<aside
			class={[
				'flex w-full shrink-0 flex-col border-t border-stone-200 bg-white md:h-full md:w-96 md:border-t-0 md:border-r',
				panelOpen && 'h-[45%]'
			]}
		>
			<div class="flex items-center gap-2 p-3 md:p-4 md:pb-2">
				<Tabs
					class="flex-1"
					bind:value={() => tab, (id) => ((tab = id), (panelOpen = true))}
					tabs={[
						{ id: 'trees', label: t`Trees (${trees.length})`, icon: List },
						{ id: 'conflicts', label: t`Conflicts`, icon: TriangleAlert, count: conflicts.length }
					]}
				/>
				<IconButton
					label={panelOpen ? t`Collapse panel` : t`Expand panel`}
					class="md:hidden"
					aria-expanded={panelOpen}
					onclick={() => (panelOpen = !panelOpen)}
				>
					<ChevronUp class={['transition-transform', panelOpen && 'rotate-180']} />
				</IconButton>
			</div>

			<div
				class={[
					'min-h-0 flex-1 overflow-y-auto px-3 pb-3 md:block md:px-4 md:pb-4',
					!panelOpen && 'hidden'
				]}
			>
				{#if tab === 'trees'}
					<TreeList trees={sized} {conflicts} {selectedId} onselect={selectFromList} />
				{:else}
					<ConflictList year={viewDate.getFullYear()} {conflicts} {upcoming} onfocus={focusPair} />
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
				fadedId={movingId}
				{placing}
				{showMature}
				{basemaps}
				{basemap}
				onselect={select}
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
				{#if placingTree}
					<!-- the tree at its real size; an overlay rather than a map layer so it doesn't lag behind panning -->
					<div
						class="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dotted border-stone-700/80 drop-shadow-[0_0_1px_white]"
						style:width="{placingTree.matureSpread / metersPerPixel}px"
						style:height="{placingTree.matureSpread / metersPerPixel}px"
						aria-hidden="true"
					></div>
					<div
						class="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
						style:width="{placingSpread / metersPerPixel}px"
						style:height="{placingSpread / metersPerPixel}px"
						style:border-color={placingTree.color}
						aria-hidden="true"
					></div>
				{/if}
				<!-- the map center is where the tree goes -->
				<div
					class="pointer-events-none absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 text-stone-900 drop-shadow-[0_0_2px_white]"
					aria-hidden="true"
				>
					<div class="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current/70"></div>
					<div class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current/70"></div>
					<div
						class="absolute top-1/2 left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-current shadow-md"
						style:background-color={placingTree?.color}
					></div>
				</div>
				<div
					class="pointer-events-none absolute top-18 left-1/2 max-w-[90%] -translate-x-1/2 rounded-2xl bg-stone-900/85 px-4 py-1.5 text-center text-sm text-white shadow"
				>
					{t`Move map to place tree`}
					{#if placingSize}
						<span class="block text-xs text-white/75">{placingSize}</span>
					{/if}
				</div>
			{/if}

			{#if selected && !placing}
				<div
					class="absolute inset-x-3 bottom-10 mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-stone-200/80 bg-white/95 p-2 pl-3.5 shadow-lg backdrop-blur"
				>
					<ColorSwatch color={selected.color} class="size-3.5" />
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-stone-900">{treeName(selected)}</p>
						<p class="truncate text-xs text-stone-500">
							{treeSummary(selected)}
						</p>
					</div>
					{#if selectedConflicts.length > 0}
						<TriangleAlert
							class="size-4 shrink-0 text-red-500"
							aria-label={t`Too close to another tree`}
						/>
					{/if}
					{#if canEdit}
						<Button
							size="sm"
							variant="outline"
							aria-label={t`Move tree`}
							onclick={() => startMove(selected.id)}
						>
							<Move /><span class="max-[420px]:hidden">{t`Move`}</span>
						</Button>
					{/if}
					<Button size="sm" onclick={() => (detailsOpen = true)}><Info /> {t`Details`}</Button>
					<IconButton label={t`Deselect`} small onclick={() => select(null)}><X /></IconButton>
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
				{:else if canEdit && !selected}
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
</div>

{#if selected}
	{#key selected.id}
		<TreeDialog
			bind:open={detailsOpen}
			tree={selected}
			{planRef}
			editable={canEdit}
			{species}
			year={viewDate.getFullYear()}
			conflicts={selectedConflicts}
			upcoming={selectedUpcoming}
			ondelete={() => select(null)}
		/>
	{/key}
{/if}

{#if isOwner}
	<PlanSettingsDialog bind:open={settingsOpen} {plan} />
	<SharePlanDialog bind:open={shareOpen} planId={plan.id} />
{/if}
{#if canEdit}
	<SpeciesDialog
		bind:open={addOpen}
		{species}
		value={lastSpeciesId || species[0]?.id || ''}
		title={t`Add tree`}
		description={t`Choose what to plant, then position it on the map.`}
		onselect={startPlanting}
	>
		{#snippet submit()}<MapPin /> {t`Place on map`}{/snippet}
	</SpeciesDialog>
{/if}

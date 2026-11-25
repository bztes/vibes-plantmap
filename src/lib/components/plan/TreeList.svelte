<script lang="ts">
	import { getLocale, t } from '@bztes/vibes-t0n';
	import { Plus, Search, StickyNote, TreeDeciduous, X } from '@lucide/svelte';
	import type { TreeRow } from '#lib/remote/trees.remote.ts';
	import { formatMeters } from '#lib/growth.ts';
	import { canopyArea, type Sized } from '#lib/plan.ts';
	import { getPanel } from '#lib/components/panel/panel.ts';
	import Button from '#lib/components/ui/Button.svelte';
	import ColorSwatch from '#lib/components/ui/ColorSwatch.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';

	interface Props {
		trees: Sized<TreeRow>[];
		/** year the map shows */
		year: number;
		editable: boolean;
		query: string;
		/** 'all' or a species id */
		filter: string;
		/** tree hovered in the list, highlighted on the map */
		highlightId: string | null;
		onopen: (id: string) => void;
		onadd: () => void;
	}

	let {
		trees,
		year,
		editable,
		query = $bindable(),
		filter = $bindable(),
		highlightId = $bindable(),
		onopen,
		onadd
	}: Props = $props();

	const panel = getPanel();

	const speciesGroups = $derived(
		[...Map.groupBy(trees, (t) => t.speciesId).values()]
			.map((items) => ({
				id: items[0].speciesId,
				name: items[0].speciesName,
				color: items[0].color,
				// named trees first, by name
				items: items.toSorted((a, b) =>
					(a.label ?? '\uffff').localeCompare(b.label ?? '\uffff', getLocale())
				)
			}))
			.sort((a, b) => a.name.localeCompare(b.name, getLocale()))
	);

	const groups = $derived.by(() => {
		const q = query.trim().toLocaleLowerCase();
		const matches = (tree: Sized<TreeRow>) =>
			(filter === 'all' || tree.speciesId === filter) &&
			(!q ||
				[tree.label, tree.speciesName, tree.notes].some((s) => s?.toLocaleLowerCase().includes(q)));
		return speciesGroups
			.map((g) => ({ ...g, items: g.items.filter(matches) }))
			.filter((g) => g.items.length > 0);
	});

	const canopy = $derived(
		Math.round(canopyArea(trees)).toLocaleString(getLocale(), { maximumFractionDigits: 0 })
	);
	const treeCount = $derived(trees.length);
	const speciesCount = $derived(speciesGroups.length);

	/** filters offered in the search box: each species when there are several */
	const filters = $derived([
		...(speciesCount > 1
			? speciesGroups.map((g) => ({
					id: g.id,
					name: g.name,
					count: g.items.length,
					color: g.color
				}))
			: [])
	]);
	const active = $derived(filters.find((f) => f.id === filter));

	let input = $state<HTMLInputElement>();
	let focused = $state(false);
	/** closed with Escape, opens again when typing */
	let dismissed = $state(false);
	/** option chosen with the arrow keys */
	let cursor = $state(-1);
	const listId = $props.id();
	/** filters matching what's typed, offered in a popup under the search box */
	const suggestions = $derived.by(() => {
		if (!focused || dismissed || active) return [];
		const q = query.trim().toLocaleLowerCase();
		return filters.filter((f) => f.name.toLocaleLowerCase().includes(q));
	});

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Backspace' && !query && active) {
			filter = 'all';
		} else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			if (!suggestions.length) return;
			e.preventDefault();
			const step = e.key === 'ArrowDown' ? 1 : -1;
			cursor = (cursor + step + suggestions.length + 1) % (suggestions.length + 1);
			if (cursor === suggestions.length) cursor = -1;
		} else if (e.key === 'Enter') {
			const option =
				suggestions[cursor] ?? (query.trim() && suggestions.length === 1 ? suggestions[0] : null);
			if (option) {
				e.preventDefault();
				pick(option.id);
			}
		} else if (e.key === 'Escape' && suggestions.length) {
			// only closes the popup, the plan's Escape (back / deselect) doesn't run
			e.stopPropagation();
			dismissed = true;
		}
	}

	function pick(id: string) {
		cursor = -1;
		filter = id;
		// the filter replaces the text that found it
		query = '';
		input?.focus();
	}

	function clearFilter() {
		filter = 'all';
		input?.focus();
	}

	$effect(() => {
		// a filter can lose its last tree, e.g. after deleting it
		if (filter !== 'all' && !speciesGroups.some((g) => g.id === filter)) filter = 'all';
	});
</script>

<div {@attach panel.peek} class="flex shrink-0 flex-col gap-2.5 px-4 pt-1 pb-3 md:pt-4">
	<div class="flex items-center gap-2">
		<div class="min-w-0 flex-1">
			<h2 class="text-base font-semibold text-stone-900">{t`Trees`}</h2>
			<p class="truncate text-xs text-stone-500">
				{#if treeCount === 0}
					{t`Nothing planted yet`}
				{:else}
					{treeCount === 1 ? t`1 tree` : t`${treeCount} trees`} ·
					{speciesCount === 1 ? t`1 species` : t`${speciesCount} species`} ·
					{t`${canopy} m² crowns in ${year}`}
				{/if}
			</p>
		</div>
		{#if editable}
			<Button size="sm" onclick={onadd}><Plus /> {t`Add`}</Button>
		{/if}
	</div>

	{#if treeCount > 0}
		<div class="relative">
			<!-- the active filter sits in the search box as a tag -->
			<label
				class="flex h-9 cursor-text items-center gap-2 rounded-lg border border-stone-300 bg-white pr-1.5 pl-3 shadow-sm transition-colors focus-within:border-leaf-500 focus-within:ring-2 focus-within:ring-leaf-500/30"
			>
				<Search class="size-4 shrink-0 text-stone-400" />
				{#if active}
					<span
						class="flex max-w-[55%] shrink-0 items-center gap-1.5 rounded-md bg-stone-900 py-0.5 pr-0.5 pl-2 text-xs font-medium text-white"
					>
						<ColorSwatch color={active.color} class="size-2.5" />
						<span class="truncate">{active.name}</span>
						<button
							type="button"
							class="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded hover:bg-white/20"
							aria-label={t`Remove filter ${active.name}`}
							onclick={clearFilter}
						>
							<X class="size-3.5" />
						</button>
					</span>
				{/if}
				<input
					bind:this={input}
					type="search"
					value={query}
					oninput={(e) => {
						query = e.currentTarget.value;
						dismissed = false;
						cursor = -1;
					}}
					onfocus={() => {
						focused = true;
						dismissed = false;
						// room for the popup on small screens
						panel.expand('half');
					}}
					onblur={() => {
						focused = false;
						cursor = -1;
					}}
					{onkeydown}
					role="combobox"
					aria-expanded={suggestions.length > 0}
					aria-controls={listId}
					aria-autocomplete="list"
					aria-activedescendant={cursor >= 0 ? `${listId}-${cursor}` : undefined}
					placeholder={active ? t`Search` : t`Search names, species, notes`}
					aria-label={t`Search trees`}
					autocomplete="off"
					class="h-full min-w-0 flex-1 bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
				/>
			</label>

			<!-- floats over the list, so the results don't move -->
			{#if suggestions.length}
				<div
					id={listId}
					role="listbox"
					aria-label={t`Show only`}
					class="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto overscroll-contain rounded-lg border border-stone-200 bg-white p-1 shadow-lg"
				>
					<p class="px-2 pt-1.5 pb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
						{t`Show only`}
					</p>
					{#each suggestions as option, i (option.id)}
						<div
							id="{listId}-{i}"
							role="option"
							aria-selected={i === cursor}
							tabindex="-1"
							class={[
								'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-stone-700 transition-colors hover:bg-stone-100',
								i === cursor && 'bg-stone-100'
							]}
							onpointerdown={(e) => e.preventDefault()}
							onclick={() => pick(option.id)}
							onkeydown={() => {}}
						>
							<ColorSwatch color={option.color} class="size-3" />
							<span class="min-w-0 flex-1 truncate">{option.name}</span>
							<span class="text-xs text-stone-400 tabular-nums">{option.count}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<div
	class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
	inert={panel.collapsed}
>
	{#if treeCount === 0}
		<div class="px-2">
			<EmptyState
				icon={TreeDeciduous}
				title={t`No trees yet`}
				description={editable
					? t`Choose a species, then move the map to where it should grow.`
					: t`Nothing has been planted in this plan yet.`}
			>
				{#if editable}<Button onclick={onadd}><Plus /> {t`Add tree`}</Button>{/if}
			</EmptyState>
		</div>
	{:else}
		{#each groups as group (group.id)}
			<section class="mb-2">
				<h3
					class="flex items-center gap-2 px-2 pt-2 pb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase"
				>
					<ColorSwatch color={group.color} class="size-2.5" />
					<span class="min-w-0 flex-1 truncate">{group.name}</span>
					<span class="font-medium text-stone-400 tabular-nums">{group.items.length}</span>
				</h3>
				{#each group.items as tree (tree.id)}
					{@const progress = Math.min(1, tree.size.spread / tree.matureSpread)}
					<button
						type="button"
						class={[
							'grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-stone-100',
							highlightId === tree.id && 'bg-stone-100'
						]}
						onclick={() => onopen(tree.id)}
						onpointerenter={(e) => e.pointerType === 'mouse' && (highlightId = tree.id)}
						onpointerleave={() => highlightId === tree.id && (highlightId = null)}
					>
						<span
							class={[
								'truncate text-sm',
								tree.label ? 'font-medium text-stone-900' : 'text-stone-600'
							]}
						>
							{tree.label || tree.speciesName}
						</span>
						<span class="text-right text-xs text-stone-500 tabular-nums">
							{formatMeters(tree.size.height)} · ⌀ {formatMeters(tree.size.spread)}
						</span>
						<span
							class="h-1 overflow-hidden rounded-full bg-stone-200"
							title={t`Crown at ${Math.round(progress * 100)}% of its mature width`}
						>
							<span
								class="block h-full rounded-full"
								style:width="{progress * 100}%"
								style:background-color={tree.color}
							></span>
						</span>
						<span class="flex justify-end gap-1 empty:hidden">
							{#if tree.notes}
								<StickyNote class="size-3.5 text-stone-400" aria-label={t`Has notes`} />
							{/if}
						</span>
					</button>
				{/each}
			</section>
		{:else}
			<p class="px-2 py-8 text-center text-sm text-stone-500">{t`No trees match.`}</p>
		{/each}
	{/if}
</div>

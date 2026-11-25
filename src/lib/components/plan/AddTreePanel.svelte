<script lang="ts">
	import { t } from '@bztes/vibes-t0n';
	import { ChevronLeft, Search } from '@lucide/svelte';
	import { categoryLabel, groupSpecies, searchSpecies } from '#lib/species.ts';
	import { getPanel } from '#lib/components/panel/panel.ts';
	import ColorSwatch from '#lib/components/ui/ColorSwatch.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import type { PickableSpecies } from './SpeciesPicker.svelte';

	interface Props {
		species: PickableSpecies[];
		/** species planted last, offered first so planting several of the same is quick */
		lastSpeciesId: string;
		onpick: (speciesId: string) => void;
		onback: () => void;
	}

	let { species, lastSpeciesId, onpick, onback }: Props = $props();

	const panel = getPanel();
	const sorted = $derived(groupSpecies(species));
	let query = $state('');
	const groups = $derived(searchSpecies(sorted, query));
	const last = $derived(
		query ? undefined : sorted.flatMap((g) => g.items).find((s) => s.id === lastSpeciesId)
	);
</script>

{#snippet option(s: (typeof sorted)[number]['items'][number])}
	<button
		type="button"
		class="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-stone-100"
		onclick={() => onpick(s.id)}
	>
		<ColorSwatch color={s.color} class="size-3.5" />
		<span class="min-w-0 flex-1">
			<span class="block truncate text-sm font-medium text-stone-900">{s.name}</span>
			<span class="block truncate text-xs text-stone-500">{s.size}</span>
		</span>
	</button>
{/snippet}

<div {@attach panel.peek} class="flex shrink-0 flex-col gap-2.5 px-3 pt-1 pb-3 md:pt-3">
	<div class="flex items-center gap-1.5">
		<IconButton label={t`Back`} onclick={onback}><ChevronLeft /></IconButton>
		<h2 class="text-base font-semibold text-stone-900">{t`What are you planting?`}</h2>
	</div>
	<div class="relative px-1">
		<Search
			class="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-stone-400"
		/>
		<Input
			type="search"
			size="sm"
			value={query}
			oninput={(e) => (query = e.currentTarget.value)}
			placeholder={t`Search species`}
			aria-label={t`Search species`}
			class="pl-9"
			autocomplete="off"
		/>
	</div>
</div>

<div
	class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
	inert={panel.collapsed}
>
	{#if last}
		<h3 class="px-2 pt-2 pb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
			{t`Last planted`}
		</h3>
		{@render option(last)}
	{/if}
	{#each groups as group (group.category)}
		<h3 class="px-2 pt-3 pb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
			{categoryLabel(group.category)}
		</h3>
		{#each group.items as s (s.id)}{@render option(s)}{/each}
	{:else}
		<p class="py-8 text-center text-sm text-stone-500">{t`No species found`}</p>
	{/each}
</div>

<script lang="ts" module>
	export interface PickableSpecies {
		id: string;
		name: string;
		category: string;
		matureHeight: number;
		matureSpread: number;
		color: string;
	}
</script>

<script lang="ts">
	import { t } from '@bztes/vibes-t0n';
	import { Check, Search } from '@lucide/svelte';
	import ColorSwatch from '#lib/components/ui/ColorSwatch.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import { categoryLabel, groupSpecies, searchSpecies } from '#lib/species.ts';

	interface Props {
		species: PickableSpecies[];
		/** id of the chosen species */
		value: string;
		/** false while the search hides the chosen species */
		visible?: boolean;
	}

	let {
		species,
		value = $bindable(),
		// eslint-disable-next-line no-useless-assignment -- bindable, written by the effect below
		visible = $bindable(true)
	}: Props = $props();

	/** sorted and grouped once per species list, the search only filters these */
	const sorted = $derived(groupSpecies(species));

	let query = $state('');

	const groups = $derived(searchSpecies(sorted, query));

	$effect.pre(() => {
		visible = groups.some((g) => g.items.some((s) => s.id === value));
	});
</script>

<div class="flex flex-col gap-3">
	<!-- stays in view while the dialog body scrolls -->
	<div class="sticky top-0 z-10 -mt-5 bg-white pt-5 pb-1">
		<div class="relative">
			<Search
				class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400"
			/>
			<Input
				type="search"
				value={query}
				oninput={(e) => (query = e.currentTarget.value)}
				placeholder={t`Search species`}
				aria-label={t`Search species`}
				class="pl-9"
				autocomplete="off"
			/>
		</div>
	</div>
	<div class="flex flex-col gap-3" role="radiogroup" aria-label={t`Species`}>
		{#each groups as group (group.category)}
			<div>
				<h3 class="mb-1 px-1 text-xs font-medium tracking-wide text-stone-500 uppercase">
					{categoryLabel(group.category)}
				</h3>
				<div class="grid grid-cols-1 gap-1 sm:grid-cols-2">
					{#each group.items as s (s.id)}
						<label
							class={[
								'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-leaf-500/40',
								s.id === value ? 'bg-leaf-50 ring-1 ring-leaf-200 ring-inset' : 'hover:bg-stone-100'
							]}
						>
							<input
								type="radio"
								name="speciesId"
								value={s.id}
								class="sr-only"
								bind:group={value}
								required
							/>
							<ColorSwatch color={s.color} class="size-3.5" />
							<span class="min-w-0 flex-1">
								<span class="block truncate text-sm font-medium text-stone-900">{s.name}</span>
								<span class="block truncate text-xs text-stone-500">{s.size}</span>
							</span>
							{#if s.id === value}<Check class="size-4 shrink-0 text-leaf-600" />{/if}
						</label>
					{/each}
				</div>
			</div>
		{:else}
			<p class="py-8 text-center text-sm text-stone-500">{t`No species found`}</p>
		{/each}
	</div>
</div>

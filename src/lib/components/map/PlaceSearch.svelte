<script lang="ts">
	import { getLocale, t } from '#lib/i18n/index.ts';
	import { MapPin, Search } from '@lucide/svelte';
	import type { LngLat } from '#lib/geo.ts';
	import Input from '#lib/components/ui/Input.svelte';

	interface Place {
		id: string;
		name: string;
		detail: string;
		at: LngLat;
	}

	interface Props {
		/** biases results towards the current map position */
		near?: LngLat;
		onselect: (at: LngLat) => void;
	}

	let { near, onselect }: Props = $props();

	let query = $state('');
	let results = $state.raw<Place[]>([]);
	let open = $state(false);
	let timer: ReturnType<typeof setTimeout>;
	let controller: AbortController | undefined;

	interface PhotonFeature {
		geometry: { coordinates: LngLat };
		properties: Record<string, string | undefined> & { osm_id: number };
	}

	async function search(q: string) {
		controller?.abort();
		if (q.trim().length < 3) {
			results = [];
			return;
		}
		controller = new AbortController();
		const url = new URL('https://photon.komoot.io/api/');
		url.searchParams.set('q', q);
		url.searchParams.set('limit', '6');
		// photon only knows a few languages
		if (['de', 'en', 'fr'].includes(getLocale())) url.searchParams.set('lang', getLocale());
		if (near) {
			url.searchParams.set('lon', String(near[0]));
			url.searchParams.set('lat', String(near[1]));
		}
		try {
			const res = await fetch(url, { signal: controller.signal });
			const json: { features: PhotonFeature[] } = await res.json();
			results = json.features.map((f, i) => {
				const p = f.properties;
				return {
					id: `${p.osm_id}-${i}`,
					name: p.name ?? [p.street, p.housenumber].filter(Boolean).join(' '),
					detail: [p.postcode, p.city, p.country].filter(Boolean).join(', '),
					at: f.geometry.coordinates
				};
			});
			open = true;
		} catch (e) {
			if ((e as Error).name !== 'AbortError') results = [];
		}
	}

	function choose(place: Place) {
		onselect(place.at);
		open = false;
		query = place.name;
	}
</script>

<div class="relative w-full max-w-xs">
	<Search
		class="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-stone-400"
	/>
	<Input
		type="search"
		placeholder={t`Search address or place`}
		aria-label={t`Search address or place`}
		class="pl-9 shadow-md"
		value={query}
		oninput={(e) => {
			query = e.currentTarget.value;
			clearTimeout(timer);
			timer = setTimeout(() => search(query), 300);
		}}
		onfocus={() => (open = results.length > 0)}
		onblur={() => setTimeout(() => (open = false), 150)}
		onkeydown={(e) => {
			if (e.key === 'Enter' && results[0]) choose(results[0]);
			if (e.key === 'Escape') open = false;
		}}
	/>
	{#if open && results.length > 0}
		<ul
			class="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
		>
			{#each results as place (place.id)}
				<li>
					<button
						type="button"
						class="flex w-full cursor-pointer items-start gap-2 px-3 py-2 text-left text-sm hover:bg-stone-50"
						onclick={() => choose(place)}
					>
						<MapPin class="mt-0.5 size-4 shrink-0 text-stone-400" />
						<span class="min-w-0">
							<span class="block truncate font-medium text-stone-900">{place.name}</span>
							<span class="block truncate text-xs text-stone-500">{place.detail}</span>
						</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

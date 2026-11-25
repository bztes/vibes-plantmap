<script lang="ts" generics="T extends PlannedTree">
	import 'maplibre-gl/dist/maplibre-gl.css';
	import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
	import type { GeoJSONSource, Map, MapMouseEvent } from 'maplibre-gl';
	import { untrack } from 'svelte';
	import { Info } from '@lucide/svelte';
	import { t } from '@bztes/vibes-t0n';
	import Dialog from '#lib/components/ui/Dialog.svelte';
	import type { Basemap } from '#lib/basemaps.ts';
	import type { LngLat } from '#lib/geo.ts';
	import type { PlannedTree, Sized } from '#lib/plan.ts';
	import type { SunPosition } from '#lib/sun.ts';
	import {
		addRasterBasemaps,
		addTreeLayers,
		BLANK_STYLE,
		CANOPY_LAYER,
		setBasemap,
		setMatureVisible,
		shadowData,
		SOURCES,
		styleFor,
		TRUNK_LAYER,
		treeData,
		type MapView,
		type StyleCover
	} from './layers';

	interface Props {
		view: MapView;
		trees: Sized<T>[];
		selectedId: string | null;
		/** tree drawn like the selected one, e.g. while it's hovered in the list */
		highlightId?: string | null;
		/** pixels covered at the bottom, e.g. by a sheet; the map centers in the space above */
		bottomInset?: number;
		/** tree drawn transparent, e.g. at its old spot while it's being moved */
		fadedId?: string | null;
		/** when true, the map center marks where a tree goes, clicking pans there instead of selecting */
		placing: boolean;
		showMature: boolean;
		/** where the sun stands, to draw the trees' shadows; null draws none */
		sun?: SunPosition | null;
		/** all base maps the user can switch between */
		basemaps: Basemap[];
		basemap: Basemap | null;
		onselect: (id: string | null) => void;
		/** ground meters per screen pixel at the map center, fired while the map moves */
		onscale: (metersPerPixel: number) => void;
		onviewchange: (view: MapView) => void;
	}

	let {
		view,
		trees,
		selectedId,
		highlightId = null,
		bottomInset = 0,
		fadedId = null,
		placing,
		showMature,
		sun = null,
		basemaps,
		basemap,
		onselect,
		onscale,
		onviewchange
	}: Props = $props();

	let map = $state.raw<Map | null>(null);
	/** false while a (new) style loads, our layers only exist once it's done */
	let ready = $state(false);
	let cover = $state.raw<StyleCover>({ shapes: [], labels: [] });
	/** URL of the vector style currently loaded, '' for the blank fallback */
	let loadedStyle: string | undefined;
	let attributions = $state.raw<string[]>([]);
	let sourcesOpen = $state(false);
	const styleUrl = $derived(styleFor(basemap, basemaps)?.url ?? '');

	export function flyTo(at: LngLat, zoom?: number) {
		map?.flyTo({
			center: at,
			zoom: Math.max(zoom ?? map.getZoom(), map.getZoom()),
			padding: { top: 0, left: 0, right: 0, bottom: bottomInset }
		});
	}

	export function getCenter(): LngLat | null {
		if (!map) return null;
		const c = map.getCenter();
		return [c.lng, c.lat];
	}

	function setup(container: HTMLDivElement) {
		let instance: Map | undefined;
		let destroyed = false;

		import('maplibre-gl').then((ml) => {
			if (destroyed) return;
			// the worker's relative URL breaks once Vite pre-bundles maplibre, so point to it explicitly
			ml.setWorkerUrl(workerUrl);
			const initial = untrack(() => view);
			loadedStyle = untrack(() => styleUrl);
			instance = new ml.Map({
				container,
				style: loadedStyle || BLANK_STYLE,
				center: [initial.lng, initial.lat],
				zoom: initial.zoom,
				maxZoom: 22,
				attributionControl: false
			});
			instance.addControl(new ml.NavigationControl({ visualizePitch: true }), 'top-right');
			instance.addControl(
				new ml.GeolocateControl({
					positionOptions: { enableHighAccuracy: true, timeout: 30_000 },
					trackUserLocation: true
				}),
				'top-right'
			);
			instance.addControl(new ml.ScaleControl({ unit: 'metric', maxWidth: 140 }), 'bottom-left');

			const loaded = instance;
			// fires for the initial style and after every setStyle, which drops our layers
			loaded.on('style.load', () => {
				cover = addRasterBasemaps(loaded, basemaps, basemap);
				addTreeLayers(loaded);
				map = loaded;
				ready = true;
			});
			loaded.once('load', () => wireInteractions(loaded));
			const updateScale = () => {
				// maplibre tiles are 512 px wide, the earth's circumference shrinks with latitude
				const lat = (loaded.getCenter().lat * Math.PI) / 180;
				onscale((40_075_016.686 * Math.cos(lat)) / (512 * 2 ** loaded.getZoom()));
			};
			updateScale();
			loaded.on('move', updateScale);
			loaded.on('moveend', () => {
				const c = loaded.getCenter();
				onviewchange({ lng: c.lng, lat: c.lat, zoom: loaded.getZoom() });
			});
		});

		return () => {
			destroyed = true;
			instance?.remove();
			map = null;
		};
	}

	function showSources() {
		attributions = map ? attributionsOf(map) : [];
		sourcesOpen = true;
	}

	/** credits of the sources currently drawn, as HTML from the style or the admin's settings */
	function attributionsOf(m: Map) {
		const visible = new Set(
			m
				.getStyle()
				.layers.filter((l) => 'source' in l && l.layout?.visibility !== 'none')
				.map((l) => (l as { source: string }).source)
		);
		return [
			...new Set(
				[...visible].map((id) => m.getSource(id)?.attribution).filter((a): a is string => !!a)
			)
		];
	}

	function wireInteractions(m: Map) {
		const hitTree = (e: MapMouseEvent) => {
			const { x, y } = e.point;
			const box: [[number, number], [number, number]] = [
				[x - 8, y - 8],
				[x + 8, y + 8]
			];
			const trunk = m.queryRenderedFeatures(box, { layers: [TRUNK_LAYER] })[0];
			if (trunk) return trunk.properties.id as string;
			const canopies = m.queryRenderedFeatures(e.point, { layers: [CANOPY_LAYER] });
			if (canopies.length === 0) return null;
			// when crowns overlap, the smallest one under the cursor is the most specific
			const ids = new Set(canopies.map((f) => f.properties.id as string));
			const smallest = trees
				.filter((t) => ids.has(t.id))
				.sort((a, b) => a.size.spread - b.size.spread)[0];
			return smallest?.id ?? null;
		};

		m.on('click', (e) => {
			if (placing) {
				m.easeTo({ center: e.lngLat });
				return;
			}
			onselect(hitTree(e));
		});

		m.on('mousemove', (e) => {
			if (placing) return;
			m.getCanvas().style.cursor = hitTree(e) ? 'pointer' : '';
		});
	}

	$effect(() => {
		if (!map || styleUrl === loadedStyle) return;
		loadedStyle = styleUrl;
		ready = false;
		map.setStyle(styleUrl || BLANK_STYLE, { diff: false });
	});

	$effect(() => {
		if (!map || !ready) return;
		const data = treeData(trees, selectedId, fadedId, highlightId);
		for (const [key, source] of Object.entries(data)) {
			map.getSource<GeoJSONSource>(SOURCES[key as keyof typeof data])?.setData(source);
		}
	});

	$effect(() => {
		// on its own, so moving the sun doesn't redraw the trees
		if (!map || !ready) return;
		map.getSource<GeoJSONSource>(SOURCES.shadows)?.setData(shadowData(trees, sun, fadedId));
	});

	$effect(() => {
		if (map && ready) setMatureVisible(map, showMature);
	});

	$effect(() => {
		if (map && ready) setBasemap(map, basemap, basemaps, cover);
	});

	$effect(() => {
		// the center (where new trees go) moves up with the padding, into the visible part
		map?.easeTo({ padding: { top: 0, left: 0, right: 0, bottom: bottomInset }, duration: 250 });
	});

	$effect(() => {
		// drop a leftover hover cursor, the map is only panned while placing
		if (map && placing) map.getCanvas().style.cursor = '';
	});
</script>

<!-- maplibre forces position: relative on its container, so position a wrapper instead -->
<!-- touch screens pinch to zoom, so small screens skip the zoom buttons -->
<!-- the bottom controls stay above whatever covers the bottom of the map -->
<div
	class="absolute inset-0 bg-stone-200 [&_.maplibregl-ctrl-bottom-left]:bottom-(--inset) [&_.maplibregl-ctrl-bottom-left]:transition-[bottom] max-md:[&_.maplibregl-ctrl-zoom-in,&_.maplibregl-ctrl-zoom-out]:hidden"
	style:--inset="{bottomInset}px"
>
	<div {@attach setup} class="h-full w-full"></div>
	<button
		type="button"
		aria-label={t`Map sources`}
		title={t`Map sources`}
		style:bottom="calc({bottomInset}px + 0.625rem)"
		class="absolute right-2.5 flex size-7 items-center justify-center rounded-full bg-white/90 text-stone-600 shadow-md transition-colors hover:bg-white hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-leaf-500 focus-visible:outline-none"
		onclick={showSources}
	>
		<Info class="size-4" />
	</button>
</div>

<Dialog bind:open={sourcesOpen} title={t`Map sources`}>
	{#if attributions.length === 0}
		<p class="text-sm text-stone-500">{t`No sources to credit for this map.`}</p>
	{/if}
	<ul class="space-y-2 text-sm text-stone-700 [&_a]:text-leaf-700 [&_a]:underline">
		{#each attributions as attribution (attribution)}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- the same markup maplibre would render -->
			<li>{@html attribution}</li>
		{/each}
	</ul>
</Dialog>

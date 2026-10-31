import type { FeatureCollection, LineString, Point, Polygon } from 'geojson';
import type { Map, StyleSpecification } from 'maplibre-gl';
import type { Basemap } from '#lib/basemaps.ts';
import { circleRing } from '#lib/geo.ts';
import { formatMeters } from '#lib/growth.ts';
import type { Conflict, PlannedTree, Sized } from '#lib/plan.ts';
import { treeName } from '#lib/plan.ts';

export interface MapView {
	lng: number;
	lat: number;
	zoom: number;
}

/**
 * Used when no vector style base map is configured, so the tree labels still have glyphs
 * and raster base maps something to sit on.
 */
export const BLANK_STYLE: StyleSpecification = {
	version: 8,
	glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
	sources: {},
	layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#e7e5e4' } }]
};

/** The vector style to load: the selected one, or the first style below a raster base map. */
export function styleFor(active: Basemap | null, basemaps: Basemap[]) {
	if (active?.kind === 'style') return active;
	return basemaps.find((b) => b.kind === 'style') ?? null;
}

const FONT = ['Noto Sans Regular'];
const CONFLICT_COLOR = '#dc2626';

export const SOURCES = {
	mature: 'plantmap-mature',
	canopy: 'plantmap-canopy',
	trunks: 'plantmap-trunks',
	conflicts: 'plantmap-conflicts'
} as const;

/** Layers that react to clicks, topmost first. */
export const TRUNK_LAYER = 'plantmap-trunk';
export const CANOPY_LAYER = 'plantmap-canopy-fill';
export const MATURE_LAYER = 'plantmap-mature-line';

const empty = (): FeatureCollection => ({ type: 'FeatureCollection', features: [] });

export function addTreeLayers(map: Map) {
	for (const id of Object.values(SOURCES)) {
		map.addSource(id, { type: 'geojson', data: empty() });
	}

	map.addLayer({
		id: MATURE_LAYER,
		type: 'line',
		source: SOURCES.mature,
		paint: {
			'line-color': '#57534e',
			'line-width': 1,
			'line-opacity': 0.6,
			'line-dasharray': [2, 2]
		}
	});
	map.addLayer({
		id: CANOPY_LAYER,
		type: 'fill',
		source: SOURCES.canopy,
		paint: {
			'fill-color': ['get', 'color'],
			'fill-opacity': ['case', ['get', 'selected'], 0.55, ['get', 'planted'], 0.35, 0.15]
		}
	});
	const outlineColor = [
		'case',
		['get', 'conflict'],
		CONFLICT_COLOR,
		['get', 'selected'],
		'#1c1917',
		['get', 'color']
	] as const;
	const outlineWidth = ['case', ['get', 'selected'], 3, ['get', 'conflict'], 2.5, 1.5] as const;
	map.addLayer({
		id: 'plantmap-canopy-line',
		type: 'line',
		source: SOURCES.canopy,
		filter: ['==', ['get', 'planted'], true],
		paint: { 'line-color': outlineColor as never, 'line-width': outlineWidth as never }
	});
	map.addLayer({
		id: 'plantmap-canopy-line-planned',
		type: 'line',
		source: SOURCES.canopy,
		filter: ['==', ['get', 'planted'], false],
		paint: {
			'line-color': outlineColor as never,
			'line-width': outlineWidth as never,
			'line-dasharray': [3, 2]
		}
	});
	map.addLayer({
		id: 'plantmap-conflict-line',
		type: 'line',
		source: SOURCES.conflicts,
		paint: { 'line-color': CONFLICT_COLOR, 'line-width': 2, 'line-dasharray': [1, 1.5] }
	});
	map.addLayer({
		id: 'plantmap-conflict-label',
		type: 'symbol',
		source: SOURCES.conflicts,
		layout: {
			'symbol-placement': 'line-center',
			'text-field': ['get', 'label'],
			'text-font': FONT,
			'text-size': 12,
			'text-allow-overlap': true
		},
		paint: { 'text-color': CONFLICT_COLOR, 'text-halo-color': '#fff', 'text-halo-width': 2 }
	});
	map.addLayer({
		id: TRUNK_LAYER,
		type: 'circle',
		source: SOURCES.trunks,
		paint: {
			'circle-radius': ['case', ['get', 'selected'], 7, 5],
			'circle-color': '#fff',
			'circle-stroke-color': ['get', 'color'],
			'circle-stroke-width': ['case', ['get', 'selected'], 4, 2.5]
		}
	});
	map.addLayer({
		id: 'plantmap-trunk-label',
		type: 'symbol',
		source: SOURCES.trunks,
		minzoom: 16,
		layout: {
			'text-field': ['get', 'label'],
			'text-font': FONT,
			'text-size': 12,
			'text-offset': [0, 1.2],
			'text-anchor': 'top',
			'text-optional': true
		},
		paint: { 'text-color': '#1c1917', 'text-halo-color': '#fff', 'text-halo-width': 1.5 }
	});
}

const rasterLayer = (basemap: Basemap) => `plantmap-basemap-${basemap.id}`;

/** Layers of the loaded vector style that would cover raster base maps. */
export interface StyleCover {
	/** fills, lines etc. drawn above the raster */
	shapes: string[];
	labels: string[];
}

/**
 * Adds every raster base map below the first label layer of the loaded vector style,
 * so street and place names can stay readable on top of photos. Only `active` starts visible:
 * a raster layer shown later, before the map's first load, doesn't fetch tiles until it moves.
 */
export function addRasterBasemaps(
	map: Map,
	basemaps: Basemap[],
	active: Basemap | null
): StyleCover {
	const layers = map.getStyle().layers.filter((l) => l.layout?.visibility !== 'none');
	const firstLabel = layers.findIndex((l) => l.type === 'symbol');
	const before = firstLabel === -1 ? undefined : layers[firstLabel].id;

	for (const basemap of basemaps) {
		if (basemap.kind !== 'raster') continue;
		const id = rasterLayer(basemap);
		map.addSource(id, {
			type: 'raster',
			tiles: [basemap.url],
			tileSize: basemap.tileSize,
			maxzoom: basemap.maxZoom ?? 22,
			attribution: basemap.attribution ?? undefined
		});
		const visibility = basemap.id === active?.id ? 'visible' : 'none';
		map.addLayer({ id, type: 'raster', source: id, layout: { visibility } }, before);
	}

	return {
		shapes:
			firstLabel === -1
				? []
				: layers
						.slice(firstLabel)
						.filter((l) => l.type !== 'symbol')
						.map((l) => l.id),
		labels: layers.filter((l) => l.type === 'symbol').map((l) => l.id)
	};
}

export function setBasemap(
	map: Map,
	active: Basemap | null,
	basemaps: Basemap[],
	cover: StyleCover
) {
	const imagery = active?.kind === 'raster';
	// base maps added after the style loaded have no layer yet
	const show = (id: string, visible: boolean) =>
		map.getLayer(id) && map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');

	for (const basemap of basemaps) {
		if (basemap.kind === 'raster') show(rasterLayer(basemap), basemap.id === active?.id);
	}
	// the style draws e.g. buildings above the raster layer, which would cover roofs from z13 on
	for (const id of cover.shapes) show(id, !imagery);
	for (const id of cover.labels) show(id, !imagery || active.labels);

	// the dark dashed outline vanishes on photos, switch to a light one
	map.setPaintProperty(MATURE_LAYER, 'line-color', imagery ? '#fafaf9' : '#57534e');
	map.setPaintProperty(MATURE_LAYER, 'line-opacity', imagery ? 0.9 : 0.6);
	map.setPaintProperty(MATURE_LAYER, 'line-width', imagery ? 1.5 : 1);
}

export function setMatureVisible(map: Map, visible: boolean) {
	map.setLayoutProperty(MATURE_LAYER, 'visibility', visible ? 'visible' : 'none');
}

export function treeData<T extends PlannedTree>(
	trees: Sized<T>[],
	conflicts: Conflict<T>[],
	selectedId: string | null
) {
	const conflicting = new Set(conflicts.flatMap((c) => [c.a.id, c.b.id]));

	const canopy: FeatureCollection<Polygon> = {
		type: 'FeatureCollection',
		features: trees.map((t) => ({
			type: 'Feature',
			properties: {
				id: t.id,
				color: t.color,
				planted: t.size.planted,
				conflict: conflicting.has(t.id),
				selected: t.id === selectedId
			},
			geometry: { type: 'Polygon', coordinates: [circleRing([t.lng, t.lat], t.size.spread / 2)] }
		}))
	};

	const mature: FeatureCollection<Polygon> = {
		type: 'FeatureCollection',
		features: trees.map((t) => ({
			type: 'Feature',
			properties: { id: t.id },
			geometry: { type: 'Polygon', coordinates: [circleRing([t.lng, t.lat], t.matureSpread / 2)] }
		}))
	};

	const trunks: FeatureCollection<Point> = {
		type: 'FeatureCollection',
		features: trees.map((t) => ({
			type: 'Feature',
			properties: { id: t.id, color: t.color, label: treeName(t), selected: t.id === selectedId },
			geometry: { type: 'Point', coordinates: [t.lng, t.lat] }
		}))
	};

	const lines: FeatureCollection<LineString> = {
		type: 'FeatureCollection',
		features: conflicts.map((c) => ({
			type: 'Feature',
			properties: { label: `−${formatMeters(c.overlap)}` },
			geometry: {
				type: 'LineString',
				coordinates: [
					[c.a.lng, c.a.lat],
					[c.b.lng, c.b.lat]
				]
			}
		}))
	};

	return { canopy, mature, trunks, conflicts: lines };
}

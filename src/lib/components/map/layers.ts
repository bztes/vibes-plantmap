import type { FeatureCollection, Point, Polygon } from 'geojson';
import type { Map, StyleSpecification, SymbolLayerSpecification } from 'maplibre-gl';
import type { Basemap } from '#lib/basemaps.ts';
import { circleRing } from '#lib/geo.ts';
import type { PlannedTree, Sized } from '#lib/plan.ts';
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

/** OpenFreeMap serves it, and so do the vector styles it hosts */
const FONT = ['Noto Sans Bold'];
const INK = '#1c1917';
const PAPER = '#ffffff';

/** the dotted mature outline: dark on maps, light on photos where the dark one vanishes */
const MATURE_PAINT = {
	ground: { color: '#57534e', opacity: 0.55, width: 1.5 },
	imagery: { color: '#fafaf9', opacity: 0.9, width: 2 }
};

export const SOURCES = {
	mature: 'plantmap-mature',
	canopy: 'plantmap-canopy',
	trunks: 'plantmap-trunks'
} as const;

/** Layers that react to clicks, topmost first. */
export const TRUNK_LAYER = 'plantmap-trunk';
export const CANOPY_LAYER = 'plantmap-canopy-fill';
export const MATURE_LAYER = 'plantmap-mature-line';

/** label background fills, by kind */
const PILL_FILLS = { light: PAPER, dark: INK };
type PillKind = keyof typeof PILL_FILLS;
const pill = (kind: PillKind) => `plantmap-pill-${kind}`;
/** wraps a pill image around a symbol's text, matching the `content` box in `pillImage` */
const PILL_FIT = {
	'icon-text-fit': 'both',
	'icon-text-fit-padding': [1, 2, 1, 2]
} satisfies SymbolLayerSpecification['layout'];

const empty = (): FeatureCollection => ({ type: 'FeatureCollection', features: [] });

/**
 * A rounded label background with a soft drop shadow, stretchable so `icon-text-fit`
 * can wrap it around any text.
 */
function pillImage(fill: string): { image: ImageData; options: Parameters<Map['addImage']>[2] } {
	const ratio = 2;
	const px = (v: number) => v * ratio;
	// logical px: shadow margin around a 24×20 rounded rectangle
	const [w, h, mx, my, r] = [32, 28, 4, 3, 10];
	const canvas = document.createElement('canvas');
	canvas.width = px(w);
	canvas.height = px(h);
	const ctx = canvas.getContext('2d')!;
	ctx.scale(ratio, ratio);
	ctx.shadowColor = 'rgba(28, 25, 23, 0.28)';
	ctx.shadowBlur = 4;
	ctx.shadowOffsetY = 1;
	ctx.fillStyle = fill;
	ctx.beginPath();
	ctx.roundRect(mx, my, w - 2 * mx, h - 2 * my - 1, r);
	ctx.fill();
	return {
		image: ctx.getImageData(0, 0, canvas.width, canvas.height),
		options: {
			pixelRatio: ratio,
			stretchX: [[px(mx + r), px(w - mx - r)]],
			stretchY: [[px(my + r - 1), px(my + r + 1)]],
			content: [px(mx + 7), px(my + 3), px(w - mx - 7), px(h - my - 4)]
		}
	};
}

/** drawn once: every style switch drops the map's images, and they are re-added from here */
const pillImages: Partial<Record<PillKind, ReturnType<typeof pillImage>>> = {};

function addImages(map: Map) {
	for (const kind of Object.keys(PILL_FILLS) as PillKind[]) {
		if (map.hasImage(pill(kind))) continue;
		const { image, options } = (pillImages[kind] ??= pillImage(PILL_FILLS[kind]));
		map.addImage(pill(kind), image, options);
	}
}

export function addTreeLayers(map: Map) {
	addImages(map);
	for (const id of Object.values(SOURCES)) {
		map.addSource(id, { type: 'geojson', data: empty() });
	}

	/** dots instead of dashes: zero-length dashes with round caps */
	const dotted = (gap: number) => [0, gap] as never;
	/** e.g. the old spot of a tree that is being moved */
	const fadedOpacity = ['case', ['get', 'faded'], 0.3, 1] as const;

	map.addLayer({
		id: MATURE_LAYER,
		type: 'line',
		source: SOURCES.mature,
		layout: { 'line-cap': 'round', 'line-join': 'round' },
		paint: {
			'line-color': MATURE_PAINT.ground.color,
			'line-width': MATURE_PAINT.ground.width,
			'line-opacity': MATURE_PAINT.ground.opacity,
			'line-dasharray': dotted(2.5)
		}
	});
	// soft shadow that lifts the crowns off the ground
	map.addLayer({
		id: 'plantmap-canopy-shadow',
		type: 'line',
		source: SOURCES.canopy,
		filter: ['!', ['get', 'faded']],
		paint: {
			'line-color': INK,
			'line-width': 6,
			'line-blur': 6,
			'line-opacity': 0.18,
			'line-translate': [0, 2]
		}
	});
	map.addLayer({
		id: CANOPY_LAYER,
		type: 'fill',
		source: SOURCES.canopy,
		paint: {
			'fill-color': ['get', 'color'],
			'fill-opacity': ['case', ['get', 'faded'], 0.06, ['get', 'selected'], 0.5, 0.32]
		}
	});
	const outlineWidth = ['case', ['get', 'selected'], 3, 2] as const;
	// glow around the selected crown
	map.addLayer({
		id: 'plantmap-canopy-glow',
		type: 'line',
		source: SOURCES.canopy,
		filter: ['==', ['get', 'selected'], true],
		paint: {
			'line-color': ['get', 'color'],
			'line-width': 14,
			'line-blur': 10,
			'line-opacity': 0.55
		}
	});
	// white ring under the selected outline, so it reads on any ground
	map.addLayer({
		id: 'plantmap-canopy-ring',
		type: 'line',
		source: SOURCES.canopy,
		filter: ['==', ['get', 'selected'], true],
		layout: { 'line-join': 'round' },
		paint: { 'line-color': PAPER, 'line-width': 6, 'line-opacity': 0.9 }
	});
	map.addLayer({
		id: 'plantmap-canopy-line',
		type: 'line',
		source: SOURCES.canopy,
		layout: { 'line-join': 'round' },
		paint: {
			'line-color': ['get', 'color'],
			'line-width': outlineWidth as never,
			'line-opacity': fadedOpacity as never
		}
	});
	map.addLayer({
		id: 'plantmap-trunk-shadow',
		type: 'circle',
		source: SOURCES.trunks,
		filter: ['!', ['get', 'faded']],
		paint: {
			'circle-radius': ['case', ['get', 'selected'], 11, 8],
			'circle-color': INK,
			'circle-opacity': 0.3,
			'circle-blur': 0.8,
			'circle-translate': [0, 1.5]
		}
	});
	map.addLayer({
		id: TRUNK_LAYER,
		type: 'circle',
		source: SOURCES.trunks,
		paint: {
			'circle-radius': ['case', ['get', 'selected'], 7, 5],
			'circle-color': ['get', 'color'],
			'circle-stroke-color': PAPER,
			'circle-stroke-width': ['case', ['get', 'selected'], 3, 2],
			'circle-opacity': fadedOpacity as never,
			'circle-stroke-opacity': fadedOpacity as never
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
			'text-size': 11,
			'text-letter-spacing': 0.02,
			'text-max-width': 12,
			'text-offset': [0, 1.5],
			'text-anchor': 'top',
			'icon-image': ['case', ['get', 'selected'], pill('dark'), pill('light')] as never,
			...PILL_FIT,
			// the selected tree's label wins over its neighbours'
			'symbol-sort-key': ['case', ['get', 'selected'], 0, 1] as never
		},
		paint: {
			'text-color': ['case', ['get', 'selected'], PAPER, INK] as never,
			'text-opacity': fadedOpacity as never,
			'icon-opacity': fadedOpacity as never
		}
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

	const mature = MATURE_PAINT[imagery ? 'imagery' : 'ground'];
	map.setPaintProperty(MATURE_LAYER, 'line-color', mature.color);
	map.setPaintProperty(MATURE_LAYER, 'line-opacity', mature.opacity);
	map.setPaintProperty(MATURE_LAYER, 'line-width', mature.width);
}

export function setMatureVisible(map: Map, visible: boolean) {
	map.setLayoutProperty(MATURE_LAYER, 'visibility', visible ? 'visible' : 'none');
}

export function treeData<T extends PlannedTree>(
	trees: Sized<T>[],
	selectedId: string | null,
	/** tree drawn transparent, e.g. at its old spot while it's being moved */
	fadedId: string | null = null
) {
	const canopy: FeatureCollection<Polygon> = {
		type: 'FeatureCollection',
		features: trees.map((t) => ({
			type: 'Feature',
			properties: {
				id: t.id,
				color: t.color,
				selected: t.id === selectedId,
				faded: t.id === fadedId
			},
			geometry: { type: 'Polygon', coordinates: [circleRing([t.lng, t.lat], t.size.spread / 2)] }
		}))
	};

	const mature: FeatureCollection<Polygon> = {
		type: 'FeatureCollection',
		features: trees
			.filter((t) => t.id !== fadedId)
			.map((t) => ({
				type: 'Feature',
				properties: { id: t.id },
				geometry: { type: 'Polygon', coordinates: [circleRing([t.lng, t.lat], t.matureSpread / 2)] }
			}))
	};

	const trunks: FeatureCollection<Point> = {
		type: 'FeatureCollection',
		features: trees.map((t) => ({
			type: 'Feature',
			properties: {
				id: t.id,
				color: t.color,
				label: treeName(t),
				selected: t.id === selectedId,
				faded: t.id === fadedId
			},
			geometry: { type: 'Point', coordinates: [t.lng, t.lat] }
		}))
	};

	return { canopy, mature, trunks };
}

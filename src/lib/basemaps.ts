export type BasemapKind = 'style' | 'raster';

export interface BasemapConfig {
	name: string;
	kind: BasemapKind;
	url: string;
	attribution: string | null;
	tileSize: number;
	maxZoom: number | null;
	labels: boolean;
}

export interface Basemap extends BasemapConfig {
	id: string;
	isDefault: boolean;
}

export interface BasemapPreset extends BasemapConfig {
	id: string;
	/** added by "Add default maps" */
	recommended: boolean;
}

/** Ready-made base maps admins can add with one click. None of them need an API key. */
export const BASEMAP_PRESETS: BasemapPreset[] = [
	{
		id: 'openfreemap-liberty',
		name: 'Map',
		kind: 'style',
		url: 'https://tiles.openfreemap.org/styles/liberty',
		attribution: null,
		tileSize: 512,
		maxZoom: null,
		labels: false,
		recommended: true
	},
	{
		id: 'esri-world-imagery',
		name: 'Aerial',
		kind: 'raster',
		// blankTile=false turns Esri's grey "Map data not yet available" placeholder into a 404,
		// so MapLibre falls back to upscaling the nearest parent tile that does have imagery
		url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?blankTile=false',
		attribution:
			'Imagery © <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics, and the GIS User Community',
		tileSize: 256,
		maxZoom: 19,
		labels: true,
		recommended: true
	},
	{
		id: 'openfreemap-positron',
		name: 'Light',
		kind: 'style',
		url: 'https://tiles.openfreemap.org/styles/positron',
		attribution: null,
		tileSize: 512,
		maxZoom: null,
		labels: false,
		recommended: false
	},
	{
		id: 'openfreemap-bright',
		name: 'Bright',
		kind: 'style',
		url: 'https://tiles.openfreemap.org/styles/bright',
		attribution: null,
		tileSize: 512,
		maxZoom: null,
		labels: false,
		recommended: false
	},
	{
		id: 'osm-standard',
		name: 'OpenStreetMap',
		kind: 'raster',
		url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
		attribution:
			'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		tileSize: 256,
		maxZoom: 19,
		labels: false,
		recommended: false
	}
];

/** The base map a plan opens with when the browser hasn't remembered a choice. */
export function defaultBasemap<T extends Basemap>(basemaps: T[]) {
	return basemaps.find((b) => b.isDefault) ?? basemaps[0] ?? null;
}

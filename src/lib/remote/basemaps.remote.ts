import { error } from '@sveltejs/kit';
import { command, form, query } from '$app/server';
import { asc, eq, max, ne } from 'drizzle-orm';
import * as v from 'valibot';
import { BASEMAP_PRESETS, type Basemap } from '#lib/basemaps.ts';
import { db } from '#lib/server/db/index.ts';
import { BASEMAP_KINDS, basemap } from '#lib/server/db/schema.ts';
import { requireAdmin } from '#lib/server/guards.ts';
import { t } from '#lib/i18n/index.ts';

/** Enabled base maps in display order, for the plan map. Public, shared plans can be viewed signed out. */
export const getBasemaps = query(async (): Promise<Basemap[]> => {
	return db
		.select({
			id: basemap.id,
			name: basemap.name,
			kind: basemap.kind,
			url: basemap.url,
			attribution: basemap.attribution,
			tileSize: basemap.tileSize,
			maxZoom: basemap.maxZoom,
			labels: basemap.labels,
			isDefault: basemap.isDefault
		})
		.from(basemap)
		.where(eq(basemap.enabled, true))
		.orderBy(asc(basemap.position), asc(basemap.createdAt));
});

export const getAdminBasemaps = query(async () => {
	requireAdmin();
	return db.select().from(basemap).orderBy(asc(basemap.position), asc(basemap.createdAt));
});

async function refreshAll() {
	await Promise.all([getAdminBasemaps().refresh(), getBasemaps().refresh()]);
}

async function nextPosition() {
	const [row] = await db.select({ value: max(basemap.position) }).from(basemap);
	return (row?.value ?? -1) + 1;
}

export const saveBasemap = form(
	v.pipe(
		v.object({
			id: v.optional(v.string()),
			name: v.pipe(
				v.string(),
				v.trim(),
				v.minLength(1, () => t`Name is required`),
				v.maxLength(40)
			),
			kind: v.picklist(BASEMAP_KINDS),
			url: v.pipe(
				v.string(),
				v.trim(),
				v.url(() => t`Enter a valid URL`),
				v.maxLength(1000)
			),
			attribution: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500))),
			tileSize: v.optional(v.picklist(['256', '512']), '256'),
			maxZoom: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(24))),
			labels: v.optional(v.boolean(), false)
		}),
		v.forward(
			v.check(
				(d) => d.kind !== 'raster' || ['{z}', '{x}', '{y}'].every((p) => d.url.includes(p)),
				() => t`Tile URLs need {z}, {x} and {y} placeholders`
			),
			['url']
		)
	),
	async ({ id, tileSize, ...data }) => {
		requireAdmin();
		const raster = data.kind === 'raster';
		const values = {
			...data,
			tileSize: Number(tileSize),
			attribution: (raster && data.attribution) || null,
			maxZoom: raster ? (data.maxZoom ?? null) : null,
			labels: raster && data.labels
		};
		if (id) {
			const updated = await db.update(basemap).set(values).where(eq(basemap.id, id)).returning();
			if (updated.length === 0) error(404, t`Base map not found`);
		} else {
			await db.insert(basemap).values({ ...values, position: await nextPosition() });
		}
		await refreshAll();
		return { saved: data.name };
	}
);

/** Adds presets from `BASEMAP_PRESETS`; the first one becomes default if none is set yet. */
export const addBasemapPresets = command(v.array(v.string()), async (ids) => {
	requireAdmin();
	const presets = BASEMAP_PRESETS.filter((p) => ids.includes(p.id));
	if (presets.length === 0) error(400, t`Unknown preset`);
	const hasDefault = await db.query.basemap.findFirst({ where: eq(basemap.isDefault, true) });
	let position = await nextPosition();
	await db.insert(basemap).values(
		presets.map((preset, i) => ({
			name: preset.name,
			kind: preset.kind,
			url: preset.url,
			attribution: preset.attribution,
			tileSize: preset.tileSize,
			maxZoom: preset.maxZoom,
			labels: preset.labels,
			position: position++,
			isDefault: !hasDefault && i === 0
		}))
	);
	await refreshAll();
});

export const setBasemapEnabled = command(
	v.object({ id: v.string(), enabled: v.boolean() }),
	async ({ id, enabled }) => {
		requireAdmin();
		await db.update(basemap).set({ enabled }).where(eq(basemap.id, id));
		await refreshAll();
	}
);

export const setDefaultBasemap = command(v.string(), async (id) => {
	requireAdmin();
	await db.transaction(async (tx) => {
		await tx.update(basemap).set({ isDefault: false }).where(ne(basemap.id, id));
		await tx.update(basemap).set({ isDefault: true, enabled: true }).where(eq(basemap.id, id));
	});
	await refreshAll();
});

/** Swaps a base map with its neighbor in the display order. */
export const moveBasemap = command(
	v.object({ id: v.string(), direction: v.picklist(['up', 'down']) }),
	async ({ id, direction }) => {
		requireAdmin();
		const rows = await db
			.select({ id: basemap.id })
			.from(basemap)
			.orderBy(asc(basemap.position), asc(basemap.createdAt));
		const from = rows.findIndex((r) => r.id === id);
		const to = from + (direction === 'up' ? -1 : 1);
		if (from === -1 || to < 0 || to >= rows.length) return;
		[rows[from], rows[to]] = [rows[to], rows[from]];
		// renumber everything, positions may contain gaps or duplicates
		await db.transaction(async (tx) => {
			for (const [position, row] of rows.entries()) {
				await tx.update(basemap).set({ position }).where(eq(basemap.id, row.id));
			}
		});
		await refreshAll();
	}
);

export const deleteBasemap = command(v.string(), async (id) => {
	requireAdmin();
	await db.delete(basemap).where(eq(basemap.id, id));
	await refreshAll();
});

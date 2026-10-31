import { error } from '@sveltejs/kit';
import { command, form, query } from '$app/server';
import { and, eq, isNull, or } from 'drizzle-orm';
import * as v from 'valibot';
import { db } from '#lib/server/db/index.ts';
import { species, tree } from '#lib/server/db/schema.ts';
import { getPlanAccess } from '#lib/server/access.ts';
import { requireUser } from '#lib/server/guards.ts';
import { localizedName } from '#lib/server/species.ts';
import { t } from '#lib/i18n/index.ts';

/** Trees of a plan, `planRef` is a plan id or share link token (see `getPlanAccess`). */
export const getTrees = query(v.string(), async (planRef) => {
	const { plan } = await getPlanAccess(planRef);
	const rows = await db
		.select({ tree, species })
		.from(tree)
		.innerJoin(species, eq(species.id, tree.speciesId))
		.where(eq(tree.planId, plan.id));

	return rows.map(({ tree: t, species: s }) => ({
		...t,
		speciesName: localizedName(s),
		category: s.category,
		color: s.color,
		matureHeight: t.matureHeightOverride ?? s.matureHeight,
		matureSpread: t.matureSpreadOverride ?? s.matureSpread,
		yearsToMaturity: s.yearsToMaturity
	}));
});

export type TreeRow = Awaited<ReturnType<typeof getTrees>>[number];

/** Shared species, the user's own and those of the plan owner can be used in a plan. */
async function assertSpeciesVisible(speciesId: string, planOwnerId: string) {
	const user = requireUser();
	const row = await db.query.species.findFirst({
		where: and(
			eq(species.id, speciesId),
			or(isNull(species.ownerId), eq(species.ownerId, user.id), eq(species.ownerId, planOwnerId))
		)
	});
	if (!row) error(400, t`Unknown species`);
	return row;
}

async function getEditableTree(id: string, planRef: string) {
	const { plan } = await getPlanAccess(planRef, 'edit');
	const row = await db.query.tree.findFirst({
		where: and(eq(tree.id, id), eq(tree.planId, plan.id))
	});
	if (!row) error(404, t`Tree not found`);
	return { tree: row, plan };
}

const isoDate = v.pipe(
	v.string(),
	v.isoDate(() => t`Use a valid date`)
);
const meters = (max: number) =>
	v.pipe(
		v.number(() => t`Required`),
		v.minValue(0),
		v.maxValue(max)
	);
const optionalMeters = (max: number) =>
	v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(max)));

export const createTree = command(
	v.object({
		planRef: v.string(),
		speciesId: v.string(),
		label: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(80))),
		lng: v.number(),
		lat: v.number(),
		plantedAt: isoDate
	}),
	async ({ planRef, ...data }) => {
		const { plan } = await getPlanAccess(planRef, 'edit');
		const s = await assertSpeciesVisible(data.speciesId, plan.ownerId);
		const [created] = await db
			.insert(tree)
			.values({
				...data,
				planId: plan.id,
				label: data.label || null,
				// young nursery trees: ~10% of mature height, at least 1 m
				heightAtPlanting: Math.max(1, Math.round(s.matureHeight * 0.1 * 10) / 10),
				spreadAtPlanting: Math.max(0.3, Math.round(s.matureSpread * 0.08 * 10) / 10)
			})
			.returning({ id: tree.id });
		await getTrees(planRef).refresh();
		return created.id;
	}
);

export const moveTree = command(
	v.object({ id: v.string(), planRef: v.string(), lng: v.number(), lat: v.number() }),
	async ({ id, planRef, lng, lat }) => {
		await getEditableTree(id, planRef);
		await db.update(tree).set({ lng, lat }).where(eq(tree.id, id));
		await getTrees(planRef).refresh();
	}
);

export const updateTree = form(
	v.object({
		id: v.string(),
		planRef: v.string(),
		speciesId: v.string(),
		label: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(80))),
		plantedAt: isoDate,
		heightAtPlanting: meters(150),
		spreadAtPlanting: meters(100),
		matureHeightOverride: optionalMeters(150),
		matureSpreadOverride: optionalMeters(100),
		notes: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(2000)))
	}),
	async ({ id, planRef, ...data }) => {
		const { plan } = await getEditableTree(id, planRef);
		await assertSpeciesVisible(data.speciesId, plan.ownerId);
		await db
			.update(tree)
			.set({
				...data,
				label: data.label || null,
				notes: data.notes || null,
				matureHeightOverride: data.matureHeightOverride ?? null,
				matureSpreadOverride: data.matureSpreadOverride ?? null
			})
			.where(eq(tree.id, id));
		await getTrees(planRef).refresh();
		return { saved: true };
	}
);

export const deleteTree = command(
	v.object({ id: v.string(), planRef: v.string() }),
	async ({ id, planRef }) => {
		await getEditableTree(id, planRef);
		await db.delete(tree).where(eq(tree.id, id));
		await getTrees(planRef).refresh();
	}
);

import { error } from '@sveltejs/kit';
import { command, form, query } from '$app/server';
import { and, asc, eq, isNull, or } from 'drizzle-orm';
import * as v from 'valibot';
import { db } from '#lib/server/db/index.ts';
import { species, tree, treeMeasurement } from '#lib/server/db/schema.ts';
import { getPlanAccess } from '#lib/server/access.ts';
import { requireUser } from '#lib/server/guards.ts';
import { localizedName } from '#lib/server/species.ts';
import { t } from '@bztes/vibes-t0n';
import { fitGrowth, growthStart, nurserySize } from '#lib/growth.ts';

/** Trees of a plan, `planRef` is a plan id or share link token (see `getPlanAccess`). */
export const getTrees = query(v.string(), async (planRef) => {
	const { plan } = await getPlanAccess(planRef);
	const rows = await db
		.select({ tree, species })
		.from(tree)
		.innerJoin(species, eq(species.id, tree.speciesId))
		.where(eq(tree.planId, plan.id));
	const measured = await db
		.select({
			id: treeMeasurement.id,
			treeId: treeMeasurement.treeId,
			measuredAt: treeMeasurement.measuredAt,
			height: treeMeasurement.height,
			spread: treeMeasurement.spread
		})
		.from(treeMeasurement)
		.innerJoin(tree, eq(tree.id, treeMeasurement.treeId))
		.where(eq(tree.planId, plan.id))
		.orderBy(asc(treeMeasurement.measuredAt), asc(treeMeasurement.createdAt));
	const byTree = Map.groupBy(measured, (m) => m.treeId);

	return rows.map(({ tree: t, species: s }) => {
		const measurements = byTree.get(t.id) ?? [];
		const mature = {
			matureHeight: t.matureHeightOverride ?? s.matureHeight,
			matureSpread: t.matureSpreadOverride ?? s.matureSpread
		};
		const growth = {
			...t,
			...mature,
			yearsToMaturity: s.yearsToMaturity,
			...growthStart(measurements, mature, isoDay(t.createdAt))
		};
		return {
			...growth,
			speciesName: localizedName(s),
			category: s.category,
			color: s.color,
			measurements,
			...fitGrowth(growth, measurements)
		};
	});
});

function isoDay(date: Date) {
	return date.toISOString().slice(0, 10);
}

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
const optionalMeters = (max: number) =>
	v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(max)));

export const createTree = command(
	v.object({
		planRef: v.string(),
		speciesId: v.string(),
		label: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(80))),
		lng: v.number(),
		lat: v.number()
	}),
	async ({ planRef, ...data }) => {
		const { plan } = await getPlanAccess(planRef, 'edit');
		const s = await assertSpeciesVisible(data.speciesId, plan.ownerId);
		const id = await db.transaction(async (tx) => {
			const [created] = await tx
				.insert(tree)
				.values({ ...data, planId: plan.id, label: data.label || null })
				.returning({ id: tree.id });
			// a new tree starts as a typical nursery tree, a real measurement can replace it
			await tx.insert(treeMeasurement).values({
				treeId: created.id,
				measuredAt: isoDay(new Date()),
				...nurserySize(s.matureHeight, s.matureSpread)
			});
			return created.id;
		});
		await getTrees(planRef).refresh();
		return id;
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

/** Changes some of a tree's details, each field left out stays as it is. */
export const patchTree = command(
	v.object({
		id: v.string(),
		planRef: v.string(),
		speciesId: v.optional(v.string()),
		label: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(80))),
		notes: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(2000)))
	}),
	async ({ id, planRef, speciesId, label, notes }) => {
		const { plan } = await getEditableTree(id, planRef);
		if (speciesId !== undefined) await assertSpeciesVisible(speciesId, plan.ownerId);
		await db
			.update(tree)
			.set({
				...(speciesId !== undefined && { speciesId }),
				...(label !== undefined && { label: label || null }),
				...(notes !== undefined && { notes: notes || null })
			})
			.where(eq(tree.id, id));
		await getTrees(planRef).refresh();
	}
);

/** Mature size of a single tree, e.g. on a dwarf rootstock; empty fields use the species size. */
export const updateMatureSize = form(
	v.object({
		id: v.string(),
		planRef: v.string(),
		matureHeightOverride: optionalMeters(150),
		matureSpreadOverride: optionalMeters(100)
	}),
	async ({ id, planRef, matureHeightOverride, matureSpreadOverride }) => {
		await getEditableTree(id, planRef);
		await db
			.update(tree)
			.set({
				matureHeightOverride: matureHeightOverride ?? null,
				matureSpreadOverride: matureSpreadOverride ?? null
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

/** today as ISO date, a day ahead so measurements entered in time zones east of UTC pass */
function latestMeasurementDate() {
	return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export const addMeasurement = form(
	v.pipe(
		v.object({
			treeId: v.string(),
			planRef: v.string(),
			measuredAt: v.pipe(
				isoDate,
				v.check(
					(date) => date <= latestMeasurementDate(),
					() => t`Can't be in the future`
				)
			),
			height: optionalMeters(150),
			spread: optionalMeters(100)
		}),
		v.forward(
			v.check(
				(data) => data.height !== undefined || data.spread !== undefined,
				() => t`Enter the height, the crown or both`
			),
			['height']
		)
	),
	async ({ treeId, planRef, measuredAt, height, spread }) => {
		await getEditableTree(treeId, planRef);
		await db
			.insert(treeMeasurement)
			.values({ treeId, measuredAt, height: height ?? null, spread: spread ?? null });
		await getTrees(planRef).refresh();
		return { saved: true };
	}
);

export const deleteMeasurement = command(
	v.object({ id: v.string(), treeId: v.string(), planRef: v.string() }),
	async ({ id, treeId, planRef }) => {
		await getEditableTree(treeId, planRef);
		const count = await db.$count(treeMeasurement, eq(treeMeasurement.treeId, treeId));
		// the first measurement is where the growth curve starts, so one has to stay
		if (count <= 1) error(400, t`A tree needs at least one measurement`);
		await db
			.delete(treeMeasurement)
			.where(and(eq(treeMeasurement.id, id), eq(treeMeasurement.treeId, treeId)));
		await getTrees(planRef).refresh();
	}
);

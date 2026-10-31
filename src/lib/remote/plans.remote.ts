import { redirect } from '@sveltejs/kit';
import { command, form, query } from '$app/server';
import { count, desc, eq } from 'drizzle-orm';
import * as v from 'valibot';
import { db } from '#lib/server/db/index.ts';
import { plan, tree, user as userTable } from '#lib/server/db/schema.ts';
import { getOwnedPlan, getPlanAccess } from '#lib/server/access.ts';
import { requireUser } from '#lib/server/guards.ts';
import { t } from '#lib/i18n/index.ts';

export const getPlans = query(async () => {
	const user = requireUser();
	return db
		.select({
			id: plan.id,
			name: plan.name,
			description: plan.description,
			createdAt: plan.createdAt,
			treeCount: count(tree.id)
		})
		.from(plan)
		.leftJoin(tree, eq(tree.planId, plan.id))
		.where(eq(plan.ownerId, user.id))
		.groupBy(plan.id)
		.orderBy(desc(plan.createdAt));
});

/** A plan by id (own plans) or share link token, with the access the current user has. */
export const getPlan = query(v.string(), async (ref) => {
	const { plan: row, role } = await getPlanAccess(ref);
	const owner = await db.query.user.findFirst({
		where: eq(userTable.id, row.ownerId),
		columns: { name: true }
	});
	return {
		id: row.id,
		name: row.name,
		description: row.description,
		centerLng: row.centerLng,
		centerLat: row.centerLat,
		zoom: row.zoom,
		role,
		ownerName: owner?.name ?? ''
	};
});

const coordinates = {
	centerLng: v.pipe(v.number(), v.minValue(-180), v.maxValue(180)),
	centerLat: v.pipe(v.number(), v.minValue(-90), v.maxValue(90)),
	zoom: v.pipe(v.number(), v.minValue(0), v.maxValue(24))
};

export const createPlan = form(
	v.object({
		name: v.pipe(
			v.string(),
			v.trim(),
			v.minLength(1, () => t`Give your plan a name`),
			v.maxLength(100)
		),
		description: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500))),
		...coordinates
	}),
	async (data) => {
		const user = requireUser();
		const [created] = await db
			.insert(plan)
			.values({ ...data, description: data.description || null, ownerId: user.id })
			.returning({ id: plan.id });
		redirect(303, `/plans/${created.id}`);
	}
);

export const updatePlan = form(
	v.object({
		id: v.string(),
		name: v.pipe(
			v.string(),
			v.trim(),
			v.minLength(1, () => t`Give your plan a name`),
			v.maxLength(100)
		),
		description: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500)))
	}),
	async ({ id, name, description }) => {
		await getOwnedPlan(id);
		await db
			.update(plan)
			.set({ name, description: description || null })
			.where(eq(plan.id, id));
		await getPlan(id).refresh();
		return { saved: true };
	}
);

/** Remembers the last map position so the plan reopens where the user left it. */
export const savePlanView = command(v.object({ id: v.string(), ...coordinates }), async (data) => {
	await getOwnedPlan(data.id);
	const { id, ...view } = data;
	await db.update(plan).set(view).where(eq(plan.id, id));
});

export const deletePlan = command(v.string(), async (id) => {
	await getOwnedPlan(id);
	await db.delete(plan).where(eq(plan.id, id));
	await getPlans().refresh();
});

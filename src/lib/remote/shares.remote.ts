import { error } from '@sveltejs/kit';
import { command, query } from '$app/server';
import { and, asc, eq } from 'drizzle-orm';
import * as v from 'valibot';
import { db } from '#lib/server/db/index.ts';
import { plan, planShare, SHARE_ROLES } from '#lib/server/db/schema.ts';
import { getOwnedPlan } from '#lib/server/access.ts';
import { requireUser } from '#lib/server/guards.ts';
import { t } from '#lib/i18n/index.ts';

/** Share links of one of the user's plans, oldest first. */
export const getPlanShares = query(v.string(), async (planId) => {
	await getOwnedPlan(planId);
	return db
		.select({ token: planShare.token, role: planShare.role, createdAt: planShare.createdAt })
		.from(planShare)
		.where(eq(planShare.planId, planId))
		.orderBy(asc(planShare.createdAt));
});

export const createPlanShare = command(
	v.object({ planId: v.string(), role: v.picklist(SHARE_ROLES) }),
	async ({ planId, role }) => {
		await getOwnedPlan(planId);
		await db.insert(planShare).values({ planId, role });
		await getPlanShares(planId).refresh();
	}
);

/** Revokes a share link, everyone using it loses access. */
export const deletePlanShare = command(v.string(), async (token) => {
	const user = requireUser();
	const [row] = await db
		.select({ planId: planShare.planId })
		.from(planShare)
		.innerJoin(plan, eq(plan.id, planShare.planId))
		.where(and(eq(planShare.token, token), eq(plan.ownerId, user.id)));
	if (!row) error(404, t`Share link not found`);
	await db.delete(planShare).where(eq(planShare.token, token));
	await getPlanShares(row.planId).refresh();
});

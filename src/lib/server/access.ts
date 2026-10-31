import { error } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import { and, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { plan, planShare } from '#lib/server/db/schema.ts';
import { requireUser } from '#lib/server/guards.ts';
import { t } from '#lib/i18n/index.ts';

export type PlanRole = 'view' | 'edit' | 'owner';

const RANK: Record<PlanRole, number> = { view: 0, edit: 1, owner: 2 };

export async function getOwnedPlan(id: string) {
	const user = requireUser();
	const row = await db.query.plan.findFirst({
		where: and(eq(plan.id, id), eq(plan.ownerId, user.id))
	});
	if (!row) error(404, t`Plan not found`);
	return row;
}

/**
 * Resolves a plan reference, which is either the id of a plan owned by the current user or the
 * token of a share link, and checks the access it grants is at least `need`.
 * Edit links only grant edit access to signed in users.
 */
export async function getPlanAccess(ref: string, need: PlanRole = 'view') {
	const { user } = getRequestEvent().locals;
	let found: { plan: typeof plan.$inferSelect; role: PlanRole } | undefined;

	if (user) {
		const owned = await db.query.plan.findFirst({
			where: and(eq(plan.id, ref), eq(plan.ownerId, user.id))
		});
		if (owned) found = { plan: owned, role: 'owner' };
	}
	if (!found) {
		const share = await db.query.planShare.findFirst({
			where: eq(planShare.token, ref),
			with: { plan: true }
		});
		if (share) {
			const role = share.plan.ownerId === user?.id ? 'owner' : share.role;
			if (role === 'edit' && !user) error(401, t`Sign in to edit this plan`);
			found = { plan: share.plan, role };
		}
	}

	if (!found) error(404, t`Plan not found`);
	if (RANK[found.role] < RANK[need]) error(403, t`You can't change this plan`);
	return found;
}

import { error } from '@sveltejs/kit';
import { command, query } from '$app/server';
import { asc, count, eq } from 'drizzle-orm';
import * as v from 'valibot';
import { invalidateUserSessions } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { plan, user } from '#lib/server/db/schema.ts';
import { requireAdmin } from '#lib/server/guards.ts';
import { isSignupEnabled, setSignupEnabled } from '#lib/server/settings.ts';
import { t } from '#lib/i18n/index.ts';

export const getUsers = query(async () => {
	requireAdmin();
	return db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			banned: user.banned,
			createdAt: user.createdAt,
			planCount: count(plan.id)
		})
		.from(user)
		.leftJoin(plan, eq(plan.ownerId, user.id))
		.groupBy(user.id)
		.orderBy(asc(user.createdAt));
});

export const getSettings = query(async () => {
	requireAdmin();
	return { signupEnabled: await isSignupEnabled() };
});

export const updateSignupEnabled = command(v.boolean(), async (enabled) => {
	requireAdmin();
	await setSignupEnabled(enabled);
	await getSettings().refresh();
});

/** Admins can't lock themselves out by accident. */
function assertNotSelf(userId: string) {
	const admin = requireAdmin();
	if (admin.id === userId) error(400, t`You cannot change your own account here`);
}

export const setUserRole = command(
	v.object({ userId: v.string(), role: v.picklist(['admin', 'user']) }),
	async ({ userId, role }) => {
		assertNotSelf(userId);
		await db.update(user).set({ role }).where(eq(user.id, userId));
		await getUsers().refresh();
	}
);

export const setUserBanned = command(
	v.object({ userId: v.string(), banned: v.boolean() }),
	async ({ userId, banned }) => {
		assertNotSelf(userId);
		await db.update(user).set({ banned }).where(eq(user.id, userId));
		if (banned) await invalidateUserSessions(userId);
		await getUsers().refresh();
	}
);

export const deleteUser = command(v.string(), async (userId) => {
	assertNotSelf(userId);
	// sessions and plans are removed by cascade
	await db.delete(user).where(eq(user.id, userId));
	await getUsers().refresh();
});

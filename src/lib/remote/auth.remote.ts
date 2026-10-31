import { invalid, redirect } from '@sveltejs/kit';
import { form, getRequestEvent, query } from '$app/server';
import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import {
	checkCredentials,
	createSession,
	hashPassword,
	invalidateSession,
	rateLimit
} from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { user } from '#lib/server/db/schema.ts';
import { countUsers, isSignupEnabled } from '#lib/server/settings.ts';
import { t } from '#lib/i18n/index.ts';
import { safeNext } from '#lib/server/guards.ts';

/** where to go after signing in, e.g. back to a share link */
const next = v.optional(v.string());

export const getCurrentUser = query(async () => {
	const { locals } = getRequestEvent();
	if (!locals.user) return null;
	const { id, name, email, role } = locals.user;
	return { id, name, email, isAdmin: role === 'admin' };
});

export const getSignupState = query(async () => {
	const users = await countUsers();
	return { firstUser: users === 0, enabled: users === 0 || (await isSignupEnabled()) };
});

export const signIn = form(
	v.object({
		email: v.pipe(
			v.string(),
			v.trim(),
			v.email(() => t`Enter a valid email`)
		),
		_password: v.pipe(
			v.string(),
			v.minLength(1, () => t`Enter your password`)
		),
		next
	}),
	async ({ email, _password, next }) => {
		if (!rateLimit(`sign-in:${getRequestEvent().getClientAddress()}`, 10)) {
			invalid(t`Too many attempts, try again in a minute`);
		}
		const account = await checkCredentials(email, _password);
		if (!account) invalid(t`Invalid email or password`);
		if (account.banned) invalid(t`This account has been deactivated`);
		await createSession(account.id);
		redirect(303, safeNext(next));
	}
);

export const signUp = form(
	v.object({
		name: v.pipe(
			v.string(),
			v.trim(),
			v.minLength(1, () => t`Enter your name`)
		),
		email: v.pipe(
			v.string(),
			v.trim(),
			v.email(() => t`Enter a valid email`)
		),
		_password: v.pipe(
			v.string(),
			v.minLength(8, () => t`Use at least 8 characters`)
		),
		next
	}),
	async ({ name, email, _password, next }) => {
		if (!rateLimit(`sign-up:${getRequestEvent().getClientAddress()}`, 5)) {
			invalid(t`Too many attempts, try again in a minute`);
		}
		// the very first account can always be created, it becomes the admin
		const firstUser = (await countUsers()) === 0;
		if (!firstUser && !(await isSignupEnabled())) invalid(t`Sign up is currently disabled`);

		email = email.toLowerCase();
		if (await db.query.user.findFirst({ where: eq(user.email, email) })) {
			invalid(t`An account with this email already exists`);
		}
		const [created] = await db
			.insert(user)
			.values({
				name,
				email,
				passwordHash: await hashPassword(_password),
				role: firstUser ? 'admin' : 'user'
			})
			.returning({ id: user.id });
		await createSession(created!.id);
		redirect(303, safeNext(next));
	}
);

export const signOut = form(async () => {
	await invalidateSession();
	redirect(303, '/login');
});

import { error } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import { t } from '#lib/i18n/index.ts';

export function requireUser() {
	const { locals } = getRequestEvent();
	if (!locals.user) error(401, t`Not signed in`);
	return locals.user;
}

export function requireAdmin() {
	const user = requireUser();
	if (user.role !== 'admin') error(403, t`Admins only`);
	return user;
}

/** A same-site path to continue to after signing in, `/plans` for anything else. */
export function safeNext(next: string | null | undefined) {
	return next && /^\/(?![/\\])/.test(next) ? next : '/plans';
}

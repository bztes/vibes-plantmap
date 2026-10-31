import { redirect } from '@sveltejs/kit';
import { safeNext } from '#lib/server/guards.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(302, safeNext(url.searchParams.get('next')));
};

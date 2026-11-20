import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { t } from '@bztes/vibes-t0n';

export const load: LayoutServerLoad = ({ locals }) => {
	if (locals.user?.role !== 'admin') error(403, t`Admins only`);
};

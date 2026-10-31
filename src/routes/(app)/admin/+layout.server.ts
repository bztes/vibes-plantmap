import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { t } from '#lib/i18n/index.ts';

export const load: LayoutServerLoad = ({ locals }) => {
	if (locals.user?.role !== 'admin') error(403, t`Admins only`);
};

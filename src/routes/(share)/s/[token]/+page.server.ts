import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { planShare } from '#lib/server/db/schema.ts';
import { t } from '#lib/i18n/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const share = await db.query.planShare.findFirst({
		where: eq(planShare.token, params.token),
		with: { plan: { columns: { id: true, ownerId: true } } }
	});
	if (!share) error(404, t`This share link doesn't exist or was revoked`);
	if (share.plan.ownerId === locals.user?.id) redirect(302, `/plans/${share.plan.id}`);
	if (share.role === 'edit' && !locals.user) {
		redirect(302, `/login?next=${encodeURIComponent(url.pathname)}`);
	}
};

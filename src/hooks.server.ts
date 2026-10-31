import { sequence, type Handle } from '@sveltejs/kit/hooks';
import { validateSession } from '#lib/server/auth.ts';
import { handleLocale } from '#lib/i18n/server.ts';

const handleSession: Handle = async ({ event, resolve }) => {
	const current = await validateSession();

	if (current) {
		event.locals.session = current.session;
		event.locals.user = current.user;
	}

	return resolve(event);
};

export const handle: Handle = sequence(handleLocale, handleSession);

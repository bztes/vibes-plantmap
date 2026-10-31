import type { RequestEvent } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { getRequestEvent } from '$app/server';
import { isLocale, localeCookie, fallbackLocale, type Locale } from './config.ts';
import { setServerLocaleGetter } from './index.ts';

setServerLocaleGetter(() => {
	try {
		return getRequestEvent().locals.locale ?? fallbackLocale;
	} catch {
		return fallbackLocale;
	}
});

function detectLocale({ cookies, request }: RequestEvent): Locale {
	const cookie = cookies.get(localeCookie);
	if (isLocale(cookie)) return cookie;

	// e.g. "de-CH,de;q=0.9,en;q=0.8"
	const accepted = (request.headers.get('accept-language') ?? '')
		.split(',')
		.map((part) => {
			const [tag, q] = part.trim().split(';q=');
			return { lang: tag.split('-')[0].toLowerCase(), q: q ? Number(q) : 1 };
		})
		.sort((a, b) => b.q - a.q);

	return accepted.map((a) => a.lang).find(isLocale) ?? fallbackLocale;
}

export const handleLocale: Handle = ({ event, resolve }) => {
	const locale = detectLocale(event);
	event.locals.locale = locale;
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', locale)
	});
};

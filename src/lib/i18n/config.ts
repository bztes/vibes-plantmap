import { fallbackLocale, locales } from 'virtual:i18n-config';

/** Fallback locale first, then every locale with a file in locales/. Set up by the i18n plugin. */
export { fallbackLocale, locales };

export type Locale = string;

function displayName(locale: Locale) {
	try {
		const name = new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale;
		return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
	} catch {
		return locale;
	}
}

/** Name of every locale in its own language, e.g. { en: 'English', de: 'Deutsch' }. */
export const localeNames: Record<Locale, string> = Object.fromEntries(
	locales.map((l) => [l, displayName(l)])
);

export const localeCookie = 'locale';

export function isLocale(value: unknown): value is Locale {
	return locales.includes(value as Locale);
}

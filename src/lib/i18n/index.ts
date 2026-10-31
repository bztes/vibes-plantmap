import { createSubscriber } from 'svelte/reactivity';
import { fallbackLocale, isLocale, localeCookie, type Locale } from './config.ts';

export { locales, localeNames, fallbackLocale, isLocale, type Locale } from './config.ts';

/** Translations of one source file, emitted by the i18n vite plugin. */
interface FileMessages {
	/** translations per locale, with missing ones already filled from the fallback locale */
	messages: Partial<Record<Locale, Record<string, string>>>;
	/** loads the translations of a locale in the browser, which only fetches the locales it needs */
	load?: Partial<Record<Locale, () => Promise<{ default: Record<string, string> }>>>;
}

let clientLocale: Locale =
	typeof document !== 'undefined' && isLocale(document.documentElement.lang)
		? document.documentElement.lang
		: fallbackLocale;

// re-renders everything that read the locale once it changes, without needing runes in this file
let notify = () => {};
const subscribe = createSubscriber((update) => {
	notify = update;
	return () => (notify = () => {});
});

// Set by `handleLocale` so server code reads the locale of the current request.
let serverLocale: (() => Locale) | undefined;

export function setServerLocaleGetter(getter: () => Locale) {
	serverLocale = getter;
}

export function getLocale(): Locale {
	if (serverLocale) return serverLocale();
	subscribe();
	return clientLocale;
}

// every file with translations loaded in the browser, to load their texts on locale changes
const files = new Set<FileMessages>();
let pendingLocale: Locale | undefined;

async function ensureLoaded(file: FileMessages, locale: Locale) {
	if (file.messages[locale]) return;
	file.messages[locale] = (await file.load?.[locale]?.())?.default ?? {};
}

/** Loads the translations of a file for the current locale before the file runs. */
export async function __load(file: FileMessages) {
	files.add(file);
	const needed = pendingLocale ? [clientLocale, pendingLocale] : [clientLocale];
	await Promise.all(needed.map((locale) => ensureLoaded(file, locale)));
	return file;
}

/** Loads the translations of every file used so far, then switches the locale. */
export async function setLocale(locale: Locale) {
	pendingLocale = locale;
	await Promise.all([...files].map((file) => ensureLoaded(file, locale)));
	if (pendingLocale !== locale) return; // another locale was picked meanwhile
	pendingLocale = undefined;
	clientLocale = locale;
	notify();
	document.documentElement.lang = locale;
	document.cookie = `${localeCookie}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Translates a text written in the source language: t`${count} trees`.
 *
 * The i18n vite plugin replaces every call with a lookup in the translations of the file it is
 * used in, so this implementation only runs when the plugin is missing.
 * Call it while rendering or handling a request, not at module top level.
 */
export function t(strings: TemplateStringsArray, ...values: unknown[]): string {
	return strings.reduce((text, part, i) => text + String(values[i - 1]) + part);
}

/** Lookup emitted by the i18n vite plugin. */
export function __t(
	file: FileMessages,
	key: string,
	message: string,
	values?: Record<string, unknown>
) {
	const text = file.messages[getLocale()]?.[key] || message;
	if (!values) return text;
	return text.replace(/\{([^{}]+)\}/g, (match, name: string) =>
		name in values ? String(values[name]) : match
	);
}

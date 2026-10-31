import { getLocale } from '#lib/i18n/index.ts';

/** Name in the locale of the current request, falls back to the base name. */
export function localizedName(s: { name: string; nameTranslations: Record<string, string> }) {
	return s.nameTranslations[getLocale()] || s.name;
}

/** Species with `name` localized and the stored one kept as `baseName`, sorted by `name`. */
export function localizeSpecies<
	T extends { name: string; nameTranslations: Record<string, string> }
>(rows: T[]) {
	const locale = getLocale();
	return rows
		.map((s) => ({ ...s, name: localizedName(s), baseName: s.name }))
		.sort((a, b) => a.name.localeCompare(b.name, locale));
}

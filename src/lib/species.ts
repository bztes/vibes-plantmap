import { t } from '@bztes/vibes-t0n';
import { formatMeters } from './growth';
import { SPECIES_CATEGORIES } from './categories';

export { SPECIES_CATEGORIES, type SpeciesCategory } from './categories';

export function categoryLabel(category: string) {
	switch (category) {
		case 'deciduous':
			return t`Deciduous`;
		case 'conifer':
			return t`Conifer`;
		case 'fruit':
			return t`Fruit`;
		case 'shrub':
			return t`Shrub`;
		default:
			return category;
	}
}

export function matureSizeLabel(s: { matureHeight: number; matureSpread: number }) {
	const height = formatMeters(s.matureHeight);
	const spread = formatMeters(s.matureSpread);
	return t`Grows up to ${height} tall and ${spread} wide`;
}

/** Species grouped by category, sorted by name, with what the search and the list need. */
export function groupSpecies<
	S extends { name: string; category: string; matureHeight: number; matureSpread: number }
>(species: S[]) {
	return SPECIES_CATEGORIES.map((category) => ({
		category,
		items: species
			.filter((s) => s.category === category)
			.sort((a, b) => a.name.localeCompare(b.name))
			.map((s) => ({ ...s, search: s.name.toLocaleLowerCase(), size: matureSizeLabel(s) }))
	}));
}

/** Groups from `groupSpecies` reduced to the species whose name contains `query`. */
export function searchSpecies<G extends { items: { search: string }[] }>(
	groups: G[],
	query: string
) {
	const q = query.trim().toLocaleLowerCase();
	return groups
		.map((g) => (q ? { ...g, items: g.items.filter((s) => s.search.includes(q)) } : g))
		.filter((g) => g.items.length > 0);
}

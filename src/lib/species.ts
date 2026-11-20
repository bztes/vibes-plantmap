import { t } from '@bztes/vibes-t0n';
import { formatMeters } from './growth';

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

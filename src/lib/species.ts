import { t } from '@bztes/vibes-t0n';

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

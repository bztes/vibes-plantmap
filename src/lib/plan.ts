import { t } from '@bztes/vibes-t0n';
import { formatMeters, sizeAt, type GrowthParams, type TreeSize } from './growth';

export interface PlannedTree extends GrowthParams {
	id: string;
	label: string | null;
	lng: number;
	lat: number;
	speciesName: string;
	color: string;
}

export type Sized<T extends PlannedTree> = T & { size: TreeSize };

export function sizeTrees<T extends PlannedTree>(trees: T[], date: Date): Sized<T>[] {
	return trees.map((tree) => ({ ...tree, size: sizeAt(tree, date) }));
}

export function treeName(tree: Pick<PlannedTree, 'label' | 'speciesName'>) {
	return tree.label || tree.speciesName;
}

/** one line with the species (when the tree has its own name) and current size */
export function treeSummary(tree: Sized<PlannedTree>) {
	const spread = formatMeters(tree.size.spread);
	const height = formatMeters(tree.size.height);
	return `${tree.label ? `${tree.speciesName} · ` : ''}⌀ ${spread} · ${t`${height} high`}`;
}

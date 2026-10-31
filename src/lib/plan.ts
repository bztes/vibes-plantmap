import { distance } from './geo';
import { addYears, sizeAt, type GrowthParams, type TreeSize } from './growth';

export interface PlannedTree extends GrowthParams {
	id: string;
	label: string | null;
	lng: number;
	lat: number;
	speciesName: string;
	color: string;
}

export type Sized<T extends PlannedTree> = T & { size: TreeSize };

export interface Conflict<T extends PlannedTree = PlannedTree> {
	a: Sized<T>;
	b: Sized<T>;
	distance: number;
	/** how many meters the crowns overlap */
	overlap: number;
	/** overlap relative to the smaller crown radius, 0..1+ */
	severity: number;
}

export interface UpcomingConflict<T extends PlannedTree = PlannedTree> {
	a: T;
	b: T;
	/** calendar year in which the crowns start to touch */
	year: number;
}

export function sizeTrees<T extends PlannedTree>(trees: T[], date: Date): Sized<T>[] {
	return trees.map((tree) => ({ ...tree, size: sizeAt(tree, date) }));
}

/** Crowns that touch by less than this many meters are not reported. */
const TOLERANCE = 0.1;

const between = (a: PlannedTree, b: PlannedTree) => distance([a.lng, a.lat], [b.lng, b.lat]);

export function findConflicts<T extends PlannedTree>(trees: Sized<T>[]): Conflict<T>[] {
	const conflicts: Conflict<T>[] = [];
	for (let i = 0; i < trees.length; i++) {
		for (let j = i + 1; j < trees.length; j++) {
			const a = trees[i];
			const b = trees[j];
			const ra = a.size.spread / 2;
			const rb = b.size.spread / 2;
			const d = between(a, b);
			const overlap = ra + rb - d;
			if (overlap > TOLERANCE) {
				conflicts.push({ a, b, distance: d, overlap, severity: overlap / Math.min(ra, rb) });
			}
		}
	}
	return conflicts.sort((x, y) => y.severity - x.severity);
}

const HORIZON_YEARS = 150;

/**
 * Pairs that don't touch at `from` but will at some point in the future,
 * with the year their crowns first meet.
 */
export function findUpcomingConflicts<T extends PlannedTree>(
	trees: T[],
	from: Date
): UpcomingConflict<T>[] {
	const upcoming: UpcomingConflict<T>[] = [];
	for (let i = 0; i < trees.length; i++) {
		for (let j = i + 1; j < trees.length; j++) {
			const a = trees[i];
			const b = trees[j];
			const d = between(a, b);
			const touches = (date: Date) =>
				(sizeAt(a, date).spread + sizeAt(b, date).spread) / 2 - d > TOLERANCE;

			if (touches(from) || !touches(addYears(from, HORIZON_YEARS))) continue;
			// sizes only grow, so binary search for the first touching year
			let lo = 0;
			let hi = HORIZON_YEARS;
			while (lo < hi) {
				const mid = (lo + hi) >> 1;
				if (touches(addYears(from, mid))) hi = mid;
				else lo = mid + 1;
			}
			upcoming.push({ a, b, year: from.getFullYear() + lo });
		}
	}
	return upcoming.sort((x, y) => x.year - y.year);
}

export function treeName(tree: Pick<PlannedTree, 'label' | 'speciesName'>) {
	return tree.label || tree.speciesName;
}

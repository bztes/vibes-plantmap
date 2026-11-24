import { getLocale } from '@bztes/vibes-t0n';
export type Dimension = 'height' | 'spread';

/** where a growth curve starts: the first measurement of that size */
export interface SizeAnchor {
	/** ISO date (YYYY-MM-DD) */
	date: string;
	/** meters */
	value: number;
}

export interface GrowthParams {
	heightStart: SizeAnchor;
	/** crown diameter */
	spreadStart: SizeAnchor;
	matureHeight: number;
	matureSpread: number;
	yearsToMaturity: number;
	/** how fast this tree grows compared to its species, fitted from measurements (1 = typical) */
	heightPace?: number;
	spreadPace?: number;
}

export interface TreeSize {
	height: number;
	/** crown diameter in meters */
	spread: number;
}

export interface Measurement {
	/** ISO date (YYYY-MM-DD) */
	measuredAt: string;
	height: number | null;
	/** crown diameter in meters */
	spread: number | null;
}

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/** at `yearsToMaturity` the tree reaches 1 - e^-3 ≈ 95% of its mature size */
const GROWTH_RATE = 3;

/** a tree grows at most this many times faster or slower than its species */
export const MAX_PACE = 5;
/** measurements this close after the first one say little about the pace */
const MIN_FIT_AGE = 0.1;

export function yearsBetween(from: string | Date, to: string | Date) {
	return (new Date(to).getTime() - new Date(from).getTime()) / MS_PER_YEAR;
}

function approach(initial: number, mature: number, age: number, yearsToMaturity: number, pace = 1) {
	if (initial >= mature) return initial;
	const t = Math.max(0, age);
	return (
		mature - (mature - initial) * Math.exp((-GROWTH_RATE * pace * t) / Math.max(1, yearsToMaturity))
	);
}

function mature(params: GrowthParams, dimension: Dimension) {
	return dimension === 'height' ? params.matureHeight : params.matureSpread;
}

function start(params: GrowthParams, dimension: Dimension) {
	return dimension === 'height' ? params.heightStart : params.spreadStart;
}

/**
 * Estimates one size of a tree at a given date. Growth follows an exponential approach to
 * the mature size from the first measurement: fast while young, slowing as the tree matures.
 * Before the first measurement the size stays at the measured one.
 */
export function dimensionAt(params: GrowthParams, dimension: Dimension, date: Date, pace?: number) {
	const anchor = start(params, dimension);
	return approach(
		anchor.value,
		mature(params, dimension),
		yearsBetween(anchor.date, date),
		params.yearsToMaturity,
		pace ?? (dimension === 'height' ? params.heightPace : params.spreadPace)
	);
}

export function sizeAt(params: GrowthParams, date: Date): TreeSize {
	return {
		height: dimensionAt(params, 'height', date),
		spread: dimensionAt(params, 'spread', date)
	};
}

/** Size of a young nursery tree: ~10% of mature height (at least 1 m) and ~8% of its spread. */
export function nurserySize(matureHeight: number, matureSpread: number) {
	return {
		height: Math.max(1, Math.round(matureHeight * 0.1 * 10) / 10),
		spread: Math.max(0.3, Math.round(matureSpread * 0.08 * 10) / 10)
	};
}

/**
 * Where the height and crown curves start: the earliest measurement of each. A size never
 * measured starts as a nursery tree at the first measurement, or at `fallbackDate`.
 */
export function growthStart(
	measurements: Measurement[],
	species: { matureHeight: number; matureSpread: number },
	fallbackDate: string
) {
	const sorted = measurements.toSorted((a, b) => a.measuredAt.localeCompare(b.measuredAt));
	const firstDate = sorted[0]?.measuredAt ?? fallbackDate;
	const nursery = nurserySize(species.matureHeight, species.matureSpread);
	const anchor = (dimension: Dimension): SizeAnchor => {
		const first = sorted.find((m) => m[dimension] !== null);
		return first
			? { date: first.measuredAt, value: first[dimension]! }
			: { date: firstDate, value: nursery[dimension] };
	};
	return { heightStart: anchor('height'), spreadStart: anchor('spread') };
}

/**
 * Finds the growth pace that best matches the measured sizes (least squares in meters).
 * The mature size stays fixed, so a single later measurement is met exactly as long as
 * it's reachable within the pace limits. Returns 1 without usable measurements.
 */
export function fitPace(
	initial: number,
	mature: number,
	yearsToMaturity: number,
	points: { age: number; value: number }[]
) {
	const usable = points.filter((p) => p.age >= MIN_FIT_AGE);
	if (usable.length === 0 || initial >= mature) return 1;
	const error = (logPace: number) => {
		const pace = Math.exp(logPace);
		return usable.reduce((sum, p) => {
			const diff = approach(initial, mature, p.age, yearsToMaturity, pace) - p.value;
			return sum + diff * diff;
		}, 0);
	};
	// coarse scan first so a sum of several measurements can't trap the search in a local dip
	const lo = -Math.log(MAX_PACE);
	const hi = Math.log(MAX_PACE);
	const steps = 40;
	const step = (hi - lo) / steps;
	let best = 0;
	for (let i = 0; i <= steps; i++) {
		if (error(lo + i * step) < error(lo + best * step)) best = i;
	}
	// then golden section search around the best grid point
	let a = Math.max(lo, lo + (best - 1) * step);
	let b = Math.min(hi, lo + (best + 1) * step);
	const g = (Math.sqrt(5) - 1) / 2;
	for (let i = 0; i < 40; i++) {
		const c = b - g * (b - a);
		const d = a + g * (b - a);
		if (error(c) < error(d)) b = d;
		else a = c;
	}
	return Math.exp((a + b) / 2);
}

/** Height and crown pace of a tree, fitted to the measurements after its first ones. */
export function fitGrowth(params: GrowthParams, measurements: Measurement[]) {
	const pace = (dimension: Dimension) => {
		const anchor = start(params, dimension);
		const points = measurements.flatMap((m) => {
			const value = m[dimension];
			return value === null ? [] : [{ age: yearsBetween(anchor.date, m.measuredAt), value }];
		});
		return fitPace(anchor.value, mature(params, dimension), params.yearsToMaturity, points);
	};
	return { heightPace: pace('height'), spreadPace: pace('spread') };
}

export function addYears(date: Date, years: number) {
	const d = new Date(date);
	d.setFullYear(d.getFullYear() + years);
	return d;
}

export function formatMeters(value: number) {
	const digits = value < 10 ? 1 : 0;
	const number = value.toLocaleString(getLocale(), {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	});
	return `${number} m`;
}

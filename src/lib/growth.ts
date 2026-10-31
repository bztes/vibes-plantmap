import { getLocale } from '#lib/i18n/index.ts';
export interface GrowthParams {
	plantedAt: string;
	heightAtPlanting: number;
	spreadAtPlanting: number;
	matureHeight: number;
	matureSpread: number;
	yearsToMaturity: number;
}

export interface TreeSize {
	/** years since planting, negative if not yet planted */
	age: number;
	height: number;
	/** crown diameter in meters */
	spread: number;
	planted: boolean;
}

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/** at `yearsToMaturity` the tree reaches 1 - e^-3 ≈ 95% of its mature size */
const GROWTH_RATE = 3;

function approach(initial: number, mature: number, age: number, yearsToMaturity: number) {
	if (initial >= mature) return initial;
	const t = Math.max(0, age);
	return mature - (mature - initial) * Math.exp((-GROWTH_RATE * t) / Math.max(1, yearsToMaturity));
}

/**
 * Estimates tree size at a given date. Growth follows an exponential approach to the
 * mature size: fast while young, slowing as the tree matures.
 */
export function sizeAt(params: GrowthParams, date: Date): TreeSize {
	const age = (date.getTime() - new Date(params.plantedAt).getTime()) / MS_PER_YEAR;
	return {
		age,
		planted: age >= 0,
		height: approach(params.heightAtPlanting, params.matureHeight, age, params.yearsToMaturity),
		spread: approach(params.spreadAtPlanting, params.matureSpread, age, params.yearsToMaturity)
	};
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

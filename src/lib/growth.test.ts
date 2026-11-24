import { describe, expect, it } from 'vitest';
import {
	fitGrowth,
	fitPace,
	growthStart,
	MAX_PACE,
	nurserySize,
	sizeAt,
	type GrowthParams
} from './growth';

const params: GrowthParams = {
	heightStart: { date: '2020-01-01', value: 2 },
	spreadStart: { date: '2020-01-01', value: 0.5 },
	matureHeight: 10,
	matureSpread: 8,
	yearsToMaturity: 20
};

describe('sizeAt', () => {
	it('starts at the first measurement and keeps it before', () => {
		expect(sizeAt(params, new Date('2020-01-01')).height).toBe(2);
		expect(sizeAt(params, new Date('2010-01-01')).height).toBe(2);
		expect(sizeAt(params, new Date('2030-01-01')).height).toBeGreaterThan(2);
	});
});

describe('fitPace', () => {
	it('is 1 without usable measurements', () => {
		expect(fitPace(2, 10, 20, [])).toBe(1);
		expect(fitPace(2, 10, 20, [{ age: 0, value: 2 }])).toBe(1);
		expect(fitPace(12, 10, 20, [{ age: 5, value: 12 }])).toBe(1);
	});

	it('passes through a single later measurement', () => {
		for (const value of [4, 6, 8]) {
			const pace = fitPace(2, 10, 20, [{ age: 5, value }]);
			const fitted = sizeAt({ ...params, heightPace: pace }, new Date('2025-01-01'));
			expect(fitted.height).toBeCloseTo(value, 2);
		}
	});

	it('recovers the pace of a tree growing on a known curve', () => {
		const truth = { ...params, heightPace: 0.6 };
		const points = [3, 6, 10].map((years) => ({
			age: years,
			value: sizeAt(truth, new Date(Date.UTC(2020 + years, 0, 1))).height
		}));
		expect(fitPace(2, 10, 20, points)).toBeCloseTo(0.6, 2);
	});

	it('stays within the pace limits', () => {
		expect(fitPace(2, 10, 20, [{ age: 1, value: 12 }])).toBeCloseTo(MAX_PACE, 2);
		expect(fitPace(2, 10, 20, [{ age: 10, value: 1.5 }])).toBeCloseTo(1 / MAX_PACE, 2);
	});
});

describe('growthStart', () => {
	const species = { matureHeight: 10, matureSpread: 8 };

	it('uses the earliest measurement of each size', () => {
		const start = growthStart(
			[
				{ measuredAt: '2022-05-01', height: 4, spread: 2 },
				{ measuredAt: '2020-03-01', height: null, spread: 1 }
			],
			species,
			'2019-01-01'
		);
		expect(start.heightStart).toEqual({ date: '2022-05-01', value: 4 });
		expect(start.spreadStart).toEqual({ date: '2020-03-01', value: 1 });
	});

	it('falls back to a nursery tree', () => {
		const nursery = nurserySize(10, 8);
		const start = growthStart(
			[{ measuredAt: '2021-01-01', height: 3, spread: null }],
			species,
			'2019-01-01'
		);
		expect(start.spreadStart).toEqual({ date: '2021-01-01', value: nursery.spread });
		expect(growthStart([], species, '2019-01-01').heightStart).toEqual({
			date: '2019-01-01',
			value: nursery.height
		});
	});
});

describe('fitGrowth', () => {
	it('fits height and crown separately', () => {
		const { heightPace, spreadPace } = fitGrowth(params, [
			{ measuredAt: '2020-01-01', height: 2, spread: 0.5 },
			{ measuredAt: '2025-01-01', height: 8, spread: null }
		]);
		expect(heightPace).toBeGreaterThan(1);
		expect(spreadPace).toBe(1);
	});
});

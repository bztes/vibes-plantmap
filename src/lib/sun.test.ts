import { describe, expect, it } from 'vitest';
import type { LngLat } from './geo';
import { shadowRing, sunPosition } from './sun';

const deg = (rad: number) => (rad * 180) / Math.PI;
const berlin: LngLat = [13.4, 52.5];

describe('sunPosition', () => {
	it('stands due south at its highest around solar noon in summer', () => {
		// solar noon in Berlin is about 11:10 UTC around the solstice
		const sun = sunPosition(new Date('2026-06-21T11:10:00Z'), berlin);
		expect(deg(sun.altitude)).toBeCloseTo(90 - 52.5 + 23.44, 0);
		expect(deg(sun.azimuth)).toBeGreaterThan(175);
		expect(deg(sun.azimuth)).toBeLessThan(185);
	});

	it('rises in the east and sets in the west', () => {
		expect(deg(sunPosition(new Date('2026-03-20T06:00:00Z'), berlin).azimuth)).toBeLessThan(110);
		expect(deg(sunPosition(new Date('2026-03-20T16:00:00Z'), berlin).azimuth)).toBeGreaterThan(250);
	});

	it('is below the horizon at night', () => {
		expect(sunPosition(new Date('2026-12-21T23:00:00Z'), berlin).altitude).toBeLessThan(0);
	});
});

describe('shadowRing', () => {
	const size = { height: 10, spread: 6 };
	const southSun = (altitudeDeg: number) => ({
		azimuth: Math.PI,
		altitude: (altitudeDeg * Math.PI) / 180
	});

	it('is null when the sun is down', () => {
		expect(shadowRing(berlin, size, southSun(-5))).toBeNull();
	});

	it('points away from the sun and grows as it sinks', () => {
		const reach = (alt: number) =>
			Math.max(...shadowRing(berlin, size, southSun(alt))!.map(([, lat]) => lat)) - berlin[1];
		expect(reach(60)).toBeGreaterThan(0);
		expect(reach(20)).toBeGreaterThan(reach(60) * 2);
		// nothing falls towards the sun beyond the crown
		const south = Math.min(...shadowRing(berlin, size, southSun(20))!.map(([, lat]) => lat));
		expect(berlin[1] - south).toBeLessThan(0.0001);
	});

	it('is a closed ring', () => {
		const ring = shadowRing(berlin, size, southSun(30))!;
		expect(ring.at(-1)).toEqual(ring[0]);
	});
});

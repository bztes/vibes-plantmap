import { offsetMeters, type LngLat } from './geo';
import type { TreeSize } from './growth';

const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
const J1970 = 2_440_588;
const J2000 = 2_451_545;
/** obliquity of the earth's axis */
const OBLIQUITY = RAD * 23.4397;

export interface SunPosition {
	/** compass direction of the sun, radians clockwise from north */
	azimuth: number;
	/** angle above the horizon in radians, negative at night */
	altitude: number;
}

/**
 * Where the sun stands at a moment and place, after the low-precision formulas of the
 * Astronomical Almanac (good to well under a degree, plenty for shadows).
 */
export function sunPosition(date: Date, [lng, lat]: LngLat): SunPosition {
	const d = date.getTime() / DAY_MS - 0.5 + J1970 - J2000;
	const anomaly = RAD * (357.5291 + 0.98560028 * d);
	const center =
		RAD *
		(1.9148 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly) + 0.0003 * Math.sin(3 * anomaly));
	const longitude = anomaly + center + RAD * 102.9372 + Math.PI;
	const declination = Math.asin(Math.sin(OBLIQUITY) * Math.sin(longitude));
	const ascension = Math.atan2(Math.sin(longitude) * Math.cos(OBLIQUITY), Math.cos(longitude));
	const hourAngle = RAD * (280.16 + 360.9856235 * d) + RAD * lng - ascension;
	const phi = RAD * lat;

	const altitude = Math.asin(
		Math.sin(phi) * Math.sin(declination) +
			Math.cos(phi) * Math.cos(declination) * Math.cos(hourAngle)
	);
	// measured from south towards west, turned to the compass
	const fromSouth = Math.atan2(
		Math.sin(hourAngle),
		Math.cos(hourAngle) * Math.sin(phi) - Math.tan(declination) * Math.cos(phi)
	);
	const azimuth = (fromSouth + Math.PI) % (2 * Math.PI);
	return { azimuth, altitude };
}

/** below this the shadows run off the map, and the sun is mostly behind houses and hills anyway */
export const MIN_SUN_ALTITUDE = 2 * RAD;

export const isSunUp = (sun: SunPosition) => sun.altitude >= MIN_SUN_ALTITUDE;

/** day of the year, 1 = 1 January */
export function dayOfYear(date: Date) {
	return Math.round((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / DAY_MS);
}

/** minutes after midnight, rounded to `step` and kept within the day */
export function minuteOfDay(date: Date, step = 1) {
	return (Math.round((date.getHours() * 60 + date.getMinutes()) / step) * step) % (24 * 60);
}

/** a moment in the browser's time zone, from a day of the year and minutes after midnight */
export const momentOf = (year: number, day: number, minute: number) =>
	new Date(year, 0, day, 0, minute);

/** points along each shadow outline */
const STEPS = 48;

/** the share of a tree's height its crown takes up, the trunk carries the rest */
const CROWN_SHARE = 2 / 3;

/**
 * The outline of the shadow a tree casts on flat ground, or null while the sun is too low.
 * The crown is an ellipsoid as wide as the tree's spread over the top two thirds of its
 * height, on a trunk whose shadow joins the crown's to the foot of the tree.
 */
export function shadowRing(foot: LngLat, size: TreeSize, sun: SunPosition): LngLat[] | null {
	if (!isSunUp(sun) || size.height <= 0) return null;
	const cot = 1 / Math.tan(sun.altitude);
	const radius = Math.max(size.spread / 2, 0.05);
	const halfHeight = (size.height * CROWN_SHARE) / 2;
	// how far the crown's shadow lies from the trunk, and its half length along that line
	const offset = (size.height - halfHeight) * cot;
	const length = Math.hypot(radius, halfHeight * cot);
	const trunk = Math.min(Math.max(size.spread * 0.04, 0.08), radius * 0.9);
	const trunkShows = offset - length * Math.sqrt(1 - (trunk / radius) ** 2) > 0;

	// local frame: x along the shadow, y to its left, in meters;
	// with the trunk showing, walk only the far side of the crown between the trunk's edges
	const edge = trunkShows ? Math.PI - Math.asin(trunk / radius) : Math.PI;
	const local: [number, number][] = [];
	for (let i = 0; i <= STEPS; i++) {
		const a = -edge + (2 * edge * i) / STEPS;
		local.push([offset + length * Math.cos(a), radius * Math.sin(a)]);
	}
	if (trunkShows) local.push([0, trunk], [0, -trunk], local[0]);
	else local[STEPS] = local[0];

	// the shadow points away from the sun
	const bearing = sun.azimuth + Math.PI;
	const [east, north] = [Math.sin(bearing), Math.cos(bearing)];
	return local.map(([x, y]) => offsetMeters(foot, x * east - y * north, x * north + y * east));
}

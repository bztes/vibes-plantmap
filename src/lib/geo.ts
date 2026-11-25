const EARTH_RADIUS = 6_371_008.8;
const METERS_PER_DEGREE = (Math.PI / 180) * EARTH_RADIUS;

export type LngLat = [lng: number, lat: number];

/** The point the given meters east and north of `origin`, flat-earth, fine within a garden. */
export function offsetMeters([lng, lat]: LngLat, east: number, north: number): LngLat {
	return [
		lng + east / (METERS_PER_DEGREE * Math.cos((lat * Math.PI) / 180)),
		lat + north / METERS_PER_DEGREE
	];
}

/** Approximates a circle with the given radius in meters as a polygon ring. */
export function circleRing(center: LngLat, radius: number, steps = 64): LngLat[] {
	const ring: LngLat[] = [];
	for (let i = 0; i <= steps; i++) {
		const a = (i / steps) * 2 * Math.PI;
		ring.push(offsetMeters(center, radius * Math.cos(a), radius * Math.sin(a)));
	}
	return ring;
}

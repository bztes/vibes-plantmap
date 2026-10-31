const EARTH_RADIUS = 6_371_008.8;
const METERS_PER_DEGREE = (Math.PI / 180) * EARTH_RADIUS;

export type LngLat = [lng: number, lat: number];

/** Approximates a circle with the given radius in meters as a polygon ring. */
export function circleRing([lng, lat]: LngLat, radius: number, steps = 64): LngLat[] {
	const dLat = radius / METERS_PER_DEGREE;
	const dLng = radius / (METERS_PER_DEGREE * Math.cos((lat * Math.PI) / 180));
	const ring: LngLat[] = [];
	for (let i = 0; i <= steps; i++) {
		const a = (i / steps) * 2 * Math.PI;
		ring.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
	}
	return ring;
}

/** Haversine distance in meters. */
export function distance([lng1, lat1]: LngLat, [lng2, lat2]: LngLat) {
	const toRad = Math.PI / 180;
	const dLat = (lat2 - lat1) * toRad;
	const dLng = (lng2 - lng1) * toRad;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
	return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(a));
}

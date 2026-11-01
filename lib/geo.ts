/**
 * Geospatial geometry utilities for GeoAir Monitor
 * - Bounding box calculation
 * - Centroid calculation
 * - Point-in-polygon ray-casting test
 * - Sampling grid of points inside polygon (up to 9 points for batch API queries)
 * - Geodesic area calculation
 */

export interface Point {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/**
 * Calculate bounding box for a set of coordinates [[lng, lat], ...]
 */
export function getBoundingBox(coordinates: number[][]): BoundingBox {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of coordinates) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  return { minLng, minLat, maxLng, maxLat };
}

/**
 * Calculate centroid of a polygon exterior ring [[lng, lat], ...]
 */
export function getPolygonCentroid(coordinates: number[][]): Point {
  let sumLat = 0;
  let sumLng = 0;
  const count = coordinates.length;

  if (count === 0) return { lat: 0, lng: 0 };

  for (const [lng, lat] of coordinates) {
    sumLat += lat;
    sumLng += lng;
  }

  return {
    lat: sumLat / count,
    lng: sumLng / count,
  };
}

/**
 * Ray-casting algorithm to test if a point (lng, lat) is inside a polygon
 */
export function isPointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Sample a grid of up to 9 points inside a drawn polygon.
 * Used for batch fetching environmental data across an area.
 */
export function sampleGridInsidePolygon(
  polygon: number[][],
  maxPoints: number = 9
): Point[] {
  if (!polygon || polygon.length < 3) return [];

  const bbox = getBoundingBox(polygon);
  const centroid = getPolygonCentroid(polygon);

  const points: Point[] = [];
  const steps = 3; // 3x3 candidate grid

  const lngStep = (bbox.maxLng - bbox.minLng) / (steps + 1);
  const latStep = (bbox.maxLat - bbox.minLat) / (steps + 1);

  for (let i = 1; i <= steps; i++) {
    for (let j = 1; j <= steps; j++) {
      const candidateLng = bbox.minLng + i * lngStep;
      const candidateLat = bbox.minLat + j * latStep;

      if (isPointInPolygon([candidateLng, candidateLat], polygon)) {
        points.push({ lat: candidateLat, lng: candidateLng });
      }
    }
  }

  // Always include centroid if no points were caught or ensure centroid is sampled
  if (points.length === 0) {
    points.push(centroid);
  }

  return points.slice(0, maxPoints);
}

/**
 * Calculate approximate area of a polygon in square kilometers
 */
export function calculatePolygonAreaKm2(coordinates: number[][]): number {
  if (coordinates.length < 3) return 0;

  const R = 6378137; // Earth radius in meters
  let area = 0;

  for (let i = 0; i < coordinates.length; i++) {
    const j = (i + 1) % coordinates.length;
    const [lng1, lat1] = coordinates[i];
    const [lng2, lat2] = coordinates[j];

    const p1 = (lng1 * Math.PI) / 180;
    const p2 = (lng2 * Math.PI) / 180;
    const t1 = (lat1 * Math.PI) / 180;
    const t2 = (lat2 * Math.PI) / 180;

    area += (p2 - p1) * (2 + Math.sin(t1) + Math.sin(t2));
  }

  area = Math.abs((area * R * R) / 2.0);
  return Number((area / 1_000_000).toFixed(2));
}

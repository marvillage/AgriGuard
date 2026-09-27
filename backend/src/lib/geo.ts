export type LatLng = [number, number];

const earthRadiusM = 6371008.8;
export const squareMetresPerAcre = 4046.86;

export function parsePolygon(value: string | null | undefined): LatLng[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length < 3) return null;
    const points = parsed.filter(
      (point): point is LatLng =>
        Array.isArray(point) && typeof point[0] === "number" && typeof point[1] === "number"
    );
    return points.length >= 3 ? points : null;
  } catch {
    return null;
  }
}

// Spherical polygon area (same approach as Turf/Leaflet.draw).
export function polygonAreaM2(points: LatLng[]) {
  if (points.length < 3) return 0;
  let total = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [lat1, lng1] = points[index];
    const [lat2, lng2] = points[(index + 1) % points.length];
    total +=
      toRadians(lng2 - lng1) *
      (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)));
  }
  return Math.abs((total * earthRadiusM * earthRadiusM) / 2);
}

export function polygonCentroid(points: LatLng[]): LatLng {
  const lat = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const lng = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  return [lat, lng];
}

export function acresFromPolygon(points: LatLng[]) {
  return polygonAreaM2(points) / squareMetresPerAcre;
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

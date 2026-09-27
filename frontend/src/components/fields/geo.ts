import type { LatLng } from "@/lib/types";

const earthRadiusM = 6371008.8;
const squareMetresPerAcre = 4046.86;

export const indiaCenter: LatLng = [20.5937, 78.9629];

export function parseBoundary(value: string | null | undefined): LatLng[] | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    const points = parsed.filter(
      (point): point is LatLng => Array.isArray(point) && typeof point[0] === "number" && typeof point[1] === "number"
    );
    return points.length >= 3 ? points : null;
  } catch {
    return null;
  }
}

// Spherical polygon area, identical to the backend (src/lib/geo.ts) so the preview matches what is saved.
export function polygonAcres(points: LatLng[]) {
  if (points.length < 3) return 0;
  let total = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [lat1, lng1] = points[index];
    const [lat2, lng2] = points[(index + 1) % points.length];
    total += toRadians(lng2 - lng1) * (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)));
  }
  return Math.abs((total * earthRadiusM * earthRadiusM) / 2) / squareMetresPerAcre;
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

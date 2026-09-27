import { randomUUID } from "node:crypto";
import db from "../config/database.js";
import { parsePolygon, squareMetresPerAcre, type LatLng } from "../lib/geo.js";
import { computeFieldNdvi } from "../lib/ndvi.js";
import { saveUpload } from "../lib/uploads.js";
import { AppError } from "../utils/AppError.js";
import type { AuthUser } from "../utils/auth.types.js";
import { fieldAccess } from "./access.service.js";
import { analyzeField } from "./engine.service.js";

export function fieldPolygon(field: { boundary: string | null; latitude: number | null; longitude: number | null; area: number }, farm: { latitude: number | null; longitude: number | null }) {
  const drawn = parsePolygon(field.boundary);
  if (drawn) return { polygon: drawn, approximate: false };
  const lat = field.latitude ?? farm.latitude;
  const lng = field.longitude ?? farm.longitude;
  if (lat === null || lng === null) return null;
  const halfSide = Math.sqrt(field.area * squareMetresPerAcre) / 2;
  const dLat = halfSide / 111320;
  const dLng = halfSide / (111320 * Math.cos((lat * Math.PI) / 180));
  const polygon: LatLng[] = [
    [lat - dLat, lng - dLng],
    [lat - dLat, lng + dLng],
    [lat + dLat, lng + dLng],
    [lat + dLat, lng - dLng],
  ];
  return { polygon, approximate: true };
}

// `until` looks for the latest clear scene before that date, which lets past scenes be recorded as history.
export async function refreshNdvi(user: AuthUser, fieldId: number, options: { until?: Date; lookbackDays?: number } = {}) {
  const { field, farm } = await fieldAccess(user, fieldId, { write: true });
  const shape = fieldPolygon(field, farm);
  if (!shape) throw new AppError("Set the field location or draw its boundary first", 400);

  const lookbackDays = options.lookbackDays ?? 60;
  const result = await computeFieldNdvi(shape.polygon, { lookbackDays, maxCloud: 50, until: options.until });
  if (!result) throw new AppError(`No cloud-free Sentinel-2 image of this field in the last ${lookbackDays} days`, 404);

  const existing = await db.orm.public.NdviSnapshot.where({ fieldId, sceneId: result.sceneId }).first();
  const imagePath = existing?.imagePath ?? `ndvi/${randomUUID()}.png`;
  await saveUpload(imagePath, result.png, "image/png");

  const values = {
    fieldId,
    sceneId: result.sceneId,
    sceneDate: result.sceneDate,
    cloudCover: result.cloudCover,
    meanNdvi: result.meanNdvi,
    minNdvi: result.minNdvi,
    maxNdvi: result.maxNdvi,
    validPixelRatio: result.validPixelRatio,
    zones: JSON.stringify(result.zones),
    bounds: JSON.stringify(result.bounds),
    imagePath,
  };
  const snapshot = existing
    ? await db.orm.public.NdviSnapshot.where({ id: existing.id }).update(values)
    : await db.orm.public.NdviSnapshot.create(values);

  if (!options.until) analyzeField(fieldId, { trigger: "ndvi" }).catch((error) => console.error("analysis after NDVI failed", error));
  return { ...present(snapshot!), approximate: shape.approximate, pixelCount: result.pixelCount };
}

export async function listNdvi(user: AuthUser, fieldId: number) {
  await fieldAccess(user, fieldId);
  const rows = await db.orm.public.NdviSnapshot.where({ fieldId }).orderBy((s) => s.sceneDate.desc()).limit(12).all();
  return rows.map(present);
}

function present(snapshot: Awaited<ReturnType<typeof db.orm.public.NdviSnapshot.first>> & object) {
  return {
    ...snapshot,
    zones: JSON.parse(snapshot.zones) as { low: number; medium: number; high: number },
    bounds: JSON.parse(snapshot.bounds) as [[number, number], [number, number]],
    imageUrl: `/uploads/${snapshot.imagePath}`,
  };
}

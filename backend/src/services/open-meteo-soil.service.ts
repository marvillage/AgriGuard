import db from "../config/database.js";
import { publish } from "../lib/events.js";
import { parseTimestamp } from "../lib/time.js";
import { farmMemberIds } from "./access.service.js";
import { getSoilHistory, type SoilPoint } from "./weather.service.js";

// A field without its own node gets Open-Meteo's modelled soil readings for its location, stored hourly
// with source OPEN_METEO so the app never presents them as field measurements.
export async function syncOpenMeteoReadings(fieldId: number, pastDays = 2, relayed?: { points: SoilPoint[]; notes: string }) {
  const field = await db.orm.public.Field.first({ id: fieldId });
  if (!field) return 0;
  // A phone controller has no soil sensor, so only a sensor box replaces the model readings.
  const node = await db.orm.public.Device.where({ fieldId, kind: "NODE" }).first();
  if (node) return 0;
  const farm = (await db.orm.public.Farm.first({ id: field.farmId }))!;
  const latitude = field.latitude ?? farm.latitude;
  const longitude = field.longitude ?? farm.longitude;
  if (latitude === null || longitude === null) return 0;

  const last = await db.orm.public.FieldObservation
    .where({ fieldId, source: "OPEN_METEO" })
    .orderBy((o) => o.observedAt.desc())
    .first();
  const after = parseTimestamp(last?.observedAt ?? null)?.getTime() ?? 0;
  const points = relayed?.points ?? (await getSoilHistory(latitude, longitude, pastDays));

  let added = 0;
  for (const point of points) {
    if (new Date(point.time).getTime() <= after) continue;
    await db.orm.public.FieldObservation.create({
      fieldId,
      source: "OPEN_METEO",
      soilMoisture: point.soilMoisture,
      soilTemperature: point.soilTemperature,
      temperature: point.temperature,
      humidity: point.humidity,
      rainfall: point.rainMm && point.rainMm > 0 ? point.rainMm : null,
      notes: relayed?.notes ?? null,
      observedAt: point.time,
    });
    added += 1;
  }
  if (added) publish(await farmMemberIds(farm.id), "telemetry", { fieldId });
  return added;
}

export async function syncOpenMeteoAllFields() {
  const fields = await db.orm.public.Field.select("id").all();
  let failed = 0;
  for (const field of fields) {
    await syncOpenMeteoReadings(field.id).catch((error) => {
      failed += 1;
      console.error(`Open-Meteo soil sync for field ${field.id} failed`, error);
    });
  }
  return failed;
}

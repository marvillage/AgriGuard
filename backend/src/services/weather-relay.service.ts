import db from "../config/database.js";
import { parseTimestamp } from "../lib/time.js";
import type { AuthUser } from "../utils/auth.types.js";
import { accessibleFieldIds } from "./access.service.js";
import { analyzeField } from "./engine.service.js";
import { syncOpenMeteoReadings } from "./open-meteo-soil.service.js";
import {
  forecastAgeMs,
  forecastKey,
  forecastRequestUrl,
  parseForecast,
  parseSoil,
  soilRequestUrl,
  storeForecast,
  type ForecastBody,
  type SoilBody,
} from "./weather.service.js";

// Open-Meteo refuses Render's shared servers once their daily quota is used up. A signed-in browser then fetches
// the same Open-Meteo data for the user's own fields and hands it over, and it is checked and stored as Open-Meteo data.
const soilStaleMs = 2 * 3600 * 1000;
const forecastStaleMs = 3600 * 1000;
const relayNote = "Open-Meteo data fetched by a signed-in user's browser";

interface Place {
  latitude: number;
  longitude: number;
  pastDays: number;
}

interface SoilPlace {
  fieldId: number;
  latitude: number;
  longitude: number;
  lastReadingAt: number;
}

async function userPlaces(user: AuthUser) {
  const fieldIds = await accessibleFieldIds(user);
  const fields = fieldIds.length ? await db.orm.public.Field.where((f) => f.id.in(fieldIds)).all() : [];
  const farmIds = [...new Set(fields.map((field) => field.farmId))];
  const farms = farmIds.length ? await db.orm.public.Farm.where((f) => f.id.in(farmIds)).all() : [];
  const forecasts = new Map<string, Place>();
  const soil: SoilPlace[] = [];
  const add = (latitude: number, longitude: number, pastDays: number) => forecasts.set(forecastKey(latitude, longitude, pastDays), { latitude, longitude, pastDays });

  for (const farm of farms) if (farm.latitude !== null && farm.longitude !== null) add(farm.latitude, farm.longitude, 2);
  for (const field of fields) {
    const farm = farms.find((item) => item.id === field.farmId);
    const latitude = field.latitude ?? farm?.latitude ?? null;
    const longitude = field.longitude ?? farm?.longitude ?? null;
    if (latitude === null || longitude === null) continue;
    add(latitude, longitude, 2);
    add(latitude, longitude, 14);
    const node = await db.orm.public.Device.where({ fieldId: field.id, kind: "NODE" }).first();
    if (node) continue;
    const last = await db.orm.public.FieldObservation
      .where({ fieldId: field.id, source: "OPEN_METEO" })
      .orderBy((o) => o.observedAt.desc())
      .first();
    soil.push({ fieldId: field.id, latitude, longitude, lastReadingAt: parseTimestamp(last?.observedAt ?? null)?.getTime() ?? 0 });
  }
  return { forecasts, soil };
}

export async function relayRequests(user: AuthUser) {
  const { forecasts, soil } = await userPlaces(user);
  const items: Array<{ id: string; url: string }> = [];
  for (const [key, place] of forecasts) {
    const age = await forecastAgeMs(key);
    if (age === null || age > forecastStaleMs) items.push({ id: `forecast:${key}`, url: forecastRequestUrl(place.latitude, place.longitude, place.pastDays) });
  }
  for (const place of soil) {
    if (Date.now() - place.lastReadingAt > soilStaleMs) items.push({ id: `soil:${place.fieldId}`, url: soilRequestUrl(place.latitude, place.longitude, 2) });
  }
  return items;
}

const near = (body: { latitude?: number; longitude?: number }, place: { latitude: number; longitude: number }) =>
  typeof body.latitude === "number" &&
  typeof body.longitude === "number" &&
  Math.abs(body.latitude - place.latitude) <= 0.25 &&
  Math.abs(body.longitude - place.longitude) <= 0.25;

const within = (values: unknown, low: number, high: number) =>
  Array.isArray(values) && values.every((value) => value === null || (typeof value === "number" && Number.isFinite(value) && value >= low && value <= high));

function checkedForecast(body: unknown, place: Place) {
  const data = body as ForecastBody;
  if (!data || typeof data !== "object" || !data.hourly || !data.daily || !near(data, place)) return null;
  const times = data.hourly.time;
  if (!Array.isArray(times) || times.length < 48 || !Array.isArray(data.daily.time) || data.daily.time.length < 3) return null;
  const now = Date.now() / 1000;
  if (times[0] > now - (place.pastDays - 1) * 86400 || times[times.length - 1] < now + 2 * 86400) return null;
  const plausible =
    within(data.hourly.temperature_2m, -60, 60) &&
    within(data.hourly.relative_humidity_2m, 0, 100) &&
    within(data.hourly.precipitation, 0, 500) &&
    within(data.hourly.et0_fao_evapotranspiration, 0, 5);
  return plausible ? parseForecast(data, place.latitude, place.longitude) : null;
}

function checkedSoil(body: unknown, place: SoilPlace) {
  const data = body as SoilBody;
  if (!data || typeof data !== "object" || !data.hourly || !Array.isArray(data.hourly.time) || !near(data, place)) return null;
  const plausible =
    within(data.hourly.soil_moisture_9_to_27cm, 0, 1) &&
    within(data.hourly.temperature_2m, -60, 60) &&
    within(data.hourly.relative_humidity_2m, 0, 100) &&
    within(data.hourly.precipitation, 0, 500);
  if (!plausible) return null;
  const earliest = Date.now() - 4 * 86400000;
  return parseSoil(data).filter((point) => Date.parse(point.time) >= earliest);
}

export async function acceptRelay(user: AuthUser, items: Array<{ id: string; body?: unknown }>) {
  const { forecasts, soil } = await userPlaces(user);
  let stored = 0;
  for (const item of items) {
    const split = item.id.indexOf(":");
    const kind = item.id.slice(0, split);
    const ref = item.id.slice(split + 1);
    if (kind === "forecast") {
      const place = forecasts.get(ref);
      const forecast = place ? checkedForecast(item.body, place) : null;
      if (!forecast) continue;
      await storeForecast(ref, forecast);
      stored += 1;
    } else if (kind === "soil") {
      const place = soil.find((entry) => String(entry.fieldId) === ref);
      const points = place ? checkedSoil(item.body, place) : null;
      if (!place || !points) continue;
      await syncOpenMeteoReadings(place.fieldId, 2, { points, notes: relayNote });
      stored += 1;
    }
  }
  if (stored) for (const place of soil) analyzeField(place.fieldId, { trigger: "relay" }).catch(() => undefined);
  return { stored };
}

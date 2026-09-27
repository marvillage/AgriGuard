import db from "../config/database.js";
import { squareMetresPerAcre } from "../lib/geo.js";
import { daysAgo, parseTimestamp } from "../lib/time.js";
import { cropStage, profileFor, round, soilLimits, waterStatus } from "./agronomy.service.js";
import { irrigationEfficiency } from "../data/soils.js";
import { getForecast, type HourlyPoint } from "./weather.service.js";

interface Sample {
  etc: number;
  rain: number;
  irrigation: number;
  delta: number;
}

const hourMs = 3600 * 1000;
const stepHours = 6;

// Learns soil-moisture change per 6-hour step from this field's own history:
// delta = b0 + b1 * ETc + b2 * rain + b3 * irrigation (ridge least squares), then rolls it forward hourly over the forecast.
export async function forecastMoisture(fieldId: number, now = new Date()) {
  const field = await db.orm.public.Field.first({ id: fieldId });
  if (!field) return null;
  const farm = (await db.orm.public.Farm.first({ id: field.farmId }))!;
  const lat = field.latitude ?? farm.latitude;
  const lng = field.longitude ?? farm.longitude;
  if (lat === null || lng === null) return null;

  const crop = await db.orm.public.Crop.where({ fieldId, status: "ACTIVE" }).orderBy((c) => c.createdAt.desc()).first();
  const stage = cropStage(crop, profileFor(crop), now);
  const { fieldCapacity, wiltingPoint } = soilLimits(field);
  const refillPoint = waterStatus(field, stage, null).refillPoint;
  const method = (field.irrigationMethod ?? farm.irrigationMethod ?? "flood").toLowerCase();
  const efficiency = irrigationEfficiency[method] ?? 0.55;
  const areaM2 = field.area * squareMetresPerAcre;

  const readings = await db.orm.public.FieldObservation
    .where({ fieldId })
    .where((o) => o.observedAt.gte(daysAgo(14, now).toISOString()))
    .where((o) => o.soilMoisture.isNotNull())
    .select("observedAt", "soilMoisture")
    .orderBy((o) => o.observedAt.asc())
    .all();
  if (readings.length === 0) return null;

  const hourly = new Map<number, { sum: number; count: number }>();
  for (const reading of readings) {
    const at = parseTimestamp(reading.observedAt);
    if (!at || reading.soilMoisture === null) continue;
    const bucket = Math.floor(at.getTime() / hourMs);
    const entry = hourly.get(bucket) ?? { sum: 0, count: 0 };
    entry.sum += reading.soilMoisture;
    entry.count += 1;
    hourly.set(bucket, entry);
  }

  const events = await db.orm.public.IrrigationEvent
    .where({ fieldId })
    .where((e) => e.startedAt.gte(daysAgo(15, now).toISOString()))
    .all();
  const irrigationMm = new Map<number, number>();
  for (const event of events) {
    const start = parseTimestamp(event.startedAt);
    const end = parseTimestamp(event.endedAt) ?? now;
    if (!start || !event.litres) continue;
    const hours = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / hourMs));
    const perHour = event.litres / areaM2 / hours;
    for (let index = 0; index < hours; index += 1) {
      const bucket = Math.floor(start.getTime() / hourMs) + index;
      irrigationMm.set(bucket, (irrigationMm.get(bucket) ?? 0) + perHour * efficiency);
    }
  }

  const weather = await getForecast(lat, lng, 14).catch(() => null);
  const weatherByHour = new Map<number, HourlyPoint>();
  for (const point of weather?.hourly ?? []) {
    weatherByHour.set(Math.floor(new Date(point.time).getTime() / hourMs), point);
  }

  // Train on 6-hour steps: hour-to-hour moisture changes are smaller than sensor noise.
  const samples: Sample[] = [];
  const buckets = [...hourly.keys()].sort((a, b) => a - b);
  const blockMean = (start: number) => {
    const values: number[] = [];
    for (let hour = start; hour < start + stepHours; hour += 1) {
      const entry = hourly.get(hour);
      if (entry) values.push(entry.sum / entry.count);
    }
    return values.length >= stepHours / 2 ? values.reduce((a, b) => a + b, 0) / values.length : null;
  };
  const firstBlock = buckets.length ? buckets[0] - (buckets[0] % stepHours) : 0;
  const lastHour = buckets[buckets.length - 1] ?? 0;
  for (let start = firstBlock; start + 2 * stepHours <= lastHour + 1; start += stepHours) {
    const current = blockMean(start);
    const next = blockMean(start + stepHours);
    if (current === null || next === null) continue;
    let etc = 0;
    let rain = 0;
    let irrigation = 0;
    let covered = true;
    for (let hour = start + stepHours / 2; hour < start + stepHours + stepHours / 2; hour += 1) {
      const point = weatherByHour.get(hour);
      if (!point) {
        covered = false;
        break;
      }
      etc += point.et0 * stage.kc;
      rain += point.rainMm;
      irrigation += irrigationMm.get(hour) ?? 0;
    }
    if (covered) samples.push({ etc, rain, irrigation, delta: next - current });
  }

  const physicsScale = 0.1 / Math.max(0.15, stage.rootDepthM);
  const physics = { intercept: 0, etc: -physicsScale, rain: 0.8 * physicsScale, irrigation: physicsScale };
  const learned = samples.length >= 16 ? fitRidge(samples) : null;
  const plausible = learned && learned.coefficients.etc < 0 && learned.coefficients.irrigation >= 0 && learned.r2 >= 0.2;
  const model = plausible ? learned!.coefficients : physics;

  const lastBucket = buckets[buckets.length - 1];
  const lastValue = hourly.get(lastBucket)!;
  let moisture = lastValue.sum / lastValue.count;
  const startBucket = Math.floor(now.getTime() / hourMs);
  const points: Array<{ time: string; moisture: number; rainMm: number }> = [];
  let refillAt: string | null = moisture <= refillPoint ? new Date(startBucket * hourMs).toISOString() : null;

  for (let index = 1; index <= 72; index += 1) {
    const bucket = startBucket + index;
    const point = weatherByHour.get(bucket);
    const etc = (point?.et0 ?? 0.15) * stage.kc;
    const rain = point?.rainMm ?? 0;
    moisture += (plausible ? model.intercept / stepHours : model.intercept) + model.etc * etc + model.rain * rain;
    if (moisture > fieldCapacity) moisture = fieldCapacity + (moisture - fieldCapacity) * 0.5;
    moisture = Math.max(wiltingPoint - 2, Math.min(fieldCapacity + 6, moisture));
    const time = new Date(bucket * hourMs).toISOString();
    points.push({ time, moisture: round(moisture), rainMm: round(rain) });
    if (!refillAt && moisture <= refillPoint) refillAt = time;
  }

  return {
    model: plausible ? "learned" : "physics",
    samples: samples.length,
    r2: learned ? round(learned.r2, 2) : null,
    coefficients: {
      intercept: round(model.intercept, 4),
      etc: round(model.etc, 4),
      rain: round(model.rain, 4),
      irrigation: round(model.irrigation, 4),
    },
    current: round(lastValue.sum / lastValue.count),
    refillPoint,
    fieldCapacity,
    wiltingPoint,
    refillAt,
    hoursUntilRefill: refillAt ? Math.max(0, Math.round((new Date(refillAt).getTime() - now.getTime()) / hourMs)) : null,
    points,
  };
}

function fitRidge(samples: Sample[]) {
  const rows = samples.map((s) => [1, s.etc, s.rain, s.irrigation]);
  const y = samples.map((s) => s.delta);
  const size = 4;
  const xtx = Array.from({ length: size }, () => new Array(size).fill(0));
  const xty = new Array(size).fill(0);
  rows.forEach((row, index) => {
    for (let i = 0; i < size; i += 1) {
      xty[i] += row[i] * y[index];
      for (let j = 0; j < size; j += 1) xtx[i][j] += row[i] * row[j];
    }
  });
  for (let i = 1; i < size; i += 1) xtx[i][i] += 0.01 * samples.length;
  const beta = solve(xtx, xty);

  const mean = y.reduce((a, b) => a + b, 0) / y.length;
  let residual = 0;
  let total = 0;
  rows.forEach((row, index) => {
    const predicted = row.reduce((sum, value, i) => sum + value * beta[i], 0);
    residual += (y[index] - predicted) ** 2;
    total += (y[index] - mean) ** 2;
  });

  return {
    coefficients: { intercept: beta[0], etc: beta[1], rain: beta[2], irrigation: beta[3] },
    r2: total > 0 ? 1 - residual / total : 0,
  };
}

function solve(matrix: number[][], vector: number[]) {
  const n = vector.length;
  const a = matrix.map((row, index) => [...row, vector[index]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    if (Math.abs(a[col][col]) < 1e-12) continue;
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = a[row][col] / a[col][col];
      for (let k = col; k <= n; k += 1) a[row][k] -= factor * a[col][k];
    }
  }
  return a.map((row, index) => (Math.abs(row[index]) < 1e-12 ? 0 : row[n] / row[index]));
}

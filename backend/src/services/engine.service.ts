import db from "../config/database.js";
import { getSoil, irrigationEfficiency } from "../data/soils.js";
import { squareMetresPerAcre } from "../lib/geo.js";
import { publish } from "../lib/events.js";
import { isFieldDeleting, withFieldLock } from "../lib/field-lock.js";
import { dayKey, hoursAgo, localClock, parseTimestamp } from "../lib/time.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import type { CropRow, DeviceRow, FarmRow, FieldRow, ObservationRow, ScheduleRow } from "../types/models.js";
import {
  cropEtMm,
  cropStage,
  irrigationPlan,
  methodFor,
  profileFor,
  round,
  waterStatus,
} from "./agronomy.service.js";
import { farmMemberIds } from "./access.service.js";
import { upsertRecommendation } from "./recommendation.service.js";
import { getForecast, solarWindow, summarizeForecast, type Forecast } from "./weather.service.js";

export type IrrigationAction =
  | "IRRIGATE"
  | "SKIP_RAIN"
  | "SKIP_WET"
  | "WAIT_SOLAR"
  | "BLOCKED_TANK"
  | "OUTSIDE_WINDOW"
  | "NO_DATA";

export type Level = "Low" | "Moderate" | "High";

export interface FieldContext {
  field: FieldRow;
  farm: FarmRow;
  crop: CropRow | null;
  device: DeviceRow | null;
  latest: ObservationRow | null;
  latestAgeMinutes: number | null;
  recent: ObservationRow[];
  watered: Watering[];
  schedules: ScheduleRow[];
  forecast: Forecast | null;
  weatherError: string | null;
  now: Date;
}

export interface Watering {
  litres: number;
  startedAt: string;
  endedAt: string;
  moistureBefore: number | null;
}

const staleAfterMinutes = 180;

export async function loadContext(fieldId: number, now = new Date()): Promise<FieldContext> {
  const field = await db.orm.public.Field.first({ id: fieldId });
  if (!field) throw new Error(`Field ${fieldId} not found`);
  const farm = (await db.orm.public.Farm.first({ id: field.farmId }))!;
  const crop = await db.orm.public.Crop
    .where({ fieldId, status: "ACTIVE" })
    .orderBy((c) => c.createdAt.desc())
    .first();
  const device = await db.orm.public.Device.where({ fieldId }).orderBy((d) => d.id.asc()).first();
  const recent = await db.orm.public.FieldObservation
    .where({ fieldId })
    .where((o) => o.observedAt.gte(hoursAgo(24, now).toISOString()))
    .where((o) => o.observedAt.lte(now.toISOString()))
    .orderBy((o) => o.observedAt.desc())
    .limit(600)
    .all();
  const latest =
    recent[0] ??
    (await db.orm.public.FieldObservation
      .where({ fieldId })
      .where((o) => o.observedAt.lte(now.toISOString()))
      .orderBy((o) => o.observedAt.desc())
      .first());
  const latestAt = parseTimestamp(latest?.observedAt ?? null);
  const watered = await unseenWatering(fieldId, latest, now);
  const schedules = await db.orm.public.PumpSchedule.where({ fieldId, enabled: true }).all();

  const lat = field.latitude ?? farm.latitude;
  const lng = field.longitude ?? farm.longitude;
  let forecast: Forecast | null = null;
  let weatherError: string | null = null;
  if (lat !== null && lng !== null) {
    try {
      forecast = await getForecast(lat, lng);
    } catch (error) {
      weatherError = (error as Error).message;
    }
  } else {
    weatherError = "Farm location is not set";
  }

  return {
    field,
    farm,
    crop,
    device,
    latest,
    latestAgeMinutes: latestAt ? Math.round((now.getTime() - latestAt.getTime()) / 60000) : null,
    recent,
    watered,
    schedules,
    forecast,
    weatherError,
    now,
  };
}

// Waterings the latest soil reading cannot show: all of them for the weather model, later ones for a sensor.
async function unseenWatering(fieldId: number, latest: ObservationRow | null, now: Date): Promise<Watering[]> {
  if (!latest || latest.soilMoisture === null) return [];
  const readAt = parseTimestamp(latest.observedAt)?.getTime() ?? 0;
  const live = latest.source === "DEVICE" || latest.source === "SIMULATOR";
  const events = await db.orm.public.IrrigationEvent
    .where({ fieldId })
    .where((e) => e.startedAt.gte(hoursAgo(72, now).toISOString()))
    .where((e) => e.startedAt.lte(now.toISOString()))
    .orderBy((e) => e.startedAt.asc())
    .limit(20)
    .all();
  const unseen = events.filter((event) => {
    if ((event.litres ?? 0) <= 0) return false;
    if (!event.endedAt) return !live;
    const ended = parseTimestamp(event.endedAt)?.getTime() ?? 0;
    return latest.source === "OPEN_METEO" || ended > readAt;
  });
  return Promise.all(
    unseen.map(async (event) => {
      const before = await db.orm.public.FieldObservation
        .where({ fieldId, source: latest.source })
        .where((o) => o.soilMoisture.isNotNull())
        .where((o) => o.observedAt.lte(event.startedAt))
        .orderBy((o) => o.observedAt.desc())
        .first();
      return { litres: event.litres ?? 0, startedAt: event.startedAt, endedAt: event.endedAt ?? now.toISOString(), moistureBefore: before?.soilMoisture ?? null };
    })
  );
}

// FAO-56 water balance: each watering refills the root zone, then the crop uses ETc every day until now.
export function moistureAfterWatering(
  reading: number,
  watered: Watering[],
  options: { field: FieldRow; farm: FarmRow; rootDepthM: number; fieldCapacity: number; etcMm: number | null; now: Date }
) {
  if (!watered.length || options.etcMm === null) return reading;
  const rootMm = options.rootDepthM * 1000;
  const areaM2 = options.field.area * squareMetresPerAcre;
  const efficiency = irrigationEfficiency[methodFor(options.field, options.farm)];
  const usePerDay = (options.etcMm / rootMm) * 100;
  let level: number | null = null;
  let at = 0;
  for (const event of watered) {
    const start = parseTimestamp(event.startedAt)?.getTime() ?? at;
    const base = event.moistureBefore ?? reading;
    const current = level === null ? base : Math.max(base, level - (usePerDay * (start - at)) / 86400000);
    level = Math.min(options.fieldCapacity, current + ((event.litres * efficiency) / areaM2 / rootMm) * 100);
    at = parseTimestamp(event.endedAt)?.getTime() ?? start;
  }
  if (level === null) return reading;
  const today = level - (usePerDay * Math.max(0, options.now.getTime() - at)) / 86400000;
  return round(Math.max(reading, Math.min(options.fieldCapacity, today)), 1);
}

export function decideIrrigation(context: FieldContext) {
  const { field, farm, crop, device, latest, latestAgeMinutes, forecast, now } = context;
  const profile = profileFor(crop);
  const stage = cropStage(crop, profile, now);
  const fresh = latest && latestAgeMinutes !== null && latestAgeMinutes <= staleAfterMinutes;
  const reading = fresh ? latest.soilMoisture : null;
  const weather = forecast ? summarizeForecast(forecast, now) : null;
  const et0 = weather?.et0Today ?? null;
  const etc = et0 !== null ? cropEtMm(et0, stage.kc) : null;
  const { fieldCapacity } = waterStatus(field, stage, null);
  const moisture =
    reading === null
      ? null
      : moistureAfterWatering(reading, context.watered, { field, farm, rootDepthM: stage.rootDepthM, fieldCapacity, etcMm: etc, now });
  const water = waterStatus(field, stage, moisture);
  const plan = irrigationPlan(field, farm, Math.max(water.needMm ?? 0, 1));
  const tankLevel = fresh ? latest.tankLevel : null;
  const lastWatering = context.watered.at(-1);
  const watering =
    reading !== null && moisture !== null && moisture > reading && lastWatering
      ? { reading, moisture, litres: Math.round(context.watered.reduce((sum, event) => sum + event.litres, 0)), endedAt: lastWatering.endedAt }
      : null;

  const base = {
    stage,
    water,
    weather,
    et0,
    etc,
    plan,
    moisture,
    watering,
    tankLevel,
    solar: null as ReturnType<typeof solarWindow> | null,
    critical: false,
  };

  if (moisture === null || moisture === undefined) {
    return { ...base, action: "NO_DATA" as IrrigationAction, params: {} };
  }

  if (device?.hasTankSensor && tankLevel !== null && tankLevel !== undefined && tankLevel < device.dryRunLevelPct) {
    return { ...base, action: "BLOCKED_TANK" as IrrigationAction, params: { level: round(tankLevel), limit: device.dryRunLevelPct } };
  }

  if (moisture > water.refillPoint) {
    return { ...base, action: "SKIP_WET" as IrrigationAction, params: { moisture: round(moisture) } };
  }

  const critical = moisture <= water.wiltingPoint + 0.35 * (water.refillPoint - water.wiltingPoint);
  base.critical = critical;

  if (weather && !critical) {
    const needMm = water.needMm ?? 0;
    const rainCovers = weather.rainNext24Mm >= Math.max(5, 0.5 * needMm) && weather.rainProbabilityNext24 >= 60;
    if (rainCovers) {
      return {
        ...base,
        action: "SKIP_RAIN" as IrrigationAction,
        params: { rain: weather.rainNext24Mm, probability: weather.rainProbabilityNext24, litres: plan.litres },
      };
    }
  }

  if (forecast && field.solarPreferred && farm.solarCapacityKw && field.pumpPowerKw && !critical) {
    const solar = solarWindow(forecast, farm.solarCapacityKw, field.pumpPowerKw, now);
    base.solar = solar;
    if (solar.start && !solar.activeNow) {
      const hoursAway = (new Date(solar.start).getTime() - now.getTime()) / 3600000;
      if (hoursAway > 0 && hoursAway <= 6) {
        return {
          ...base,
          action: "WAIT_SOLAR" as IrrigationAction,
          params: { time: localTime(solar.start), kwh: round(((plan.runMinutes ?? 0) / 60) * field.pumpPowerKw) },
        };
      }
    }
  }

  const smart = context.schedules.filter((schedule) => schedule.mode === "SMART");
  if (smart.length && !critical && !smart.some((schedule) => withinSchedule(schedule, now))) {
    return { ...base, action: "OUTSIDE_WINDOW" as IrrigationAction, params: {} };
  }

  return {
    ...base,
    action: "IRRIGATE" as IrrigationAction,
    params: { litres: plan.litres, minutes: plan.runMinutes ?? 0, duration: plan.duration },
  };
}

export function withinSchedule(schedule: ScheduleRow, now: Date) {
  const clock = localClock(now);
  if (!schedule.days.includes(String(clock.isoWeekday))) return false;
  const [hour, minute] = schedule.startTime.split(":").map(Number);
  const start = hour * 60 + minute;
  return clock.minutes >= start && clock.minutes < start + schedule.durationMinutes;
}

export function scheduleEnd(schedule: ScheduleRow, now: Date) {
  const clock = localClock(now);
  const [hour, minute] = schedule.startTime.split(":").map(Number);
  const remaining = hour * 60 + minute + schedule.durationMinutes - clock.minutes;
  return new Date(now.getTime() + Math.max(0, remaining) * 60000);
}

export function localTime(iso: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: env.timezone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export function localDay(isoDate: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "short" }).format(new Date(`${isoDate}T12:00:00Z`));
}

export function levelOf(score: number | null): Level | null {
  if (score === null) return null;
  if (score >= 65) return "High";
  if (score >= 35) return "Moderate";
  return "Low";
}

// Soil Health Card ratings converted from kg/ha to mg/kg (0-15 cm, bulk density 1.5).
export function nutrientStatus(nutrient: "N" | "P" | "K", mgPerKg: number | null) {
  if (mgPerKg === null) return null;
  const limits = { N: [125, 250], P: [4.5, 11], K: [49, 125] }[nutrient];
  if (mgPerKg < limits[0]) return "Low";
  if (mgPerKg <= limits[1]) return "Medium";
  return "High";
}

// Hours in the last day with RH >= 90%, only when the sensor covered at least half of the day.
function sensorHumidHours(recent: ObservationRow[]) {
  const hours = new Map<number, number[]>();
  for (const reading of recent) {
    const at = parseTimestamp(reading.observedAt);
    if (!at || reading.humidity === null) continue;
    const bucket = Math.floor(at.getTime() / 3600000);
    hours.set(bucket, [...(hours.get(bucket) ?? []), reading.humidity]);
  }
  if (hours.size < 12) return null;
  const humid = [...hours.values()].filter((values) => values.reduce((a, b) => a + b, 0) / values.length >= 90).length;
  return Math.round((humid / hours.size) * 24);
}

export function assessRisks(context: FieldContext, decision: ReturnType<typeof decideIrrigation>, extras: { recentDisease: { name: string; confidence: number } | null; ndvi: number | null }) {
  const { recent, latest } = context;
  const weather = decision.weather;

  const waterStress = decision.water.stressPct === null
    ? null
    : decision.moisture !== null && decision.moisture !== undefined && decision.moisture > decision.water.refillPoint
      ? Math.min(34, decision.water.stressPct)
      : Math.max(35, decision.critical ? 80 : decision.water.stressPct);

  const humidHours = sensorHumidHours(recent) ?? weather?.humidHoursPast24 ?? 0;
  const temps = recent.map((o) => o.temperature).filter((value): value is number => typeof value === "number");
  const meanTemp = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : weather?.meanTempNext24 ?? 25;
  const tempFactor = meanTemp >= 15 && meanTemp <= 30 ? 1 : meanTemp > 30 && meanTemp <= 35 ? 0.6 : 0.3;
  let diseaseRisk = Math.min(100, humidHours * 6 * tempFactor + (weather?.humidHoursNext24 ?? 0) * 2);
  if (extras.recentDisease) diseaseRisk = Math.min(100, diseaseRisk + 35 * extras.recentDisease.confidence);
  diseaseRisk = Math.round(diseaseRisk);

  let weatherRisk = 0;
  if (weather) {
    if (weather.maxTempNext3Days >= 38) weatherRisk += 50;
    else if (weather.maxTempNext3Days >= 35) weatherRisk += 25;
    const heavy = weather.heaviestRainDay?.rainMm ?? 0;
    if (heavy >= 50) weatherRisk += 45;
    else if (heavy >= 25) weatherRisk += 20;
    if (weather.maxWindNext3Days >= 40) weatherRisk += 20;
  }
  weatherRisk = Math.min(100, weatherRisk);

  const statuses = {
    N: nutrientStatus("N", latest?.nitrogen ?? null),
    P: nutrientStatus("P", latest?.phosphorus ?? null),
    K: nutrientStatus("K", latest?.potassium ?? null),
  };
  const known = Object.values(statuses).filter(Boolean);
  const nutrientStress = known.length
    ? Math.min(100, known.filter((s) => s === "Low").length * 30 + known.filter((s) => s === "Medium").length * 10)
    : null;

  const weighted =
    0.35 * (waterStress ?? 30) + 0.3 * diseaseRisk + 0.2 * (nutrientStress ?? 20) + 0.15 * weatherRisk;
  let cropHealth = Math.round(100 - weighted);
  if (extras.ndvi !== null) {
    const ndviScore = Math.max(0, Math.min(100, ((extras.ndvi - 0.15) / 0.65) * 100));
    cropHealth = Math.round(0.7 * cropHealth + 0.3 * ndviScore);
  }

  return {
    waterStress,
    diseaseRisk,
    weatherRisk,
    nutrientStress,
    cropHealth: Math.max(0, Math.min(100, cropHealth)),
    humidHours,
    meanTemp: round(meanTemp),
    nutrients: statuses,
    levels: {
      water: levelOf(waterStress),
      disease: levelOf(diseaseRisk),
      weather: levelOf(weatherRisk),
      nutrient: levelOf(nutrientStress),
    },
  };
}

export async function recentDiseaseFinding(fieldId: number, now = new Date()) {
  const scans = await db.orm.public.AIAssessment
    .where({ fieldId, kind: "SCAN" })
    .where((a) => a.createdAt.gte(hoursAgo(24 * 7, now).toISOString()))
    .orderBy((a) => a.createdAt.desc())
    .include("diseasePredictions", (p) => p.orderBy((d) => d.rank.asc()).limit(1))
    .limit(5)
    .all();
  for (const scan of scans) {
    const top = scan.diseasePredictions[0];
    if (top && top.label && !top.label.toLowerCase().startsWith("healthy") && top.confidence >= 0.5) {
      return { name: top.diseaseName, confidence: top.confidence };
    }
  }
  return null;
}

export async function latestNdvi(fieldId: number, now = new Date()) {
  const snapshot = await db.orm.public.NdviSnapshot.where({ fieldId }).orderBy((s) => s.sceneDate.desc()).first();
  if (!snapshot) return null;
  const date = parseTimestamp(snapshot.sceneDate);
  if (!date || now.getTime() - date.getTime() > 30 * 86400000) return null;
  return snapshot;
}

type AnalyzeOptions = { now?: Date; notify?: boolean; trigger?: string };

export async function analyzeField(fieldId: number, options: AnalyzeOptions = {}) {
  return withFieldLock(fieldId, async () => {
    if (isFieldDeleting(fieldId)) throw new AppError("This field is being deleted", 409);
    return runAnalysis(fieldId, options);
  });
}

async function runAnalysis(fieldId: number, options: AnalyzeOptions) {
  const now = options.now ?? new Date();
  const context = await loadContext(fieldId, now);
  const decision = decideIrrigation(context);
  const disease = await recentDiseaseFinding(fieldId, now);
  const ndviSnapshot = await latestNdvi(fieldId, now);
  const risks = assessRisks(context, decision, { recentDisease: disease, ndvi: ndviSnapshot?.meanNdvi ?? null });
  const cropName = decision.stage.profile?.name ?? context.crop?.name ?? "the crop";

  const assessment = await db.orm.public.AIAssessment.create({
    fieldId,
    cropId: context.crop?.id ?? null,
    kind: "RISK",
    status: "COMPLETED",
    cropHealthScore: risks.cropHealth,
    waterStress: risks.waterStress,
    diseaseRisk: risks.diseaseRisk,
    weatherRisk: risks.weatherRisk,
    nutrientStress: risks.nutrientStress,
    ndvi: ndviSnapshot?.meanNdvi ?? null,
    summary: JSON.stringify({ action: decision.action, levels: risks.levels, trigger: options.trigger ?? "job" }),
    completedAt: now.toISOString(),
  });

  await db.orm.public.IrrigationPrediction.create({
    assessmentId: assessment.id,
    waterStressLevel: risks.levels.water ?? "Unknown",
    recommendedAction: decision.action,
    recommendedAmount: decision.action === "IRRIGATE" ? decision.plan.litres : 0,
    confidence: decision.moisture !== null ? 0.85 : 0.3,
    reasoning: JSON.stringify({ ...decision.params, depletionMm: decision.water.depletionMm, refillPoint: decision.water.refillPoint }),
  });

  if (decision.weather) {
    await db.orm.public.WeatherPrediction.create({
      assessmentId: assessment.id,
      rainfallProbability: decision.weather.rainProbabilityNext24,
      temperature: decision.weather.tempNow,
      humidity: decision.weather.humidityNow,
      weatherRiskLevel: risks.levels.weather,
      riskDescription: `Rain next 24 h ${decision.weather.rainNext24Mm} mm; max temp next 3 days ${decision.weather.maxTempNext3Days}°C`,
      recommendedAction: decision.action,
    });
  }

  if (risks.nutrientStress !== null) {
    await db.orm.public.NutrientPrediction.create({
      assessmentId: assessment.id,
      nitrogenStatus: risks.nutrients.N,
      phosphorusStatus: risks.nutrients.P,
      potassiumStatus: risks.nutrients.K,
      recommendedAction: risks.nutrientStress >= 30 ? "Run soil-test based fertilizer plan" : "No action",
      confidence: 0.6,
    });
  }

  await recordDecision(fieldId, decision, now);
  await emitRecommendations(context, decision, risks, assessment.id, cropName, ndviSnapshot, disease);

  const memberIds = await farmMemberIds(context.farm.id);
  publish(memberIds, "analysis", { fieldId, action: decision.action, cropHealth: risks.cropHealth });

  return { context, decision, risks, assessment };
}

export async function recordDecision(fieldId: number, decision: ReturnType<typeof decideIrrigation>, now = new Date()) {
  const last = await db.orm.public.IrrigationDecision.where({ fieldId }).orderBy((d) => d.decidedAt.desc()).first();
  const lastAt = parseTimestamp(last?.decidedAt ?? null);
  const changed = !last || last.action !== decision.action;
  const old = !lastAt || now.getTime() - lastAt.getTime() >= 30 * 60000;
  if (!changed && !old) return last;

  return db.orm.public.IrrigationDecision.create({
    fieldId,
    action: decision.action,
    reason: JSON.stringify(decision.params),
    soilMoisture: decision.moisture ?? null,
    refillPoint: decision.water.refillPoint,
    depletionMm: decision.water.depletionMm,
    rainNext24Mm: decision.weather?.rainNext24Mm ?? null,
    rainProbability: decision.weather?.rainProbabilityNext24 ?? null,
    et0: decision.et0,
    etc: decision.etc,
    recommendedLitres: decision.action === "IRRIGATE" ? decision.plan.litres : null,
    runMinutes: decision.action === "IRRIGATE" ? decision.plan.runMinutes : null,
    decidedAt: now.toISOString(),
  });
}

async function emitRecommendations(
  context: FieldContext,
  decision: ReturnType<typeof decideIrrigation>,
  risks: ReturnType<typeof assessRisks>,
  assessmentId: number,
  cropName: string,
  ndviSnapshot: Awaited<ReturnType<typeof latestNdvi>>,
  disease: Awaited<ReturnType<typeof recentDiseaseFinding>>
) {
  const { field, farm, device } = context;
  const common = { fieldId: field.id, farmId: farm.id, assessmentId };
  const fieldName = field.name;
  const autoPump = device && device.pumpMode === "AUTO";
  const weather = decision.weather;

  if (decision.action === "IRRIGATE" && decision.critical) {
    await upsertRecommendation({
      ...common,
      code: "WATER_STRESS_CRITICAL",
      type: "IRRIGATION",
      priority: "CRITICAL",
      params: { field: fieldName, moisture: round(decision.moisture ?? 0), wilting: decision.water.wiltingPoint },
      supportingFactors: `Soil moisture ${round(decision.moisture ?? 0)}% · Wilting point ${decision.water.wiltingPoint}% · ${getSoil(field.soilType).name} soil`,
    });
  } else if (decision.action === "IRRIGATE" && !autoPump) {
    await upsertRecommendation({
      ...common,
      code: "IRRIGATE_NOW",
      type: "IRRIGATION",
      priority: "HIGH",
      params: {
        field: fieldName,
        moisture: round(decision.moisture ?? 0),
        refill: decision.water.refillPoint,
        crop: cropName,
        litres: decision.plan.litres,
        minutes: decision.plan.runMinutes ?? 0,
        duration: decision.plan.duration,
      },
      supportingFactors: `Depletion ${decision.water.depletionMm} mm of ${decision.water.tawMm} mm available · ET0 ${decision.et0 ?? "–"} mm/day · Kc ${decision.stage.kc}`,
      expectedImpact: `Stops at field capacity instead of flooding: saves water versus a fixed ${decision.plan.method} schedule`,
    });
  }

  if (decision.action === "SKIP_RAIN") {
    await upsertRecommendation({
      ...common,
      code: "SKIP_RAIN",
      type: "IRRIGATION",
      priority: "MEDIUM",
      params: { field: fieldName, ...decision.params },
      supportingFactors: `Forecast ${weather?.rainNext24Mm} mm in 24 h · ${weather?.rainProbabilityNext24}% probability · Open-Meteo`,
      expectedImpact: `About ${decision.plan.litres.toLocaleString("en-IN")} L of pumping avoided`,
      notify: true,
    });
  }

  if (decision.action === "WAIT_SOLAR") {
    await upsertRecommendation({
      ...common,
      code: "WAIT_SOLAR",
      type: "IRRIGATION",
      priority: "LOW",
      params: { field: fieldName, ...decision.params },
      supportingFactors: `Solar capacity ${farm.solarCapacityKw} kW · Pump ${field.pumpPowerKw} kW · Irradiance forecast`,
    });
  }

  if (decision.action === "BLOCKED_TANK") {
    await upsertRecommendation({
      ...common,
      code: "TANK_LOW",
      type: "IRRIGATION",
      priority: "CRITICAL",
      params: { field: fieldName, ...decision.params },
      supportingFactors: "Ultrasonic tank sensor · Dry-run protection",
    });
  }

  if (risks.levels.disease === "High") {
    await upsertRecommendation({
      ...common,
      code: "DISEASE_RISK",
      type: "DISEASE",
      priority: "HIGH",
      params: { field: fieldName, hours: risks.humidHours, temp: risks.meanTemp, crop: cropName },
      supportingFactors: `Humidity ≥ 90% for ${risks.humidHours} h · Mean temperature ${risks.meanTemp}°C${disease ? ` · Recent scan: ${disease.name}` : ""}`,
    });
  }

  if (weather && weather.maxTempNext3Days >= 38) {
    const day = context.forecast?.daily.find((entry) => entry.tempMax === weather.maxTempNext3Days)?.date ?? dayKey(new Date());
    await upsertRecommendation({
      ...common,
      code: "HEAT_STRESS",
      type: "WEATHER",
      priority: "MEDIUM",
      params: { day: localDay(day), temp: round(weather.maxTempNext3Days), field: fieldName },
      dedupeScope: `heat:${day}`,
      supportingFactors: "Open-Meteo 3-day forecast",
    });
  }

  if (weather?.heaviestRainDay && weather.heaviestRainDay.rainMm >= 50) {
    await upsertRecommendation({
      ...common,
      code: "HEAVY_RAIN",
      type: "WEATHER",
      priority: "HIGH",
      params: { day: localDay(weather.heaviestRainDay.date), rain: round(weather.heaviestRainDay.rainMm), field: fieldName },
      dedupeScope: `rain:${weather.heaviestRainDay.date}`,
      supportingFactors: `${weather.heaviestRainDay.rainProbability}% probability · Open-Meteo`,
    });
  }

  if (weather && weather.maxWindNext3Days >= 40) {
    await upsertRecommendation({
      ...common,
      code: "HIGH_WIND",
      type: "WEATHER",
      priority: "MEDIUM",
      params: { wind: round(weather.maxWindNext3Days), field: fieldName },
      supportingFactors: "Open-Meteo 3-day forecast",
    });
  }

  const latest = context.latest;
  const nutrientNames: Record<"N" | "P" | "K", string> = { N: "Nitrogen", P: "Phosphorus", K: "Potassium" };
  const values = { N: latest?.nitrogen, P: latest?.phosphorus, K: latest?.potassium };
  for (const key of ["N", "P", "K"] as const) {
    if (risks.nutrients[key] === "Low") {
      await upsertRecommendation({
        ...common,
        code: "NUTRIENT_LOW",
        type: "FERTILIZER",
        priority: "MEDIUM",
        params: { nutrient: nutrientNames[key], value: round(values[key] ?? 0), field: fieldName, crop: cropName },
        dedupeScope: `${key}:${isoWeek(new Date())}`,
        supportingFactors: "RS485 NPK soil sensor · Soil Health Card rating thresholds",
      });
    }
  }

  if (ndviSnapshot) {
    const zones = JSON.parse(ndviSnapshot.zones) as { low: number; medium: number; high: number };
    if (zones.low >= 0.25) {
      await upsertRecommendation({
        ...common,
        code: "NDVI_LOW",
        type: "GENERAL",
        priority: "MEDIUM",
        params: {
          field: fieldName,
          date: ndviSnapshot.sceneDate.slice(0, 10),
          share: Math.round(zones.low * 100),
          ndvi: round(ndviSnapshot.meanNdvi, 2),
        },
        dedupeScope: `ndvi:${ndviSnapshot.sceneId}`,
        supportingFactors: `Sentinel-2 L2A · ${round(ndviSnapshot.cloudCover)}% scene cloud cover`,
      });
    }
  }
}

function isoWeek(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - start.getTime()) / 86400000 + start.getUTCDay() + 1) / 7);
  return `${date.getUTCFullYear()}-W${week}`;
}

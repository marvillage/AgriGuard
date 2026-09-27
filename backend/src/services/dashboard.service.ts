import db from "../config/database.js";
import { localCropName, t, type Language } from "../i18n/index.js";
import { dayKey, daysAgo, hoursAgo, parseTimestamp } from "../lib/time.js";
import type { AuthUser } from "../utils/auth.types.js";
import { accessibleFarms } from "./access.service.js";
import { cropStage, profileFor, waterStatus } from "./agronomy.service.js";
import { present as presentDevice } from "./device.service.js";
import { impactSummary } from "./impact.service.js";
import { hourlySeries } from "./overview.service.js";
import { listRecommendations } from "./recommendation.service.js";
import { getForecast, summarizeForecast } from "./weather.service.js";

export async function dashboard(user: AuthUser, language: Language) {
  const farms = await accessibleFarms(user);
  const farmIds = farms.map((entry) => entry.farm.id);
  const fields = farmIds.length ? await db.orm.public.Field.where((f) => f.farmId.in(farmIds)).orderBy((f) => f.id.asc()).all() : [];
  const fieldIds = fields.map((f) => f.id);

  const fieldRows = [];
  for (const field of fields) {
    const farm = farms.find((entry) => entry.farm.id === field.farmId)!.farm;
    const crop = await db.orm.public.Crop.where({ fieldId: field.id, status: "ACTIVE" }).orderBy((c) => c.createdAt.desc()).first();
    const stage = cropStage(crop, profileFor(crop));
    const latest = await db.orm.public.FieldObservation.where({ fieldId: field.id }).orderBy((o) => o.observedAt.desc()).first();
    const assessment = await db.orm.public.AIAssessment.where({ fieldId: field.id, kind: "RISK" }).orderBy((a) => a.createdAt.desc()).first();
    const decision = await db.orm.public.IrrigationDecision.where({ fieldId: field.id }).orderBy((d) => d.decidedAt.desc()).first();
    const device = await db.orm.public.Device.where({ fieldId: field.id }).orderBy((d) => d.id.asc()).first();
    const seen = parseTimestamp(latest?.observedAt ?? null);
    fieldRows.push({
      id: field.id,
      name: field.name,
      farmId: farm.id,
      farmName: farm.name,
      areaAcres: field.area,
      crop: crop ? { name: localCropName(language, crop.name) ?? crop.name, stage: stage.stage ? t(language, `stage.${stage.stage}`) : null, day: stage.dayOfSeason, progress: stage.progress } : null,
      moisture: latest?.soilMoisture ?? null,
      refillPoint: waterStatus(field, stage, null).refillPoint,
      minutesSinceReading: seen ? Math.round((Date.now() - seen.getTime()) / 60000) : null,
      cropHealth: assessment?.cropHealthScore ?? null,
      waterStress: assessment?.waterStress ?? null,
      diseaseRisk: assessment?.diseaseRisk ?? null,
      weatherRisk: assessment?.weatherRisk ?? null,
      action: decision ? { code: decision.action, message: t(language, `decision.${decision.action}`, safeJson(decision.reason)), at: decision.decidedAt } : null,
      device: device ? presentDevice(device) : null,
    });
  }

  const devices = fieldRows.map((f) => f.device).filter((d): d is NonNullable<typeof d> => d !== null);
  const healthValues = fieldRows.map((f) => f.cropHealth).filter((v): v is number => v !== null);
  const openAlerts = fieldIds.length
    ? await db.orm.public.Recommendation
        .where((r) => r.fieldId.in(fieldIds))
        .where({ status: "OPEN" })
        .where((r) => r.priority.in(["HIGH", "CRITICAL"]))
        .aggregate((a) => ({ count: a.count() }))
    : { count: 0 };

  const weather = [];
  for (const { farm } of farms) {
    if (farm.latitude === null || farm.longitude === null) continue;
    try {
      const forecast = await getForecast(farm.latitude, farm.longitude);
      weather.push({ farmId: farm.id, farmName: farm.name, summary: summarizeForecast(forecast), daily: forecast.daily.slice(2, 9) });
    } catch (error) {
      weather.push({ farmId: farm.id, farmName: farm.name, error: (error as Error).message });
    }
  }

  const trendRows = fieldIds.length
    ? await db.orm.public.AIAssessment
        .where((a) => a.fieldId.in(fieldIds))
        .where({ kind: "RISK" })
        .where((a) => a.createdAt.gte(daysAgo(14).toISOString()))
        .select("createdAt", "cropHealthScore", "waterStress", "diseaseRisk")
        .orderBy((a) => a.createdAt.asc())
        .all()
    : [];
  const byDay = new Map<string, { health: number[]; water: number[]; disease: number[] }>();
  for (const row of trendRows) {
    const at = parseTimestamp(row.createdAt);
    if (!at) continue;
    const key = dayKey(at);
    const entry = byDay.get(key) ?? { health: [], water: [], disease: [] };
    if (row.cropHealthScore !== null) entry.health.push(row.cropHealthScore);
    if (row.waterStress !== null) entry.water.push(row.waterStress);
    if (row.diseaseRisk !== null) entry.disease.push(row.diseaseRisk);
    byDay.set(key, entry);
  }
  const average = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null);
  const healthTrend = [...byDay.entries()].map(([day, entry]) => ({
    day,
    health: average(entry.health),
    waterStress: average(entry.water),
    diseaseRisk: average(entry.disease),
  }));

  const primary = fieldRows.find((f) => f.device?.online) ?? fieldRows.find((f) => f.device) ?? fieldRows.find((f) => f.moisture !== null) ?? null;
  let sensor = null;
  if (primary) {
    const readings = await db.orm.public.FieldObservation
      .where({ fieldId: primary.id })
      .where((o) => o.observedAt.gte(hoursAgo(24).toISOString()))
      .orderBy((o) => o.observedAt.asc())
      .limit(3000)
      .all();
    const latest = readings[readings.length - 1] ?? (await db.orm.public.FieldObservation.where({ fieldId: primary.id }).orderBy((o) => o.observedAt.desc()).first());
    sensor = { fieldId: primary.id, fieldName: primary.name, device: primary.device, latest, refillPoint: primary.refillPoint, action: primary.action, series: hourlySeries(readings) };
  }

  const impact = await impactSummary(user);

  return {
    stats: {
      farms: farms.length,
      fields: fields.length,
      devices: devices.length,
      devicesOnline: devices.filter((d) => d.online).length,
      avgCropHealth: average(healthValues),
      openAlerts: openAlerts.count,
    },
    impact: { totals: impact.totals, score: impact.score.value },
    weather,
    healthTrend,
    fields: fieldRows,
    sensor,
    recommendations: await listRecommendations(user, language, { status: "OPEN", limit: 6 }),
  };
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

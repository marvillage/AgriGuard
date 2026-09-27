import db from "../config/database.js";
import { getSoil } from "../data/soils.js";
import { asLanguage, cropDisplayName, localCropName, t, type Language } from "../i18n/index.js";
import { parseTimestamp, hoursAgo } from "../lib/time.js";
import type { AuthUser } from "../utils/auth.types.js";
import type { DecisionRow, ObservationRow } from "../types/models.js";
import { cropEtMm, round } from "./agronomy.service.js";
import { fieldAccess } from "./access.service.js";
import { present as presentDevice } from "./device.service.js";
import { assessRisks, decideIrrigation, latestNdvi, loadContext, recentDiseaseFinding } from "./engine.service.js";
import { forecastMoisture } from "./forecast.service.js";
import { solarWindow } from "./weather.service.js";

export async function fieldOverview(user: AuthUser, fieldId: number, languageInput?: string) {
  const { access } = await fieldAccess(user, fieldId);
  const language: Language = asLanguage(languageInput ?? (await db.orm.public.User.first({ id: user.id }))?.language);
  const context = await loadContext(fieldId);
  const decision = decideIrrigation(context);
  const disease = await recentDiseaseFinding(fieldId);
  const ndvi = await latestNdvi(fieldId);
  const risks = assessRisks(context, decision, { recentDisease: disease, ndvi: ndvi?.meanNdvi ?? null });
  const devices = await db.orm.public.Device.where({ fieldId }).orderBy((d) => d.id.asc()).all();
  const events = await db.orm.public.IrrigationEvent.where({ fieldId }).orderBy((e) => e.startedAt.desc()).limit(10).all();
  const decisions = await db.orm.public.IrrigationDecision.where({ fieldId }).orderBy((d) => d.decidedAt.desc()).limit(10).all();
  const forecast = await forecastMoisture(fieldId).catch(() => null);
  const readings = await db.orm.public.FieldObservation
    .where({ fieldId })
    .where((o) => o.observedAt.gte(hoursAgo(48).toISOString()))
    .orderBy((o) => o.observedAt.asc())
    .limit(4000)
    .all();

  const { field, farm, crop, latest } = context;
  const weatherDaily = context.forecast?.daily.map((day) => ({
    ...day,
    etc: cropEtMm(day.et0, decision.stage.kc),
  }));
  const solar =
    context.forecast && farm.solarCapacityKw && field.pumpPowerKw
      ? solarWindow(context.forecast, farm.solarCapacityKw, field.pumpPowerKw)
      : null;

  return {
    access,
    field,
    farm: { id: farm.id, name: farm.name, latitude: farm.latitude, longitude: farm.longitude, irrigationMethod: farm.irrigationMethod, solarCapacityKw: farm.solarCapacityKw },
    soil: getSoil(field.soilType),
    crop: crop ? { ...crop, name: localCropName(language, crop.name) ?? crop.name } : null,
    stage: {
      name: decision.stage.stage,
      label: decision.stage.stage ? t(language, `stage.${decision.stage.stage}`) : null,
      index: decision.stage.stageIndex,
      day: decision.stage.dayOfSeason,
      seasonDays: decision.stage.seasonDays,
      progress: decision.stage.progress,
      kc: decision.stage.kc,
      rootDepthM: decision.stage.rootDepthM,
      expectedHarvest: decision.stage.expectedHarvest,
      stages: decision.stage.profile?.stages ?? null,
      profile: decision.stage.profile ? { key: decision.stage.profile.key, name: cropDisplayName(language, decision.stage.profile.key, decision.stage.profile.name) } : null,
    },
    latest,
    latestAgeMinutes: context.latestAgeMinutes,
    water: decision.water,
    decision: {
      action: decision.action,
      message: t(language, `decision.${decision.action}`, decision.params),
      params: decision.params,
      plan: decision.plan,
      critical: decision.critical,
      et0: decision.et0,
      etc: decision.etc,
    },
    risks,
    weather: decision.weather,
    weatherDaily: weatherDaily ?? [],
    weatherError: context.weatherError,
    solar,
    forecast,
    ndvi: ndvi
      ? {
          ...ndvi,
          zones: JSON.parse(ndvi.zones),
          bounds: JSON.parse(ndvi.bounds),
          imageUrl: `/uploads/${ndvi.imagePath}`,
        }
      : null,
    devices: devices.map((device) => presentDevice(device)),
    events,
    decisions: decisions.map((d) => presentDecision(d, language)),
    schedules: context.schedules,
    series: hourlySeries(readings),
  };
}

export function presentDecision(decision: DecisionRow, language: Language) {
  return { ...decision, message: t(language, `decision.${decision.action}`, safeParams(decision.reason)) };
}

function safeParams(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function hourlySeries(readings: ObservationRow[]) {
  const buckets = new Map<number, ObservationRow[]>();
  for (const reading of readings) {
    const at = parseTimestamp(reading.observedAt);
    if (!at) continue;
    const bucket = Math.floor(at.getTime() / 3600000);
    buckets.set(bucket, [...(buckets.get(bucket) ?? []), reading]);
  }
  const mean = (rows: ObservationRow[], key: keyof ObservationRow) => {
    const values = rows.map((r) => r[key]).filter((v): v is number => typeof v === "number");
    return values.length ? round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  };
  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([bucket, rows]) => ({
      time: new Date(bucket * 3600000).toISOString(),
      soilMoisture: mean(rows, "soilMoisture"),
      temperature: mean(rows, "temperature"),
      humidity: mean(rows, "humidity"),
      tankLevel: mean(rows, "tankLevel"),
      solarW: mean(rows, "solarW"),
      flowRateLpm: mean(rows, "flowRateLpm"),
      pumpOn: rows.some((r) => r.pumpOn),
    }));
}

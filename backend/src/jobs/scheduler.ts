import db from "../config/database.js";
import { env } from "../config/env.js";
import { asLanguage } from "../i18n/index.js";
import { dayKey, hoursAgo, localClock, parseTimestamp } from "../lib/time.js";
import { irrigationPlan, round } from "../services/agronomy.service.js";
import { dailyBriefing } from "../services/ai-features.service.js";
import { analyzeField, localTime } from "../services/engine.service.js";
import { forecastMoisture } from "../services/forecast.service.js";
import { syncFieldLedger } from "../services/ledger.service.js";
import { notifyUser } from "../services/notification.service.js";
import { syncOpenMeteoAllFields } from "../services/open-meteo-soil.service.js";
import { upsertRecommendation } from "../services/recommendation.service.js";

const minute = 60 * 1000;
const running = new Set<string>();

async function guarded(name: string, task: () => Promise<void>) {
  if (running.has(name)) return;
  running.add(name);
  try {
    await task();
  } catch (error) {
    console.error(`job ${name} failed`, error);
  } finally {
    running.delete(name);
  }
}

export async function analyzeAllFields() {
  const fields = await db.orm.public.Field.select("id").all();
  for (const field of fields) {
    await analyzeField(field.id, { trigger: "job" }).catch((error) => console.error(`analysis of field ${field.id} failed`, error));
  }
}

export async function checkDevices() {
  const devices = await db.orm.public.Device.where((d) => d.lastSeenAt.isNotNull()).all();
  for (const device of devices) {
    // A phone controller goes quiet whenever its page is closed, which is normal.
    if (device.kind === "PHONE") continue;
    const seen = parseTimestamp(device.lastSeenAt);
    if (!seen || Date.now() - seen.getTime() < 30 * minute) continue;
    const field = await db.orm.public.Field.first({ id: device.fieldId });
    if (!field) continue;
    await upsertRecommendation({
      fieldId: field.id,
      farmId: field.farmId,
      code: "DEVICE_OFFLINE",
      type: "GENERAL",
      priority: "MEDIUM",
      params: { field: field.name, device: device.name, since: localTime(seen.toISOString()) },
      dedupeScope: `offline:${device.id}:${dayKey(new Date())}`,
      supportingFactors: `Last telemetry ${Math.round((Date.now() - seen.getTime()) / minute)} minutes ago`,
    });
  }
}

export async function checkStuckSensors() {
  const devices = await db.orm.public.Device.all();
  for (const device of devices) {
    const readings = await db.orm.public.FieldObservation
      .where({ deviceId: device.id })
      .where((o) => o.observedAt.gte(hoursAgo(6).toISOString()))
      .where((o) => o.soilMoisture.isNotNull())
      .select("soilMoisture")
      .all();
    if (readings.length < 20) continue;
    const values = readings.map((r) => r.soilMoisture!);
    if (Math.max(...values) - Math.min(...values) >= 0.05) continue;
    const field = await db.orm.public.Field.first({ id: device.fieldId });
    if (!field) continue;
    await upsertRecommendation({
      fieldId: field.id,
      farmId: field.farmId,
      code: "SENSOR_STUCK",
      type: "GENERAL",
      priority: "MEDIUM",
      params: { field: field.name, moisture: round(values[0]), hours: 6 },
      supportingFactors: `${readings.length} identical readings in 6 hours`,
    });
  }
}

export async function forecastAlerts() {
  const fields = await db.orm.public.Field.all();
  for (const field of fields) {
    const device = await db.orm.public.Device.where({ fieldId: field.id }).first();
    if (device?.pumpMode === "AUTO") continue;
    const forecast = await forecastMoisture(field.id).catch(() => null);
    if (!forecast?.refillAt || forecast.hoursUntilRefill === null) continue;
    if (forecast.hoursUntilRefill < 3 || forecast.hoursUntilRefill > 48) continue;
    const farm = await db.orm.public.Farm.first({ id: field.farmId });
    if (!farm) continue;
    const need = Math.max(1, ((forecast.fieldCapacity - forecast.refillPoint) / 100) * 1000 * 0.4);
    await upsertRecommendation({
      fieldId: field.id,
      farmId: farm.id,
      code: "MOISTURE_FORECAST",
      type: "IRRIGATION",
      priority: "LOW",
      params: {
        field: field.name,
        hours: forecast.hoursUntilRefill,
        refill: forecast.refillPoint,
        time: localTime(forecast.refillAt),
        litres: irrigationPlan(field, farm, need).litres,
      },
      supportingFactors: `${forecast.model === "learned" ? `Learned model (R² ${forecast.r2}, ${forecast.samples} hourly samples)` : "Physics model (FAO-56)"} · Open-Meteo ET0 and rain forecast`,
      notify: false,
    });
  }
}

export async function syncLedgers() {
  const fields = await db.orm.public.Field.select("id").all();
  for (const field of fields) await syncFieldLedger(field.id);
}

const briefed = new Set<string>();

export async function sendBriefings() {
  const clock = localClock();
  if (clock.hour !== 7) return;
  const users = await db.orm.public.User.where({ dailyBriefing: true }).all();
  for (const user of users) {
    const key = `${user.id}:${dayKey(new Date())}`;
    if (briefed.has(key)) continue;
    briefed.add(key);
    const briefing = await dailyBriefing({ id: user.id, email: user.email, name: user.name, role: user.role }, asLanguage(user.language));
    await notifyUser(user.id, { title: briefing.title, body: briefing.text, severity: "warning", link: "/dashboard" });
  }
}

export function startJobs() {
  if (!env.enableJobs) return;
  setTimeout(() => guarded("open-meteo", syncOpenMeteoAllFields), 10 * 1000);
  setInterval(() => guarded("open-meteo", syncOpenMeteoAllFields), 30 * minute);
  setTimeout(() => guarded("analyze", analyzeAllFields), 20 * 1000);
  setInterval(() => guarded("analyze", analyzeAllFields), 15 * minute);
  setInterval(() => guarded("devices", checkDevices), 5 * minute);
  setInterval(() => guarded("hourly", async () => {
    await syncLedgers();
    await checkStuckSensors();
    await forecastAlerts();
  }), 60 * minute);
  setInterval(() => guarded("briefings", sendBriefings), 10 * minute);
  console.log("Background jobs started");
}

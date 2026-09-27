import db from "../config/database.js";
import { generate } from "../lib/ai/index.js";
import { formatNumber, languageNames, t, type Language } from "../i18n/index.js";
import type { AuthUser } from "../utils/auth.types.js";
import { accessibleFarms } from "./access.service.js";
import { assessRisks, decideIrrigation, latestNdvi, loadContext, localTime, recentDiseaseFinding } from "./engine.service.js";
import { forecastMoisture } from "./forecast.service.js";
import { impactSummary } from "./impact.service.js";
import { listRecommendations } from "./recommendation.service.js";
import { solarWindow } from "./weather.service.js";

type FieldSnapshot = Awaited<ReturnType<typeof snapshotField>>;

async function snapshotField(fieldId: number) {
  const context = await loadContext(fieldId);
  const decision = decideIrrigation(context);
  const disease = await recentDiseaseFinding(fieldId);
  const ndvi = await latestNdvi(fieldId);
  const risks = assessRisks(context, decision, { recentDisease: disease, ndvi: ndvi?.meanNdvi ?? null });
  const forecast = await forecastMoisture(fieldId).catch(() => null);
  const solar =
    context.forecast && context.farm.solarCapacityKw && context.field.pumpPowerKw
      ? solarWindow(context.forecast, context.farm.solarCapacityKw, context.field.pumpPowerKw)
      : null;
  return { context, decision, risks, disease, forecast, solar };
}

export async function buildContext(user: AuthUser) {
  const farms = await accessibleFarms(user);
  const snapshots: FieldSnapshot[] = [];
  for (const { farm } of farms) {
    const fields = await db.orm.public.Field.where({ farmId: farm.id }).orderBy((f) => f.id.asc()).all();
    for (const field of fields.slice(0, 8)) snapshots.push(await snapshotField(field.id));
  }
  return { farms, snapshots };
}

function describeForLlm(context: Awaited<ReturnType<typeof buildContext>>, impact: Awaited<ReturnType<typeof impactSummary>>, recs: Awaited<ReturnType<typeof listRecommendations>>) {
  const lines: string[] = [];
  for (const { farm } of context.farms) {
    lines.push(`FARM ${farm.name} (${farm.location ?? "no location"}): irrigation ${farm.irrigationMethod}, electricity Rs ${farm.electricityRate}/kWh${farm.solarCapacityKw ? `, solar ${farm.solarCapacityKw} kW` : ""}`);
    for (const snap of context.snapshots.filter((s) => s.context.farm.id === farm.id)) {
      const { field, crop, device, latest } = snap.context;
      const d = snap.decision;
      lines.push(
        [
          `  FIELD ${field.name}: ${field.area} acres, ${field.soilType ?? "unknown"} soil`,
          crop ? `crop ${crop.name}${d.stage.dayOfSeason !== null ? ` day ${d.stage.dayOfSeason} (${d.stage.stage} stage, Kc ${d.stage.kc})` : ""}` : "no crop recorded",
          `soil moisture ${d.moisture ?? "unknown"}%${latest?.source === "OPEN_METEO" ? " (Open-Meteo model estimate for this location, not a field sensor)" : ""} (refill ${d.water.refillPoint}%, field capacity ${d.water.fieldCapacity}%, wilting ${d.water.wiltingPoint}%)`,
          `irrigation decision ${d.action}${d.action === "IRRIGATE" ? ` ${d.plan.litres} L (${d.plan.duration} of pumping at ${d.plan.flowLpm} L/min)` : ""}`,
          `risks: water ${snap.risks.levels.water ?? "?"}, disease ${snap.risks.levels.disease} (${snap.risks.diseaseRisk}), weather ${snap.risks.levels.weather}, crop health ${snap.risks.cropHealth}/100`,
          latest?.nitrogen !== null && latest?.nitrogen !== undefined ? `NPK ${latest.nitrogen}/${latest.phosphorus}/${latest.potassium} mg/kg (${snap.risks.nutrients.N}/${snap.risks.nutrients.P}/${snap.risks.nutrients.K})` : "",
          device ? `pump ${device.pumpOn ? "ON" : "OFF"} (${device.pumpMode})${latest?.tankLevel !== null && latest?.tankLevel !== undefined ? `, tank ${latest.tankLevel}%` : ""}` : "no field node",
          snap.forecast?.hoursUntilRefill !== null && snap.forecast?.hoursUntilRefill !== undefined ? `moisture forecast: refill point in ${snap.forecast.hoursUntilRefill} h (${snap.forecast.model} model)` : "",
          snap.disease ? `recent scan: ${snap.disease.name}` : "",
          snap.solar?.start ? `solar window ${localTime(snap.solar.start)}-${snap.solar.end ? localTime(snap.solar.end) : ""}` : "",
        ]
          .filter(Boolean)
          .join("; ")
      );
    }
    const weather = context.snapshots.find((s) => s.context.farm.id === farm.id)?.decision.weather;
    if (weather) {
      lines.push(`  WEATHER: rain next 24 h ${weather.rainNext24Mm} mm (${weather.rainProbabilityNext24}% chance), next 48 h ${weather.rainNext48Mm} mm, ET0 today ${weather.et0Today} mm, max temp next 3 days ${weather.maxTempNext3Days}°C, max wind ${weather.maxWindNext3Days} km/h`);
    }
  }
  lines.push(`IMPACT this season: ${impact.totals.litresSaved} L water saved, ${impact.totals.litresUsed} L used, ${impact.totals.kwhSaved} kWh saved, ${impact.totals.co2Kg} kg CO2 avoided, Rs ${impact.totals.rupeesSaved} saved, ${impact.totals.ureaKgSaved} kg urea saved`);
  if (recs.length) lines.push(`OPEN RECOMMENDATIONS: ${recs.slice(0, 6).map((r) => `[${r.priority}] ${r.fieldName}: ${r.title}`).join(" | ")}`);
  return lines.join("\n");
}

export async function chat(user: AuthUser, message: string, language: Language) {
  const context = await buildContext(user);
  const recs = await listRecommendations(user, "en", { status: "OPEN", limit: 10 });
  const impact = await impactSummary(user);

  await db.orm.public.ChatMessage.create({ userId: user.id, role: "user", content: message });

  let answer: string;
  let provider = "rules";
  if (context.snapshots.length === 0) {
    answer = t(language, "copilot.noFarm");
  } else {
    const history = await db.orm.public.ChatMessage.where({ userId: user.id }).orderBy((m) => m.createdAt.desc()).limit(11).all();
    const previous = history.reverse().slice(0, -1).slice(-8);
    const result = await generate({
      system: `You are AgriGuard Copilot, a practical farm advisor for Indian farmers. Answer in ${languageNames[language]} using simple words.
Use ONLY the live farm data below for facts about this farm; say so if something is not in the data. Give one clear action first, then a short reason with the numbers. Keep it under 110 words.
Only if the question is about pesticides or fertilizers: never invent doses; name the active ingredient and tell the farmer to follow the label and ask their local KVK.
When irrigation is due, give the litres and the pumping duration exactly as listed in the data.

LIVE FARM DATA (${new Date().toISOString()}):
${describeForLlm(context, impact, recs)}`,
      messages: [...previous.map((m) => ({ role: m.role === "assistant" ? ("assistant" as const) : ("user" as const), content: m.content })), { role: "user", content: message }],
      temperature: 0.3,
      maxTokens: 400,
    });
    if (result) {
      answer = result.text;
      provider = `${result.provider}:${result.model}`;
    } else {
      answer = ruleAnswer(message, context, impact, recs, language);
    }
  }

  const saved = await db.orm.public.ChatMessage.create({ userId: user.id, role: "assistant", content: answer, provider });
  return { answer, provider, id: saved.id };
}

export async function chatHistory(user: AuthUser) {
  const rows = await db.orm.public.ChatMessage.where({ userId: user.id }).orderBy((m) => m.createdAt.desc()).limit(40).all();
  return rows.reverse();
}

export async function clearHistory(user: AuthUser) {
  await db.orm.public.ChatMessage.where({ userId: user.id }).deleteAndCount();
}

const intents: Array<{ key: string; words: RegExp }> = [
  { key: "impact", words: /sav|impact|money|rupee|₹|co2|carbon|बचत|पैसा|बचाया|बचत/i },
  { key: "solar", words: /solar|sun|सोलर|सौर/i },
  { key: "pump", words: /pump|motor|tank|पंप|मोटर|टंकी/i },
  { key: "disease", words: /disease|blight|fung|leaf|spot|pest|रोग|बीमारी|कीट|पत्ती/i },
  { key: "fertilizer", words: /fertil|nitrogen|npk|urea|nutrient|खाद|यूरिया|उर्वरक/i },
  { key: "weather", words: /weather|rain|heat|temperature|forecast|मौसम|बारिश|गर्मी|तापमान/i },
  { key: "irrigation", words: /water|irrigat|moist|dry|पानी|सिंचाई|नमी/i },
  { key: "actions", words: /what.*do|todo|task|action|recommend|क्या करूं|काम|सलाह/i },
];

function ruleAnswer(
  message: string,
  context: Awaited<ReturnType<typeof buildContext>>,
  impact: Awaited<ReturnType<typeof impactSummary>>,
  recs: Awaited<ReturnType<typeof listRecommendations>>,
  language: Language
) {
  const intent = intents.find((item) => item.words.test(message))?.key;
  const named = context.snapshots.filter((s) => message.toLowerCase().includes(s.context.field.name.toLowerCase()));
  const targets = named.length ? named : context.snapshots.slice(0, 3);

  if (intent === "impact") {
    return t(language, "copilot.impact", {
      litres: impact.totals.litresSaved,
      kwh: impact.totals.kwhSaved,
      co2: impact.totals.co2Kg,
      rupees: impact.totals.rupeesSaved,
    });
  }

  if (intent === "weather") {
    const snap = targets[0];
    const w = snap.decision.weather;
    if (!w) return t(language, "copilot.fallback");
    return t(language, "copilot.weather", {
      farm: snap.context.farm.name,
      rain: w.rainNext24Mm,
      probability: w.rainProbabilityNext24,
      et0: w.et0Today,
      temp: w.maxTempNext3Days,
    });
  }

  if (intent === "actions") {
    return t(language, "copilot.recommendations", { list: recs.slice(0, 4).map((r) => `${r.fieldName}: ${r.title}`).join("; ") || "-" });
  }

  return targets
    .map((snap) => {
      const { field, device, latest } = snap.context;
      const d = snap.decision;
      if (intent === "disease") {
        let text = t(language, "copilot.disease", {
          field: field.name,
          level: t(language, `level.${snap.risks.levels.disease ?? "Low"}`),
          score: snap.risks.diseaseRisk,
          hours: snap.risks.humidHours,
          temp: snap.risks.meanTemp,
        });
        if (snap.disease) text += t(language, "copilot.diseaseScan", { disease: snap.disease.name });
        if (snap.risks.levels.disease !== "Low") text += t(language, "copilot.diseaseAdvice");
        return text;
      }
      if (intent === "fertilizer") {
        if (latest?.nitrogen === null || latest?.nitrogen === undefined) return t(language, "copilot.fertilizerNone", { field: field.name });
        return t(language, "copilot.fertilizer", {
          field: field.name,
          n: `${formatNumber(latest.nitrogen)} (${snap.risks.nutrients.N})`,
          p: `${formatNumber(latest.phosphorus ?? 0)} (${snap.risks.nutrients.P})`,
          k: `${formatNumber(latest.potassium ?? 0)} (${snap.risks.nutrients.K})`,
        });
      }
      if (intent === "pump" || intent === "solar") {
        let text = device
          ? t(language, "copilot.pump", {
              field: field.name,
              state: t(language, device.pumpOn ? "pump.on" : "pump.off"),
              mode: t(language, `mode.${device.pumpMode}`),
            })
          : t(language, "copilot.noData", { field: field.name });
        if (latest?.tankLevel !== null && latest?.tankLevel !== undefined) text += t(language, "copilot.tank", { level: Math.round(latest.tankLevel) });
        if (snap.solar?.start && snap.solar.end) text += t(language, "copilot.solar", { start: localTime(snap.solar.start), end: localTime(snap.solar.end) });
        return text;
      }
      return irrigationAnswer(snap, language, d);
    })
    .join("\n\n");
}

function irrigationAnswer(snap: FieldSnapshot, language: Language, d: FieldSnapshot["decision"]) {
  const field = snap.context.field.name;
  const params = { field, moisture: d.moisture ?? "-", refill: d.water.refillPoint, ...d.params };
  switch (d.action) {
    case "IRRIGATE":
      return t(language, "copilot.irrigate", { ...params, litres: d.plan.litres, duration: d.plan.duration });
    case "SKIP_RAIN":
      return t(language, "copilot.skipRain", params);
    case "WAIT_SOLAR":
      return t(language, "copilot.waitSolar", params);
    case "BLOCKED_TANK":
      return t(language, "copilot.blocked", params);
    case "NO_DATA":
      return t(language, "copilot.noData", params);
    default: {
      let text = t(language, "copilot.wet", params);
      if (snap.forecast?.hoursUntilRefill) text += t(language, "copilot.forecastSuffix", { hours: snap.forecast.hoursUntilRefill });
      return text;
    }
  }
}

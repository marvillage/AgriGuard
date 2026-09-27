import db from "../config/database.js";
import { generate } from "../lib/ai/index.js";
import { languageNames, t, type Language } from "../i18n/index.js";
import { dayKey, daysAgo, parseTimestamp } from "../lib/time.js";
import { AppError } from "../utils/AppError.js";
import type { AuthUser } from "../utils/auth.types.js";
import { fieldAccess } from "./access.service.js";
import { buildContext } from "./copilot.service.js";
import { localize } from "./recommendation.service.js";

export const style = (language: Language) =>
  language === "en"
    ? "Write for an Indian farmer: short sentences, simple words, concrete numbers. Never invent pesticide or fertilizer doses."
    : `Write your ENTIRE reply in ${languageNames[language]}, not English. Every sentence must be in ${languageNames[language]}. Short sentences, simple words, concrete numbers, for an Indian farmer. Never invent pesticide or fertilizer doses.`;

export async function explainRecommendation(user: AuthUser, recId: number, language: Language) {
  const rec = await db.orm.public.Recommendation.first({ id: recId });
  if (!rec || !rec.fieldId) throw new AppError("Recommendation not found", 404);
  const { field, farm } = await fieldAccess(user, rec.fieldId);
  const crop = await db.orm.public.Crop.where({ fieldId: field.id, status: "ACTIVE" }).first();
  const localized = localize(rec, "en");

  const result = await generate(
    {
      system: `You explain farm recommendations. ${style(language)} 3-4 sentences: why it matters, what to do step by step, and what happens if ignored.`,
      messages: [
        {
          role: "user",
          content: `Recommendation for field "${field.name}" (${field.area} acres, ${field.soilType ?? "unknown"} soil, crop ${crop?.name ?? "unknown"}) on farm "${farm.name}":
Title: ${localized.title}
Details: ${localized.message}
Evidence: ${rec.supportingFactors ?? "-"}
Expected impact: ${rec.expectedImpact ?? "-"}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 350,
    },
    { cacheKey: `explain:${recId}:${language}` }
  );
  if (!result) {
    const fallback = localize(rec, language);
    return { text: `${fallback.message}${rec.supportingFactors ? `\n\n${rec.supportingFactors}` : ""}`, provider: "rules" };
  }
  return { text: result.text, provider: `${result.provider}:${result.model}` };
}

export async function translateText(text: string, language: Language) {
  const result = await generate(
    {
      system: `Translate the user's text into ${languageNames[language]}. Keep numbers, units and product names. Reply with the translation only.`,
      messages: [{ role: "user", content: text }],
      temperature: 0,
      maxTokens: 800,
    },
    { cacheKey: `translate:${language}:${text}` }
  );
  if (!result) throw new AppError("Translation needs an AI provider (Gemini key or Ollama)", 503);
  return { text: result.text, provider: `${result.provider}:${result.model}` };
}

export async function dailyBriefing(user: AuthUser, language: Language) {
  const context = await buildContext(user);
  const today = dayKey(new Date());
  const facts = context.snapshots.map((snap) => {
    const d = snap.decision;
    return `${snap.context.field.name}: moisture ${d.moisture ?? "?"}% (refill ${d.water.refillPoint}%), decision ${d.action}, disease risk ${snap.risks.levels.disease}, crop health ${snap.risks.cropHealth}; weather rain 24h ${d.weather?.rainNext24Mm ?? "?"} mm, max temp ${d.weather?.maxTempNext3Days ?? "?"}°C`;
  });
  if (facts.length === 0) return { title: t(language, "briefing.title"), text: t(language, "copilot.noFarm"), provider: "rules" };

  const result = await generate(
    {
      system: `You write a morning farm briefing. ${style(language)} Exactly 3 bullet lines starting with "• ": the most urgent action, the weather effect, and one saving or good news. Under 60 words total.`,
      messages: [{ role: "user", content: `Date ${today}. Field status:\n${facts.join("\n")}` }],
      temperature: 0.4,
      maxTokens: 250,
    },
    { cacheKey: `briefing:v2:${user.id}:${today}:${language}:${facts.join("|")}` }
  );
  const text =
    result?.text ??
    context.snapshots
      .slice(0, 3)
      .map((snap) => `• ${t(language, "briefing.field", { field: snap.context.field.name, action: t(language, `decision.${snap.decision.action}`, snap.decision.params) })}`)
      .join("\n");
  return { title: t(language, "briefing.title"), text, provider: result ? `${result.provider}:${result.model}` : "rules" };
}

export async function weeklyFieldReport(user: AuthUser, fieldId: number, language: Language) {
  const { field } = await fieldAccess(user, fieldId);
  const since = daysAgo(7).toISOString();
  const readings = await db.orm.public.FieldObservation
    .where({ fieldId })
    .where((o) => o.observedAt.gte(since))
    .select("observedAt", "soilMoisture", "temperature", "humidity", "tankLevel", "source")
    .all();
  const events = await db.orm.public.IrrigationEvent.where({ fieldId }).where((e) => e.startedAt.gte(since)).all();
  const decisions = await db.orm.public.IrrigationDecision.where({ fieldId }).where((d) => d.decidedAt.gte(since)).all();
  const assessments = await db.orm.public.AIAssessment
    .where({ fieldId, kind: "RISK" })
    .where((a) => a.createdAt.gte(since))
    .select("createdAt", "cropHealthScore", "diseaseRisk", "waterStress")
    .all();
  const scans = await db.orm.public.AIAssessment.where({ fieldId, kind: "SCAN" }).where((a) => a.createdAt.gte(since)).all();

  const moisture = readings.map((r) => r.soilMoisture).filter((v): v is number => typeof v === "number");
  const byDay = new Map<string, number[]>();
  for (const reading of readings) {
    const at = parseTimestamp(reading.observedAt);
    if (!at || reading.soilMoisture === null) continue;
    const key = dayKey(at);
    byDay.set(key, [...(byDay.get(key) ?? []), reading.soilMoisture]);
  }
  const daily = [...byDay.entries()].map(([day, values]) => `${day}: ${Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10}%`);
  const counts = decisions.reduce<Record<string, number>>((acc, d) => ({ ...acc, [d.action]: (acc[d.action] ?? 0) + 1 }), {});
  const health = assessments.map((a) => a.cropHealthScore).filter((v): v is number => v !== null);

  const stats = {
    readings: readings.length,
    moistureMin: moisture.length ? Math.min(...moisture) : null,
    moistureMax: moisture.length ? Math.max(...moisture) : null,
    irrigations: events.length,
    litres: Math.round(events.reduce((s, e) => s + (e.litres ?? 0), 0)),
    kwh: Math.round(events.reduce((s, e) => s + (e.kwh ?? 0), 0) * 10) / 10,
    decisions: counts,
    healthStart: health[0] ?? null,
    healthEnd: health[health.length - 1] ?? null,
    scans: scans.length,
    // OPEN_METEO readings are a weather-model estimate for the location, not a field sensor.
    readingSources: [...new Set(readings.map((r) => r.source))],
  };

  const result = await generate(
    {
      system: `You are an agronomist writing a weekly field report. ${style(language)} Use 4 short sections with headings: Water, Crop health, What changed, Next week. Max 150 words.`,
      messages: [{ role: "user", content: `Field ${field.name} (${field.area} acres). Last 7 days:\n${JSON.stringify(stats)}\nDaily mean soil moisture: ${daily.join(", ")}` }],
      temperature: 0.3,
      maxTokens: 500,
    },
    { cacheKey: `weekly:${fieldId}:${dayKey(new Date())}:${language}` }
  );
  return { stats, daily, text: result?.text ?? null, provider: result ? `${result.provider}:${result.model}` : "rules" };
}

export async function impactNarrative(totals: { litresSaved: number; kwhSaved: number; co2Kg: number; rupeesSaved: number; savingPct: number; measuredShare: number }, farmName: string) {
  const result = await generate(
    {
      system: "You write a two-sentence executive summary for a sustainability impact report read by hackathon judges and funders. Plain English, no hype, cite the numbers, mention measurement method share.",
      messages: [{ role: "user", content: `Farm: ${farmName}. Totals: ${JSON.stringify(totals)}` }],
      temperature: 0.2,
      maxTokens: 160,
    },
    { cacheKey: `narrative:${farmName}:${JSON.stringify(totals)}` }
  );
  return result?.text ?? null;
}

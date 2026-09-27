import { getDiseaseInfo } from "../data/disease-knowledge.js";
import { generate } from "../lib/ai/index.js";
import type { Language } from "../i18n/index.js";
import { dayKey } from "../lib/time.js";
import { AppError } from "../utils/AppError.js";
import type { AuthUser } from "../utils/auth.types.js";
import { style } from "./ai-features.service.js";
import { round } from "./agronomy.service.js";
import { localTime, recentDiseaseFinding } from "./engine.service.js";
import { listPlans } from "./fertilizer.service.js";
import { fieldPolygon, listNdvi } from "./ndvi.service.js";
import { fieldOverview } from "./overview.service.js";
import { getScan } from "./scan.service.js";

export const explainTopics = ["irrigation", "risk", "fertilizer", "ndvi"] as const;
export type ExplainTopic = (typeof explainTopics)[number];

export function isExplainTopic(value: string): value is ExplainTopic {
  return (explainTopics as readonly string[]).includes(value);
}

type Overview = Awaited<ReturnType<typeof fieldOverview>>;
type Plan = Awaited<ReturnType<typeof listPlans>>[number];
type Snapshot = Awaited<ReturnType<typeof listNdvi>>[number];
type ScanView = Awaited<ReturnType<typeof getScan>>;
type Line = string | null;

// The numbers come from AgriGuard's formulas and verified sources; the model only puts them into words.
const factsOnly =
  "Use ONLY the facts given. Never add a number, product, dose, date or claim that is not in the facts, and never change the decision or the scores. Write every number exactly as given, using the digits 0-9. Mention a rule only when it applies to this field's facts. If something the farmer needs is missing, say it is not available. Never mention 'the facts' or these instructions. Plain text, no markdown.";

const tasks: Record<ExplainTopic | "disease", string> = {
  irrigation: "Explain today's irrigation decision for this field: why this action, what the key numbers mean, and what the farmer should do next. 3-4 short sentences.",
  risk: "Explain what is driving each risk score for this field and the one thing the farmer should watch or do. 3-4 short sentences.",
  fertilizer: "Explain this fertilizer plan: how the soil test changes the dose compared with the usual blanket dose, what it saves, and when to apply each split. 3-4 short sentences.",
  ndvi: "Explain what this satellite greenness (NDVI) reading says about the crop at its current stage, how it changed from the previous reading, and what the farmer should check in the field. Use the NASA reference only to judge whether greenness is low or high; do not compare the field to forests, rock or snow. 3 short sentences.",
  disease: "Explain this leaf scan result and which of the listed verified actions to do first, relating them to the coming weather. Only mention actions and products that appear in the facts. 3-4 short sentences.",
};

const missing = "not available";

function value(input: number | null | undefined, unit = "") {
  return input === null || input === undefined ? missing : `${input}${unit}`;
}

function percent(share: number) {
  return `${Math.round(share * 100)}%`;
}

function signed(delta: number) {
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`;
}

function readingAge(minutes: number | null) {
  if (minutes === null) return "age unknown";
  if (minutes < 60) return "less than an hour old";
  return `about ${Math.round(minutes / 60)} hours old`;
}

function sourceLabel(source: string) {
  if (source === "OPEN_METEO") return "weather-model estimate for this location, not a field sensor";
  if (source === "DEVICE") return "field sensor";
  if (source === "MANUAL") return "entered by hand";
  if (source === "SIMULATOR") return "device simulator";
  return source;
}

function fieldLine(o: Overview) {
  const stage = o.stage.label ? `, stage ${o.stage.label} (day ${o.stage.day} of ${o.stage.seasonDays})` : "";
  return `Field ${o.field.name}: ${o.field.area} acres, ${o.soil?.name ?? o.field.soilType ?? "unknown"} soil, crop ${o.crop?.name ?? missing}${stage}`;
}

function weatherLine(o: Overview) {
  const w = o.weather;
  if (!w) return "Weather forecast: not available";
  return `Weather: ${w.rainNext24Mm} mm of rain expected in the next 24 hours (chance up to ${w.rainProbabilityNext24}%), ${w.rainNext48Mm} mm in 48 hours, ${w.rainPast24Mm} mm fell in the last 24 hours; ${w.humidHoursNext24} hours with air humidity of 90% or more forecast for the next day; highest temperature in the next 3 days ${w.maxTempNext3Days}°C`;
}

const indian = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

function flowLine(field: Overview["field"], flowLpm: number) {
  const test = flowTest(field.pumpFlowTest);
  if (test) return `Pump flow ${test.lpm} L/min, measured by the farmer by timing ${test.seconds.length} fill(s) of a ${test.bucketLitres}-litre bucket`;
  if (field.pumpFlowLpm) return `Pump flow ${field.pumpFlowLpm} L/min, typed in by the farmer (not measured in the app)`;
  return `Pump flow not measured yet, so a typical ${flowLpm} L/min for this irrigation method is used and the run time is approximate`;
}

function flowTest(value: string | null) {
  try {
    const test = value ? (JSON.parse(value) as { lpm: number; bucketLitres: number; seconds: number[] }) : null;
    return test && Array.isArray(test.seconds) ? test : null;
  } catch {
    return null;
  }
}

function irrigationFacts(o: Overview): Line[] {
  const { decision, water, latest } = o;
  const plan = decision.plan;
  const tank = o.devices.find((device) => device.hasTankSensor);
  const rules = [
    "skip while soil moisture is above the refill point",
    o.weather ? "skip when at least 5 mm (or half the missing water, if more) of rain is forecast for the next 24 hours with a 60% or higher chance, unless the crop is critical" : null,
    o.farm.solarCapacityKw && o.field.solarPreferred && o.field.pumpPowerKw ? "wait up to 6 hours for the solar window" : null,
    tank ? `never run the pump when the tank is below ${tank.dryRunLevelPct}%` : null,
  ].filter(Boolean);
  return [
    fieldLine(o),
    `Crop coefficient (Kc) ${o.stage.kc}, root depth ${o.stage.rootDepthM} m`,
    latest?.soilMoisture != null
      ? `Soil moisture now ${round(latest.soilMoisture)}% (${sourceLabel(latest.source)}, ${readingAge(o.latestAgeMinutes)})`
      : "Soil moisture now: no recent reading",
    decision.watering
      ? `Watering logged since then: ${indian.format(decision.watering.litres)} litres, last one ended at ${localTime(decision.watering.endedAt)}. The weather model cannot see irrigation, so AgriGuard adds that water and subtracts what the crop has used since (FAO-56 water balance): soil moisture is about ${decision.watering.moisture}%`
      : null,
    `Soil limits: field capacity ${water.fieldCapacity}%, refill point ${water.refillPoint}%, wilting point ${water.wiltingPoint}%`,
    `Water missing from the root zone: ${value(water.needMm, " mm")}`,
    `Decision: ${decision.message}${decision.critical ? " (critical: the crop is close to wilting)" : ""}`,
    `Water plan if irrigating: ${indian.format(plan.litres)} litres, about ${plan.duration} at ${plan.flowLpm} L/min by ${plan.method} irrigation (${Math.round(plan.efficiency * 100)}% efficient)`,
    flowLine(o.field, plan.flowLpm),
    `Crop water use today (ETc) ${value(decision.etc, " mm")}, reference evapotranspiration (ET0) ${value(decision.et0, " mm")}`,
    weatherLine(o),
    o.solar?.start && o.solar.end ? `The farm's solar panels can run the pump from ${localTime(o.solar.start)} to ${localTime(o.solar.end)}` : null,
    latest?.tankLevel != null ? `Water tank ${round(latest.tankLevel)}% full` : null,
    `Rules for this field: ${rules.join("; ")}.`,
  ];
}

function riskFacts(o: Overview, disease: { name: string; confidence: number } | null): Line[] {
  const { risks, weather } = o;
  const score = (input: number | null, level: string | null) => (input === null ? missing : `${input}/100 (${level ?? "no signal"})`);
  return [
    fieldLine(o),
    `Crop health ${risks.cropHealth}/100${o.ndvi ? `, including satellite greenness NDVI ${o.ndvi.meanNdvi.toFixed(2)}` : ""}`,
    `Water stress ${score(risks.waterStress, risks.levels.water)}: soil moisture ${value(o.latest?.soilMoisture != null ? round(o.latest.soilMoisture) : null, "%")} against a refill point of ${o.water.refillPoint}%`,
    `Disease risk ${score(risks.diseaseRisk, risks.levels.disease)}: ${risks.humidHours} hours with air humidity of 90% or more in the last day at a mean ${risks.meanTemp}°C${weather ? `, ${weather.humidHoursNext24} such hours forecast for the next day` : ""}${disease ? `, and a leaf scan this week found ${disease.name} (${percent(disease.confidence)} confidence)` : ""}`,
    `Weather risk ${score(risks.weatherRisk, risks.levels.weather)}${weather ? `: highest temperature in the next 3 days ${weather.maxTempNext3Days}°C, heaviest rain day ${weather.heaviestRainDay?.rainMm ?? 0} mm, strongest wind ${weather.maxWindNext3Days} km/h` : ": no forecast"}`,
    `Nutrient stress ${risks.nutrientStress === null ? "not available (no soil nutrient reading)" : score(risks.nutrientStress, risks.levels.nutrient)}; soil N ${risks.nutrients.N ?? "not tested"}, P ${risks.nutrients.P ?? "not tested"}, K ${risks.nutrients.K ?? "not tested"}`,
    `How the scores work: for the four risk scores 0 is best; for crop health 100 is best. Disease risk rises with long humid spells, most at 15-30°C. Weather risk adds points for 35°C or hotter, 25 mm or more of rain in a day, and wind of 40 km/h or more. Crop health is 100 minus a weighted mix of water stress (35%), disease risk (30%), nutrient stress (20%) and weather risk (15%)${o.ndvi ? ", then blended 70/30 with the NDVI score" : ""}.`,
  ];
}

function fertilizerFacts(plan: Plan, o: Overview): Line[] {
  const saved = round(plan.blanketCostRupees - plan.costRupees);
  const ureaCut = round(plan.blanketUreaKg - plan.ureaKg);
  const splits = (plan.schedule?.schedule ?? []) as Array<{ stage: string; day: number; date: string | null; urea: number; dap: number; mop: number }>;
  const notes = (plan.schedule?.notes ?? []) as string[];
  return [
    `Field ${o.field.name}: ${o.field.area} acres; plan for crop ${plan.cropType}; soil test from ${plan.source}`,
    `Soil test (kg/ha): nitrogen ${plan.soilN} (${plan.nStatus}), phosphorus ${plan.soilP} (${plan.pStatus}), potassium ${plan.soilK} (${plan.kStatus})${plan.soilPh != null ? `, pH ${plan.soilPh}` : ""}${plan.organicCarbon != null ? `, organic carbon ${plan.organicCarbon}%` : ""}`,
    `Nutrients the crop needs on this soil (kg/ha): N ${plan.requiredN}, P ${plan.requiredP}, K ${plan.requiredK}`,
    `This plan for the whole field: urea ${plan.ureaKg} kg, DAP ${plan.dapKg} kg, MOP ${plan.mopKg} kg, costing ₹${plan.costRupees}`,
    `Usual blanket dose: urea ${plan.blanketUreaKg} kg, DAP ${plan.blanketDapKg} kg, MOP ${plan.blanketMopKg} kg, costing ₹${plan.blanketCostRupees}`,
    `Compared with the blanket dose: ${ureaCut >= 0 ? `${ureaCut} kg less urea` : `${-ureaCut} kg more urea`}, ${saved >= 0 ? `₹${saved} saved` : `₹${-saved} extra`}`,
    splits.length
      ? `When to apply: ${splits.map((s) => `${s.stage}${s.date ? ` on ${s.date}` : ` on day ${s.day}`}: urea ${s.urea} kg${s.dap ? `, DAP ${s.dap} kg` : ""}${s.mop ? `, MOP ${s.mop} kg` : ""}`).join("; ")}`
      : null,
    notes.length ? `Notes: ${notes.join(" ")}` : null,
    `Applied: ${plan.applied ? "yes" : "not yet"}`,
    "Dose rule: soil ratings follow the Soil Testing in India manual (DAC 2011); a low-rated nutrient gets 25% more and a high-rated one 25% less than the medium-soil dose (PAU Package of Practices).",
  ];
}

function ndviFacts(o: Overview, scene: Snapshot, previous: Snapshot | null): Line[] {
  return [
    fieldLine(o),
    `Sentinel-2 satellite scene of ${String(scene.sceneDate).slice(0, 10)}: cloud cover ${round(scene.cloudCover)}% over the tile, ${percent(scene.validPixelRatio)} of the field clearly visible`,
    `Mean NDVI ${scene.meanNdvi.toFixed(2)} (lowest ${scene.minNdvi.toFixed(2)}, highest ${scene.maxNdvi.toFixed(2)})`,
    `Parts of the field: ${percent(scene.zones.low)} below 0.3, ${percent(scene.zones.medium)} between 0.3 and 0.6, ${percent(scene.zones.high)} above 0.6`,
    fieldPolygon(o.field, o.farm)?.approximate
      ? "No field boundary is drawn, so this reading used an approximate square around the field centre and may include neighbouring land."
      : null,
    previous
      ? `Previous scene of ${String(previous.sceneDate).slice(0, 10)}: mean NDVI ${previous.meanNdvi.toFixed(2)} (change ${signed(scene.meanNdvi - previous.meanNdvi)})`
      : "Previous scene: not available",
    "NDVI reference (NASA Earth Observatory): 0.1 and below means bare ground; 0.2 to 0.3 means sparse cover such as shrubs and grass; 0.6 to 0.8 means dense green vegetation.",
  ];
}

function diseaseFacts(scan: ScanView, top: NonNullable<ScanView["top"]>, o: Overview): Line[] {
  const ai = scan.ai;
  return [
    `Leaf scan of ${String(scan.createdAt).slice(0, 10)}. ${fieldLine(o)}`,
    `On-device model result: ${top.name} (${percent(top.confidence)} confidence${scan.lowConfidence ? ", low confidence" : ""})`,
    scan.alternatives.length ? `Other possibilities: ${scan.alternatives.map((a) => `${a.name} (${percent(a.confidence)})`).join(", ")}` : null,
    top.healthy ? "The leaf looks healthy." : `Cause: ${top.pathogen ?? missing}; spread risk ${top.spreadRisk}`,
    scan.affectedPct !== null && !top.healthy ? `Discoloured leaf area measured from pixel colours: ${scan.affectedPct}%` : null,
    ai.status === "done" && ai.diagnosis
      ? `AI second opinion: ${ai.diagnosis}${typeof ai.agreesWithModel === "boolean" ? (ai.agreesWithModel ? " (agrees with the model)" : " (does not agree with the model)") : ""}`
      : null,
    `Verified actions (TNAU, ICAR and university extension sources): ${top.actions.map((action, index) => `${index + 1}. ${action}`).join(" ")}`,
    top.prevention.length ? `Verified prevention: ${top.prevention.join(" ")}` : null,
    weatherLine(o),
  ];
}

async function explain(topic: ExplainTopic | "disease", lines: Line[], language: Language, scope: string) {
  const facts = lines.filter((line): line is string => Boolean(line)).join("\n");
  const result = await generate(
    {
      system: `You explain AgriGuard's farm numbers to the farmer who owns the field. ${style(language)} ${factsOnly} ${tasks[topic]}`,
      messages: [{ role: "user", content: `Facts:\n${facts}` }],
      temperature: 0.2,
      maxTokens: 700,
    },
    { cacheKey: `explain:v4:${scope}:${dayKey(new Date())}:${language}:${facts}` }
  );
  if (!result) throw new AppError("AI explanation is not available right now", 503);
  return { text: result.text, provider: `${result.provider}:${result.model}` };
}

export async function explainField(
  user: AuthUser,
  fieldId: number,
  topic: ExplainTopic,
  language: Language,
  options: { planId?: number; snapshotId?: number } = {}
) {
  const overview = await fieldOverview(user, fieldId, "en");
  if (topic === "irrigation") return explain(topic, irrigationFacts(overview), language, `irrigation:${fieldId}`);
  if (topic === "risk") return explain(topic, riskFacts(overview, await recentDiseaseFinding(fieldId)), language, `risk:${fieldId}`);
  if (topic === "fertilizer") {
    const plans = await listPlans(user, fieldId);
    const plan = options.planId ? plans.find((item) => item.id === options.planId) : plans[0];
    if (!plan) throw new AppError("No fertilizer plan to explain yet", 404);
    return explain(topic, fertilizerFacts(plan, overview), language, `fertilizer:${plan.id}`);
  }
  const snapshots = await listNdvi(user, fieldId);
  const index = options.snapshotId ? snapshots.findIndex((item) => item.id === options.snapshotId) : 0;
  const scene = snapshots[index];
  if (!scene) throw new AppError("No satellite reading to explain yet", 404);
  return explain(topic, ndviFacts(overview, scene, snapshots[index + 1] ?? null), language, `ndvi:${scene.id}`);
}

export async function explainScan(user: AuthUser, scanId: number, language: Language) {
  const scan = await getScan(user, scanId, language);
  const top = scan.top;
  if (scan.mode !== "disease" || !top?.label || !getDiseaseInfo(top.label)) {
    throw new AppError("Only disease scans with a result can be explained", 400);
  }
  const overview = await fieldOverview(user, scan.fieldId, "en");
  return explain("disease", diseaseFacts(scan, top, overview), language, `scan:${scanId}`);
}

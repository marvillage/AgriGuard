import db from "../config/database.js";
import { crops, getCrop } from "../data/crops.js";
import { generateJson } from "../lib/ai/index.js";
import { parseTimestamp } from "../lib/time.js";
import { AppError } from "../utils/AppError.js";
import type { AuthUser } from "../utils/auth.types.js";
import { fieldAccess } from "./access.service.js";
import { recordFertilizerSaving } from "./ledger.service.js";

const hectaresPerAcre = 0.404686;
// Soil mg/kg to kg/ha for the 0-15 cm layer at bulk density 1.5 g/cm3.
const mgPerKgToKgPerHa = 2.25;

// Indicative subsidised retail prices (Rs per kg): urea Rs 266.5/45 kg, DAP Rs 1350/50 kg, MOP Rs 1710.54/50 kg.
// Urea MRP Rs 242/45 kg before neem coating and taxes (PIB, 28 Jul 2026), Rs 266.5 with them (Fertiliser Minister, 11 Jan 2024).
// DAP held at Rs 1350/50 kg for Kharif 2026 (PIB, 28 Jul 2026); MOP is the 2025-26 average retail price (PIB, 10 Mar 2026).
export const fertilizerPrices = { urea: 5.92, dap: 27, mop: 34.21 };

export interface SoilTest {
  n: number;
  p: number;
  k: number;
  ph?: number | null;
  organicCarbon?: number | null;
}

export function rate(nutrient: "n" | "p" | "k", kgPerHa: number) {
  // SHC fertility ratings in kg/ha (Methods Manual: Soil Testing in India, DAC 2011, Table 1, p. 33).
  const limits = { n: [280, 560], p: [10, 24.6], k: [108, 280] }[nutrient];
  if (kgPerHa < limits[0]) return "Low";
  if (kgPerHa <= limits[1]) return "Medium";
  return "High";
}

// 25% more on low and 25% less on high soils than the medium-soil dose (PAU Package of Practices, Rabi 2025-26, ch. 7, pp. 106-107).
const factor: Record<string, number> = { Low: 1.25, Medium: 1, High: 0.75 };

// Minimum nutrient contents, Fertiliser (Control) Order 1985, Schedule I: urea 46.0% N, DAP 18.0% N and 46.0% P2O5, MOP 60.0% K2O.
function products(n: number, p2o5: number, k2o: number) {
  const dap = p2o5 / 0.46;
  const urea = Math.max(0, (n - dap * 0.18) / 0.46);
  const mop = k2o / 0.6;
  return { urea, dap, mop };
}

export function calculatePlan(cropKey: string, areaAcres: number, soil: SoilTest, plantingDate?: string | null) {
  const crop = getCrop(cropKey);
  if (!crop) throw new AppError(`Unknown crop "${cropKey}"`, 400);
  const status = { n: rate("n", soil.n), p: rate("p", soil.p), k: rate("k", soil.k) };
  const required = {
    n: crop.dose.n * factor[status.n],
    p: crop.dose.p * factor[status.p],
    k: crop.dose.k * factor[status.k],
  };
  const hectares = areaAcres * hectaresPerAcre;
  const perHa = products(required.n, required.p, required.k);
  const blanketPerHa = products(crop.dose.n, crop.dose.p, crop.dose.k);
  const scale = (value: number) => Math.round(value * hectares * 10) / 10;
  const plan = { urea: scale(perHa.urea), dap: scale(perHa.dap), mop: scale(perHa.mop) };
  const blanket = { urea: scale(blanketPerHa.urea), dap: scale(blanketPerHa.dap), mop: scale(blanketPerHa.mop) };
  const cost = (bag: typeof plan) => Math.round(bag.urea * fertilizerPrices.urea + bag.dap * fertilizerPrices.dap + bag.mop * fertilizerPrices.mop);

  const [ini, dev] = crop.stages;
  const planted = parseTimestamp(plantingDate ?? null);
  const dateAt = (days: number) => (planted ? new Date(planted.getTime() + days * 86400000).toISOString().slice(0, 10) : null);
  const schedule = [
    { stage: "Basal (at sowing)", day: 0, date: dateAt(0), urea: Math.round(plan.urea * 0.5 * 10) / 10, dap: plan.dap, mop: plan.mop },
    { stage: "First top dressing", day: ini, date: dateAt(ini), urea: Math.round(plan.urea * 0.25 * 10) / 10, dap: 0, mop: 0 },
    { stage: "Second top dressing", day: ini + dev, date: dateAt(ini + dev), urea: Math.round(plan.urea * 0.25 * 10) / 10, dap: 0, mop: 0 },
  ];

  const notes: string[] = [];
  // Organic carbon below 0.5% is low (Methods Manual 2011, Table 1); FYM 12.5 t/ha, about 5 t/acre (TNAU Crop Production Guide 2020).
  if (soil.organicCarbon !== undefined && soil.organicCarbon !== null && soil.organicCarbon < 0.5) {
    notes.push("Organic carbon is low: add 5 tonnes of well-rotted farmyard manure or compost per acre before sowing.");
  }
  // Lime soils below pH 5.5 and use gypsum on alkali soils above pH 8.5 (Methods Manual 2011, p. 15).
  if (soil.ph && soil.ph < 5.5) notes.push("Soil is acidic: apply agricultural lime as advised by your soil testing lab.");
  if (soil.ph && soil.ph > 8.5) notes.push("Soil is alkaline: gypsum application can improve structure; ask your KVK for the dose.");
  notes.push("Split nitrogen so the crop uses it instead of it washing away; apply when soil is moist, not before heavy rain.");

  return {
    crop: { key: crop.key, name: crop.name, dose: crop.dose },
    areaAcres,
    soil,
    status,
    required: { n: Math.round(required.n), p: Math.round(required.p), k: Math.round(required.k) },
    plan,
    blanket,
    cost: cost(plan),
    blanketCost: cost(blanket),
    ureaSavedKg: Math.round((blanket.urea - plan.urea) * 10) / 10,
    savingRupees: cost(blanket) - cost(plan),
    schedule,
    notes,
  };
}

export async function sensorSoilTest(fieldId: number): Promise<SoilTest | null> {
  const latest = await db.orm.public.FieldObservation
    .where({ fieldId })
    .where((o) => o.nitrogen.isNotNull())
    .orderBy((o) => o.observedAt.desc())
    .first();
  if (!latest || latest.nitrogen === null || latest.phosphorus === null || latest.potassium === null) return null;
  return {
    n: Math.round(latest.nitrogen * mgPerKgToKgPerHa),
    p: Math.round(latest.phosphorus * mgPerKgToKgPerHa * 10) / 10,
    k: Math.round(latest.potassium * mgPerKgToKgPerHa),
  };
}

export async function previewPlan(user: AuthUser, fieldId: number, input: { cropKey?: string; soil?: SoilTest; source?: string }) {
  const { field } = await fieldAccess(user, fieldId);
  const crop = await db.orm.public.Crop.where({ fieldId, status: "ACTIVE" }).first();
  const cropKey = input.cropKey ?? crop?.cropType ?? getCrop(crop?.name)?.key;
  if (!cropKey) throw new AppError("Choose a crop for this field first", 400);
  const soil = input.soil ?? (await sensorSoilTest(fieldId));
  if (!soil) throw new AppError("Enter soil test values or connect an NPK sensor", 400);
  return {
    source: input.soil ? input.source ?? "SOIL_CARD" : "SENSOR",
    ...calculatePlan(cropKey, field.area, soil, crop?.plantingDate ?? null),
  };
}

export async function savePlan(user: AuthUser, fieldId: number, input: { cropKey?: string; soil?: SoilTest; source?: string }) {
  await fieldAccess(user, fieldId, { write: true });
  const plan = await previewPlan(user, fieldId, input);
  return db.orm.public.FertilizerPlan.create({
    fieldId,
    cropType: plan.crop.key,
    source: plan.source,
    soilN: plan.soil.n,
    soilP: plan.soil.p,
    soilK: plan.soil.k,
    soilPh: plan.soil.ph ?? null,
    organicCarbon: plan.soil.organicCarbon ?? null,
    nStatus: plan.status.n,
    pStatus: plan.status.p,
    kStatus: plan.status.k,
    requiredN: plan.required.n,
    requiredP: plan.required.p,
    requiredK: plan.required.k,
    ureaKg: plan.plan.urea,
    dapKg: plan.plan.dap,
    mopKg: plan.plan.mop,
    blanketUreaKg: plan.blanket.urea,
    blanketDapKg: plan.blanket.dap,
    blanketMopKg: plan.blanket.mop,
    costRupees: plan.cost,
    blanketCostRupees: plan.blanketCost,
    schedule: JSON.stringify({ schedule: plan.schedule, notes: plan.notes }),
  });
}

export async function listPlans(user: AuthUser, fieldId: number) {
  await fieldAccess(user, fieldId);
  const rows = await db.orm.public.FertilizerPlan.where({ fieldId }).orderBy((p) => p.createdAt.desc()).limit(20).all();
  return rows.map((row) => ({ ...row, schedule: JSON.parse(row.schedule) }));
}

export async function markApplied(user: AuthUser, fieldId: number, planId: number) {
  await fieldAccess(user, fieldId, { write: true });
  const plan = await db.orm.public.FertilizerPlan.where({ id: planId, fieldId }).first();
  if (!plan) throw new AppError("Plan not found", 404);
  const updated = await db.orm.public.FertilizerPlan.where({ id: planId }).update({ applied: true, appliedAt: new Date().toISOString() });
  const blanketKg = plan.blanketUreaKg + plan.blanketDapKg + plan.blanketMopKg;
  const planKg = plan.ureaKg + plan.dapKg + plan.mopKg;
  await recordFertilizerSaving(fieldId, planId, blanketKg - planKg, plan.blanketCostRupees - plan.costRupees);
  return updated;
}

// Reads a Government of India Soil Health Card photo with a vision model.
export async function readSoilCard(user: AuthUser, fieldId: number, image: { buffer: Buffer; mimeType: string }) {
  await fieldAccess(user, fieldId);
  const result = await generateJson<{
    nitrogen: number | null;
    phosphorus: number | null;
    potassium: number | null;
    ph: number | null;
    organicCarbon: number | null;
    ec: number | null;
    sulphur: number | null;
    zinc: number | null;
    units: string;
    confidence: number;
  }>({
    system: "You read Indian Soil Health Cards precisely. Only report values printed on the card; use null for anything missing or unreadable.",
    messages: [
      {
        role: "user",
        content:
          'Extract the soil test results from this Soil Health Card. Available nitrogen, phosphorus and potassium must be in kg/ha (convert only if the card clearly uses another unit). Reply with JSON only: {"nitrogen": number|null, "phosphorus": number|null, "potassium": number|null, "ph": number|null, "organicCarbon": number|null (percent), "ec": number|null, "sulphur": number|null, "zinc": number|null, "units": string, "confidence": number (0-1)}',
        images: [{ mimeType: image.mimeType, base64: image.buffer.toString("base64") }],
      },
    ],
    temperature: 0,
    maxTokens: 400,
  });
  if (!result) throw new AppError("Reading the card needs an AI provider. Add a Gemini key or start Ollama with a vision model.", 503);
  return { ...result.data, provider: result.provider, model: result.model };
}

export function cropOptions() {
  return crops.map((crop) => ({ key: crop.key, name: crop.name, dose: crop.dose, seasonDays: crop.stages.reduce((a, b) => a + b, 0) }));
}

import db from "../config/database.js";
import { gridKgCo2PerKwh } from "../data/soils.js";
import { renderImpactPdf, type ImpactReportData } from "../lib/impact-report-pdf.js";
import { squareMetresPerAcre } from "../lib/geo.js";
import { addDays, dayKey, monthKey, parseTimestamp, startOfLocalDay } from "../lib/time.js";
import type { AuthUser } from "../utils/auth.types.js";
import type { LedgerRow } from "../types/models.js";
import { accessibleFarms } from "./access.service.js";
import { anchorDay, baselineFor, controlFieldIds, energyPerLitre, periodUsage, syncFieldLedger, verifyLedger, tracksWater } from "./ledger.service.js";
import { trialResults } from "./trial.service.js";
import { impactNarrative } from "./ai-features.service.js";

export async function impactSummary(user: AuthUser, options: { farmId?: number; from?: string; to?: string } = {}) {
  const farms = (await accessibleFarms(user)).filter((entry) => !options.farmId || entry.farm.id === options.farmId);
  const farmIds = farms.map((entry) => entry.farm.id);
  const allFields = farmIds.length ? await db.orm.public.Field.where((f) => f.farmId.in(farmIds)).all() : [];
  const controls = await controlFieldIds();
  const fields = allFields.filter((field) => !controls.has(field.id));
  const controlFields = allFields.filter((field) => controls.has(field.id));
  const fieldIds = fields.map((field) => field.id);

  for (const field of fields) await syncFieldLedger(field.id);

  let query = fieldIds.length
    ? db.orm.public.SustainabilityRecord.where((r) => r.fieldId.in(fieldIds)).where((r) => r.hash.isNotNull())
    : null;
  if (query && options.from) query = query.where((r) => r.periodStart.gte(options.from!));
  if (query && options.to) query = query.where((r) => r.periodStart.lte(options.to!));
  const entries: LedgerRow[] = query ? await query.orderBy((r) => r.periodStart.asc()).all() : [];

  const pending = await currentPeriods(fields);
  const water = entries.filter((e) => e.kind === "WATER");
  const fertilizer = entries.filter((e) => e.kind === "FERTILIZER");

  const sum = (rows: LedgerRow[], key: keyof LedgerRow) => rows.reduce((total, row) => total + ((row[key] as number | null) ?? 0), 0);
  const litresSaved = sum(water, "waterSaved") + pending.reduce((t, p) => t + p.savedSoFar, 0);
  const litresUsed = sum(water, "waterUsed") + pending.reduce((t, p) => t + p.usedSoFar, 0);
  const kwhSaved = sum(water, "kwhSaved") + pending.reduce((t, p) => t + p.kwhSoFar, 0);
  const measuredSaved = water.filter((e) => e.method === "MEASURED").reduce((t, e) => t + (e.waterSaved ?? 0), 0);

  const monthly = new Map<string, { month: string; litresUsed: number; litresSaved: number; baseline: number; kwhSaved: number; co2Kg: number; rupeesSaved: number }>();
  for (const entry of water) {
    const start = parseTimestamp(entry.periodStart);
    if (!start) continue;
    const key = monthKey(start);
    const row = monthly.get(key) ?? { month: key, litresUsed: 0, litresSaved: 0, baseline: 0, kwhSaved: 0, co2Kg: 0, rupeesSaved: 0 };
    row.litresUsed += entry.waterUsed ?? 0;
    row.litresSaved += entry.waterSaved ?? 0;
    row.baseline += entry.baselineWater ?? 0;
    row.kwhSaved += entry.kwhSaved ?? 0;
    row.co2Kg += entry.co2Kg ?? 0;
    row.rupeesSaved += entry.rupeesSaved ?? 0;
    monthly.set(key, row);
  }

  const perField = fields.map((field) => {
    const rows = water.filter((e) => e.fieldId === field.id);
    const partial = pending.find((p) => p.fieldId === field.id);
    const farm = farms.find((entry) => entry.farm.id === field.farmId)!.farm;
    return {
      fieldId: field.id,
      name: field.name,
      farmName: farm.name,
      areaAcres: field.area,
      litresUsed: Math.round(sum(rows, "waterUsed") + (partial?.usedSoFar ?? 0)),
      litresSaved: Math.round(sum(rows, "waterSaved") + (partial?.savedSoFar ?? 0)),
      method: rows.some((e) => e.method === "MEASURED") ? "Measured (flow meter)" : rows.length ? "Estimated (pump run-time)" : "No data yet",
      baseline: baselineFor(field, farm),
      control: false,
    };
  });
  for (const field of controlFields) {
    const farm = farms.find((entry) => entry.farm.id === field.farmId)!.farm;
    const usage = await periodUsage(field, new Date(0), new Date());
    perField.push({
      fieldId: field.id,
      name: field.name,
      farmName: farm.name,
      areaAcres: field.area,
      litresUsed: Math.round(usage.litres),
      litresSaved: 0,
      method: "Control plot (usual practice, not counted)",
      baseline: baselineFor(field, farm),
      control: true,
    });
  }

  const ledger = await verifyLedger(fieldIds);
  const rupeesSaved = sum(entries, "rupeesSaved") + pending.reduce((t, p) => t + p.rupeesSoFar, 0);
  const ureaKgSaved = sum(fertilizer, "fertilizerReduced");

  return {
    totals: {
      litresSaved: Math.round(litresSaved),
      litresUsed: Math.round(litresUsed),
      kwhSaved: round(kwhSaved, 1),
      co2Kg: round(kwhSaved * gridKgCo2PerKwh, 1),
      rupeesSaved: Math.round(rupeesSaved),
      ureaKgSaved: round(ureaKgSaved, 1),
      measuredShare: litresSaved > 0 ? round(measuredSaved / litresSaved, 2) : 0,
      savingPct: litresSaved + litresUsed > 0 ? round((litresSaved / (litresSaved + litresUsed)) * 100, 1) : 0,
    },
    monthly: [...monthly.values()].map((row) => ({
      ...row,
      litresUsed: Math.round(row.litresUsed),
      litresSaved: Math.round(row.litresSaved),
      baseline: Math.round(row.baseline),
      kwhSaved: round(row.kwhSaved, 1),
      co2Kg: round(row.co2Kg, 1),
      rupeesSaved: Math.round(row.rupeesSaved),
    })),
    fields: perField,
    pending,
    ledger,
    score: await sustainabilityScore(fieldIds, litresSaved, litresUsed, litresSaved > 0 ? measuredSaved / litresSaved : 0),
    farms: farms.map((entry) => ({ id: entry.farm.id, name: entry.farm.name })),
    entries: entries.slice(-100).reverse(),
  };
}

async function currentPeriods(fields: Awaited<ReturnType<typeof db.orm.public.Field.all>>) {
  const now = new Date();
  const result = [];
  for (const field of fields) {
    const farm = (await db.orm.public.Farm.first({ id: field.farmId }))!;
    const baseline = baselineFor(field, farm);
    const last = await db.orm.public.SustainabilityRecord
      .where({ fieldId: field.id, kind: "WATER" })
      .orderBy((r) => r.periodEnd.desc())
      .first();
    const anchor = last ? null : await anchorDay(field);
    const startDate = parseTimestamp(last?.periodEnd ?? null) ?? (anchor ? startOfLocalDay(anchor) : null);
    if (!startDate) continue;
    const endDate = startOfLocalDay(addDays(dayKey(startDate), baseline.intervalDays));
    const elapsed = Math.min(1, Math.max(0, (now.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())));
    const usage = await periodUsage(field, startDate, now);
    if (!(await tracksWater(field.id, startDate, now, usage.events))) continue;
    const baselineSoFar = baseline.depthMm * field.area * squareMetresPerAcre * elapsed;
    const savedSoFar = Math.max(0, baselineSoFar - usage.litres);
    const energy = await energyPerLitre(field);
    result.push({
      fieldId: field.id,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      elapsed: round(elapsed, 2),
      usedSoFar: Math.round(usage.litres),
      savedSoFar: Math.round(savedSoFar),
      kwhSoFar: round(savedSoFar * energy.value, 2),
      rupeesSoFar: Math.round(savedSoFar * energy.value * farm.electricityRate),
    });
  }
  return result;
}

// Each part is a plain percentage from recorded data; a part with no data is null instead of a guess.
async function sustainabilityScore(fieldIds: number[], saved: number, used: number, measuredShare: number) {
  const water = saved + used > 0 ? Math.round((saved / (saved + used)) * 100) : null;
  const plans = fieldIds.length ? await db.orm.public.FertilizerPlan.where((p) => p.fieldId.in(fieldIds)).where({ applied: true }).all() : [];
  const blanket = plans.reduce((total, plan) => total + plan.blanketUreaKg + plan.blanketDapKg + plan.blanketMopKg, 0);
  const planned = plans.reduce((total, plan) => total + plan.ureaKg + plan.dapKg + plan.mopKg, 0);
  const chemical = blanket > 0 ? Math.max(0, Math.round(((blanket - planned) / blanket) * 100)) : null;
  const evidence = saved > 0 ? Math.round(measuredShare * 100) : null;
  const parts = [
    { key: "water", label: "Water saved vs usual practice", value: water },
    { key: "chemical", label: "Fertilizer cut vs blanket dose", value: chemical },
    { key: "evidence", label: "Savings measured by meters", value: evidence },
  ];
  const known = parts.flatMap((part) => (part.value === null ? [] : [part.value]));
  return { value: known.length ? Math.round(known.reduce((a, b) => a + b, 0) / known.length) : null, parts };
}

export async function impactCsv(user: AuthUser, farmId?: number) {
  const summary = await impactSummary(user, { farmId });
  const header = ["Month", "Water used (L)", "Baseline (L)", "Water saved (L)", "Energy saved (kWh)", "CO2 avoided (kg)", "Money saved (Rs)"];
  const rows = summary.monthly.map((m) => [m.month, m.litresUsed, m.baseline, m.litresSaved, m.kwhSaved, m.co2Kg, m.rupeesSaved]);
  rows.push(["Total (incl. current period)", summary.totals.litresUsed, "", summary.totals.litresSaved, summary.totals.kwhSaved, summary.totals.co2Kg, summary.totals.rupeesSaved]);
  const ledgerHeader = ["Entry", "Field", "Kind", "Method", "Period start", "Period end", "Baseline (L)", "Used (L)", "Saved (L)", "kWh saved", "Rs saved", "Hash"];
  const ledgerRows = summary.entries.map((e) => [
    e.id,
    summary.fields.find((f) => f.fieldId === e.fieldId)?.name ?? e.fieldId,
    e.kind,
    e.method,
    parseTimestamp(e.periodStart)?.toISOString() ?? "",
    parseTimestamp(e.periodEnd)?.toISOString() ?? "",
    e.baselineWater,
    e.waterUsed,
    e.waterSaved,
    e.kwhSaved,
    e.rupeesSaved,
    e.hash,
  ]);
  return [header, ...rows, [], ["Savings ledger"], ledgerHeader, ...ledgerRows]
    .map((row) => row.map((cell) => csvCell(cell)).join(","))
    .join("\n");
}

export async function impactPdf(user: AuthUser, farmId?: number) {
  const summary = await impactSummary(user, { farmId });
  const farms = await accessibleFarms(user);
  const primary = farms.find((entry) => !farmId || entry.farm.id === farmId)?.farm;
  const owner = primary ? await db.orm.public.User.first({ id: primary.ownerId }) : null;
  const months = summary.monthly.map((m) => m.month).sort();

  const trials = [];
  for (const entry of farms.filter((f) => !farmId || f.farm.id === farmId)) {
    const rows = await db.orm.public.Trial.where({ farmId: entry.farm.id }).all();
    for (const trial of rows) {
      const results = await trialResults(trial);
      if (results.treatment && results.control) {
        trials.push({
          name: trial.name,
          treatment: results.treatment.name,
          control: results.control.name,
          litresPerAcreTreatment: results.treatment.litresPerAcre,
          litresPerAcreControl: results.control.litresPerAcre,
          savingPct: results.savingPct ?? 0,
        });
      }
    }
  }

  const data: ImpactReportData = {
    farmName: farmId ? primary?.name ?? "AgriGuard farm" : farms.map((f) => f.farm.name).join(", ") || "AgriGuard farm",
    ownerName: owner?.name ?? user.name,
    location: primary?.location ?? null,
    periodStart: months[0] ? `${months[0]}-01` : dayKey(new Date()),
    periodEnd: dayKey(new Date()),
    generatedAt: new Date().toISOString(),
    totals: summary.totals,
    monthly: summary.monthly,
    fields: summary.fields.map((f) => ({ name: f.name, areaAcres: f.areaAcres, crop: null, litresUsed: f.litresUsed, litresSaved: f.litresSaved, method: f.method })),
    trials,
    ledger: summary.ledger,
    assumptions: [
      "Savings = the farm's conventional practice (irrigation depth every N days, set in farm settings) minus water actually pumped in each period.",
      "Water used comes from the field node's flow meter when fitted; otherwise from pump run-time x rated flow.",
      "Energy per litre comes from the PZEM energy meter when fitted, else the pump rating, else 30 m head at 40% efficiency (0.2 kWh per 1,000 L).",
      `CO2 uses the India grid factor of ${gridKgCo2PerKwh} kg CO2 per kWh (CEA). Money saved uses the farm's electricity tariff.`,
      "Every ledger entry is SHA-256 hash-chained to the previous one, so any later edit breaks the chain.",
      "Field-trial results compare an AgriGuard-managed plot with a control plot under the farmer's usual practice.",
    ],
  };
  data.summary = await impactNarrative(summary.totals, data.farmName).catch(() => null);
  for (const [index, field] of summary.fields.entries()) {
    const crop = await db.orm.public.Crop.where({ fieldId: field.fieldId, status: "ACTIVE" }).first();
    data.fields[index].crop = crop?.name ?? null;
  }
  return renderImpactPdf(data);
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

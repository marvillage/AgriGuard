import db from "../config/database.js";
import { baselinePractice, defaultKwhPerKilolitre, gridKgCo2PerKwh } from "../data/soils.js";
import { squareMetresPerAcre } from "../lib/geo.js";
import { sha256 } from "../lib/ids.js";
import { addDays, dayKey, parseTimestamp, startOfLocalDay } from "../lib/time.js";
import type { FarmRow, FieldRow, LedgerRow } from "../types/models.js";
import { methodFor } from "./agronomy.service.js";

export function baselineFor(field: FieldRow, farm: FarmRow) {
  const method = methodFor(field, farm);
  const practice = baselinePractice[method];
  return {
    method,
    depthMm: farm.baselineDepthMm ?? practice.depthMm,
    intervalDays: Math.max(1, Math.round(farm.baselineIntervalDays ?? practice.intervalDays)),
  };
}

// kWh per litre from metered events on this field, else pump rating, else a 30 m-head default.
export async function energyPerLitre(field: FieldRow) {
  const metered = await db.orm.public.IrrigationEvent
    .where({ fieldId: field.id, measured: true })
    .where((e) => e.kwh.isNotNull())
    .where((e) => e.litres.gt(0))
    .limit(200)
    .all();
  const litres = metered.reduce((sum, e) => sum + (e.litres ?? 0), 0);
  const kwh = metered.reduce((sum, e) => sum + (e.kwh ?? 0), 0);
  if (litres > 1000 && kwh > 0) return { value: kwh / litres, source: "energy meter" };
  if (field.pumpPowerKw && field.pumpFlowLpm) return { value: field.pumpPowerKw / (field.pumpFlowLpm * 60), source: "pump rating" };
  return { value: defaultKwhPerKilolitre / 1000, source: "30 m head estimate" };
}

export async function anchorDay(field: FieldRow) {
  const crop = await db.orm.public.Crop.where({ fieldId: field.id }).orderBy((c) => c.plantingDate.asc()).first();
  const first = await db.orm.public.FieldObservation
    .where({ fieldId: field.id })
    .where((o) => o.source.in(pumpSources))
    .orderBy((o) => o.observedAt.asc())
    .first();
  const firstEvent = await db.orm.public.IrrigationEvent.where({ fieldId: field.id }).orderBy((e) => e.startedAt.asc()).first();
  const candidates = [first?.observedAt, firstEvent?.startedAt]
    .map((value) => parseTimestamp(value ?? null))
    .filter((value): value is Date => value !== null);
  const dataStart = candidates.length ? new Date(Math.min(...candidates.map((d) => d.getTime()))) : null;
  const planted = parseTimestamp(crop?.plantingDate ?? null);
  const start = dataStart && planted ? (planted > dataStart ? planted : dataStart) : dataStart;
  return start ? dayKey(start) : null;
}

// Readings that come from a pump node, which knows whether the pump ran.
const pumpSources: Array<"DEVICE" | "SIMULATOR"> = ["DEVICE", "SIMULATOR"];

// A period counts only when water use was recorded: an irrigation event, or a pump node reporting.
// Without either, a field has no evidence of how much it pumped, so it claims no saving.
export async function tracksWater(fieldId: number, start: Date, end: Date, events: number) {
  if (events > 0) return true;
  const reading = await db.orm.public.FieldObservation
    .where({ fieldId })
    .where((o) => o.source.in(pumpSources))
    .where((o) => o.observedAt.gte(start.toISOString()))
    .where((o) => o.observedAt.lt(end.toISOString()))
    .first();
  return reading !== null;
}

export async function periodUsage(field: FieldRow, start: Date, end: Date) {
  const events = await db.orm.public.IrrigationEvent
    .where({ fieldId: field.id })
    .where((e) => e.startedAt.gte(start.toISOString()))
    .where((e) => e.startedAt.lt(end.toISOString()))
    .all();
  const litres = events.reduce((sum, e) => sum + (e.litres ?? 0), 0);
  const measured = events.length > 0 && events.every((e) => e.measured);
  return { litres, events: events.length, measured, kwh: events.reduce((sum, e) => sum + (e.kwh ?? 0), 0) };
}

// Control plots of a trial follow the farmer's usual practice, so they are not counted as savings.
export async function controlFieldIds() {
  const trials = await db.orm.public.Trial.where({ status: "ACTIVE" }).select("controlFieldId").all();
  return new Set(trials.map((trial) => trial.controlFieldId));
}

// Writes one ledger entry for every completed baseline period that is not recorded yet.
export async function syncFieldLedger(fieldId: number, now = new Date()) {
  const field = await db.orm.public.Field.first({ id: fieldId });
  if (!field) return [];
  if ((await controlFieldIds()).has(fieldId)) return [];
  const farm = (await db.orm.public.Farm.first({ id: field.farmId }))!;
  const anchor = await anchorDay(field);
  if (!anchor) return [];

  const baseline = baselineFor(field, farm);
  const areaM2 = field.area * squareMetresPerAcre;
  const baselineLitres = baseline.depthMm * areaM2;
  const energy = await energyPerLitre(field);
  const created: LedgerRow[] = [];

  let periodStartKey = anchor;
  for (let guard = 0; guard < 400; guard += 1) {
    const periodEndKey = addDays(periodStartKey, baseline.intervalDays);
    const start = startOfLocalDay(periodStartKey);
    const end = startOfLocalDay(periodEndKey);
    if (end > now) break;

    const entryKey = `water:${field.id}:${periodStartKey}`;
    const existing = await db.orm.public.SustainabilityRecord.where({ entryKey }).first();
    if (!existing) {
      const usage = await periodUsage(field, start, end);
      if (!(await tracksWater(field.id, start, end, usage.events))) {
        periodStartKey = periodEndKey;
        continue;
      }
      const saved = Math.max(0, baselineLitres - usage.litres);
      const kwhSaved = saved * energy.value;
      const entry = await appendEntry(field.id, {
        kind: "WATER",
        method: usage.measured ? "MEASURED" : "ESTIMATED",
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        baselineWater: Math.round(baselineLitres),
        waterUsed: Math.round(usage.litres),
        waterSaved: Math.round(saved),
        fertilizerReduced: 0,
        kwhSaved: round3(kwhSaved),
        co2Kg: round3(kwhSaved * gridKgCo2PerKwh),
        rupeesSaved: Math.round(kwhSaved * farm.electricityRate),
        sourceRef: `baseline ${baseline.method} ${baseline.depthMm} mm / ${baseline.intervalDays} d; ${usage.events} irrigation event(s); energy ${energy.source}`,
        entryKey,
      });
      created.push(entry);
    }
    periodStartKey = periodEndKey;
  }
  return created;
}

export async function recordFertilizerSaving(fieldId: number, planId: number, fertilizerKgSaved: number, rupeesSaved: number) {
  const entryKey = `fertilizer:${fieldId}:${planId}`;
  const existing = await db.orm.public.SustainabilityRecord.where({ entryKey }).first();
  if (existing) return existing;
  const now = new Date().toISOString();
  return appendEntry(fieldId, {
    kind: "FERTILIZER",
    method: "SOIL_TEST",
    periodStart: now,
    periodEnd: now,
    baselineWater: 0,
    waterUsed: 0,
    waterSaved: 0,
    fertilizerReduced: Math.max(0, Math.round(fertilizerKgSaved * 10) / 10),
    kwhSaved: 0,
    co2Kg: 0,
    rupeesSaved: Math.max(0, Math.round(rupeesSaved)),
    sourceRef: `fertilizer plan ${planId} vs blanket recommended dose`,
    entryKey,
  });
}

type EntryInput = {
  kind: string;
  method: string;
  periodStart: string;
  periodEnd: string;
  baselineWater: number;
  waterUsed: number;
  waterSaved: number;
  fertilizerReduced: number;
  kwhSaved: number;
  co2Kg: number;
  rupeesSaved: number;
  sourceRef: string;
  entryKey: string;
};

async function appendEntry(fieldId: number, input: EntryInput) {
  const previous = await db.orm.public.SustainabilityRecord
    .where({ fieldId })
    .where((r) => r.hash.isNotNull())
    .orderBy((r) => r.id.desc())
    .first();
  const prevHash = previous?.hash ?? null;
  const hash = sha256(canonical(fieldId, input, prevHash));
  return db.orm.public.SustainabilityRecord.create({
    fieldId,
    ...input,
    estimatedImpact: `${input.waterSaved} L water, ${input.kwhSaved} kWh, Rs ${input.rupeesSaved}`,
    prevHash,
    hash,
    recordedAt: new Date().toISOString(),
  });
}

function canonical(fieldId: number, input: EntryInput, prevHash: string | null) {
  return JSON.stringify([
    fieldId,
    input.kind,
    input.method,
    input.periodStart,
    input.periodEnd,
    input.baselineWater,
    input.waterUsed,
    input.waterSaved,
    input.fertilizerReduced,
    input.kwhSaved,
    input.co2Kg,
    input.rupeesSaved,
    input.entryKey,
    prevHash,
  ]);
}

export async function verifyLedger(fieldIds: number[]) {
  let entries = 0;
  let broken = 0;
  let firstHash: string | null = null;
  let lastHash: string | null = null;
  for (const fieldId of fieldIds) {
    const rows = await db.orm.public.SustainabilityRecord
      .where({ fieldId })
      .where((r) => r.hash.isNotNull())
      .orderBy((r) => r.id.asc())
      .all();
    let prev: string | null = null;
    for (const row of rows) {
      entries += 1;
      const input: EntryInput = {
        kind: row.kind ?? "",
        method: row.method ?? "",
        periodStart: normalize(row.periodStart),
        periodEnd: normalize(row.periodEnd),
        baselineWater: row.baselineWater ?? 0,
        waterUsed: row.waterUsed ?? 0,
        waterSaved: row.waterSaved ?? 0,
        fertilizerReduced: row.fertilizerReduced ?? 0,
        kwhSaved: row.kwhSaved ?? 0,
        co2Kg: row.co2Kg ?? 0,
        rupeesSaved: row.rupeesSaved ?? 0,
        sourceRef: row.sourceRef ?? "",
        entryKey: row.entryKey ?? "",
      };
      const expected = sha256(canonical(fieldId, input, prev));
      if (row.prevHash !== prev || row.hash !== expected) broken += 1;
      firstHash = firstHash ?? row.hash;
      lastHash = row.hash;
      prev = row.hash;
    }
  }
  return { entries, broken, verified: broken === 0, firstHash, lastHash };
}

// Stored timestamptz comes back as Postgres text; hashes were computed over the ISO string we wrote.
function normalize(value: string | null) {
  return parseTimestamp(value)?.toISOString() ?? "";
}

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

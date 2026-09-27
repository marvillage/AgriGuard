import db from "../config/database.js";
import { daysAgo, parseTimestamp } from "../lib/time.js";
import { AppError } from "../utils/AppError.js";
import type { AuthUser } from "../utils/auth.types.js";
import type { TrialRow } from "../types/models.js";
import { farmAccess } from "./access.service.js";

export async function listTrials(user: AuthUser, farmId: number) {
  await farmAccess(user, farmId);
  const trials = await db.orm.public.Trial.where({ farmId }).orderBy((t) => t.createdAt.desc()).all();
  return Promise.all(trials.map(async (trial) => ({ ...trial, results: await trialResults(trial) })));
}

export async function createTrial(
  user: AuthUser,
  farmId: number,
  input: { name: string; treatmentFieldId: number; controlFieldId: number; startDate?: string; notes?: string }
) {
  const { access } = await farmAccess(user, farmId);
  if (access === "advisor") throw new AppError("Only the farm owner can create trials", 403);
  if (input.treatmentFieldId === input.controlFieldId) throw new AppError("Pick two different fields", 400);
  const fields = await db.orm.public.Field
    .where((f) => f.id.in([input.treatmentFieldId, input.controlFieldId]))
    .where({ farmId })
    .all();
  if (fields.length !== 2) throw new AppError("Both fields must belong to this farm", 400);

  return db.orm.public.Trial.create({
    farmId,
    name: input.name,
    treatmentFieldId: input.treatmentFieldId,
    controlFieldId: input.controlFieldId,
    startDate: input.startDate ?? daysAgo(0).toISOString(),
    notes: input.notes ?? null,
  });
}

export async function updateTrial(
  user: AuthUser,
  trialId: number,
  input: { status?: "ACTIVE" | "COMPLETED"; treatmentYieldKg?: number | null; controlYieldKg?: number | null; notes?: string; endDate?: string | null }
) {
  const trial = await db.orm.public.Trial.first({ id: trialId });
  if (!trial) throw new AppError("Trial not found", 404);
  const { access } = await farmAccess(user, trial.farmId);
  if (access === "advisor") throw new AppError("Only the farm owner can update trials", 403);
  const endDate = input.status === "COMPLETED" && !trial.endDate && input.endDate === undefined ? new Date().toISOString() : input.endDate;
  return db.orm.public.Trial.where({ id: trialId }).update({ ...input, ...(endDate !== undefined ? { endDate } : {}) });
}

export async function deleteTrial(user: AuthUser, trialId: number) {
  const trial = await db.orm.public.Trial.first({ id: trialId });
  if (!trial) throw new AppError("Trial not found", 404);
  const { access } = await farmAccess(user, trial.farmId);
  if (access === "advisor") throw new AppError("Only the farm owner can delete trials", 403);
  await db.orm.public.Trial.where({ id: trialId }).delete();
}

export async function trialResults(trial: TrialRow) {
  const start = parseTimestamp(trial.startDate) ?? new Date();
  const end = parseTimestamp(trial.endDate) ?? new Date();
  const [treatment, control] = await Promise.all([
    plotStats(trial.treatmentFieldId, start, end),
    plotStats(trial.controlFieldId, start, end),
  ]);
  const savingPct =
    control && treatment && control.litresPerAcre > 0
      ? Math.round(((control.litresPerAcre - treatment.litresPerAcre) / control.litresPerAcre) * 1000) / 10
      : null;
  const energySavingPct =
    control && treatment && control.kwhPerAcre > 0
      ? Math.round(((control.kwhPerAcre - treatment.kwhPerAcre) / control.kwhPerAcre) * 1000) / 10
      : null;
  const yieldChangePct =
    trial.controlYieldKg && trial.treatmentYieldKg && control && treatment
      ? Math.round(
          ((trial.treatmentYieldKg / treatment.areaAcres - trial.controlYieldKg / control.areaAcres) /
            (trial.controlYieldKg / control.areaAcres)) *
            1000
        ) / 10
      : null;
  return {
    days: Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000)),
    treatment,
    control,
    savingPct,
    energySavingPct,
    yieldChangePct,
  };
}

async function plotStats(fieldId: number, start: Date, end: Date) {
  const field = await db.orm.public.Field.first({ id: fieldId });
  if (!field) return null;
  const events = await db.orm.public.IrrigationEvent
    .where({ fieldId })
    .where((e) => e.startedAt.gte(start.toISOString()))
    .where((e) => e.startedAt.lte(end.toISOString()))
    .orderBy((e) => e.startedAt.asc())
    .all();
  const readings = await db.orm.public.FieldObservation
    .where({ fieldId })
    .where((o) => o.observedAt.gte(start.toISOString()))
    .where((o) => o.observedAt.lte(end.toISOString()))
    .where((o) => o.soilMoisture.isNotNull())
    .select("soilMoisture")
    .all();
  const litres = events.reduce((sum, e) => sum + (e.litres ?? 0), 0);
  const kwh = events.reduce((sum, e) => sum + (e.kwh ?? 0), 0);
  const moisture = readings.map((r) => r.soilMoisture!).filter((v) => Number.isFinite(v));

  let cumulative = 0;
  const series = events.map((event) => {
    cumulative += event.litres ?? 0;
    return { time: parseTimestamp(event.startedAt)?.toISOString() ?? event.startedAt, litresPerAcre: Math.round(cumulative / field.area) };
  });

  return {
    fieldId,
    name: field.name,
    areaAcres: field.area,
    irrigations: events.length,
    litres: Math.round(litres),
    litresPerAcre: Math.round(litres / field.area),
    kwh: Math.round(kwh * 10) / 10,
    kwhPerAcre: Math.round((kwh / field.area) * 100) / 100,
    measured: events.length > 0 && events.every((e) => e.measured),
    meanMoisture: moisture.length ? Math.round((moisture.reduce((a, b) => a + b, 0) / moisture.length) * 10) / 10 : null,
    series,
  };
}

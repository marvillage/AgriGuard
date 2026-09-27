import db from "../config/database.js";
import { publish } from "../lib/events.js";
import { parseTimestamp } from "../lib/time.js";
import { AppError } from "../utils/AppError.js";
import type { AuthUser } from "../utils/auth.types.js";
import type { DeviceRow, FieldRow, ObservationRow } from "../types/models.js";
import { defaultFlowLpm, methodFor } from "./agronomy.service.js";
import { farmMemberIds, fieldAccess } from "./access.service.js";
import { decideIrrigation, recordDecision, scheduleEnd, withinSchedule, type FieldContext } from "./engine.service.js";

const maxRunMinutes = 180;

export interface PumpCommand {
  pump: "ON" | "OFF";
  runSeconds: number;
  reason: string;
  params: Record<string, string | number>;
  source: "AUTO" | "MANUAL" | "SCHEDULE";
  plannedLitres: number | null;
}

export async function commandFor(context: FieldContext, device: DeviceRow, now = new Date()): Promise<PumpCommand> {
  const off = (reason: string, params: Record<string, string | number> = {}): PumpCommand => ({
    pump: "OFF",
    runSeconds: 0,
    reason,
    params,
    source: "AUTO",
    plannedLitres: null,
  });

  if (device.pumpMode === "MANUAL_OFF") return off("MANUAL_OFF");

  const decision = decideIrrigation(context);
  if (decision.action === "BLOCKED_TANK") {
    await recordDecision(context.field.id, decision, now);
    return off("BLOCKED_TANK", decision.params as Record<string, number>);
  }

  if (device.pumpMode === "MANUAL_ON") {
    const until = parseTimestamp(device.manualUntil);
    if (until && until > now) {
      return {
        pump: "ON",
        runSeconds: Math.round((until.getTime() - now.getTime()) / 1000),
        reason: "MANUAL_ON",
        params: {},
        source: "MANUAL",
        plannedLitres: null,
      };
    }
    await db.orm.public.Device.where({ id: device.id }).update({ pumpMode: "AUTO", manualUntil: null });
  }

  const fixed = context.schedules.find((schedule) => schedule.mode === "FIXED" && withinSchedule(schedule, now));
  if (fixed) {
    const end = scheduleEnd(fixed, now);
    return {
      pump: "ON",
      runSeconds: Math.round((end.getTime() - now.getTime()) / 1000),
      reason: "SCHEDULE",
      params: {},
      source: "SCHEDULE",
      plannedLitres: null,
    };
  }

  const activeUntil = parseTimestamp(device.commandUntil);
  if (device.commandPump === "ON" && activeUntil && activeUntil > now) {
    const moisture = decision.moisture;
    if (moisture !== null && moisture !== undefined && moisture >= decision.water.fieldCapacity - 1) {
      await clearCommand(device.id);
      return off("TARGET_REACHED", { moisture: Math.round(moisture) });
    }
    return {
      pump: "ON",
      runSeconds: Math.round((activeUntil.getTime() - now.getTime()) / 1000),
      reason: "RUNNING",
      params: {},
      source: "AUTO",
      plannedLitres: null,
    };
  }

  await recordDecision(context.field.id, decision, now);

  if (decision.action !== "IRRIGATE") {
    if (device.commandPump === "ON") await clearCommand(device.id);
    return off(decision.action, decision.params as Record<string, number>);
  }

  const minutes = Math.min(maxRunMinutes, Math.max(5, decision.plan.runMinutes ?? 30));
  const until = new Date(now.getTime() + minutes * 60000);
  await db.orm.public.Device.where({ id: device.id }).update({ commandPump: "ON", commandUntil: until.toISOString() });
  return {
    pump: "ON",
    runSeconds: minutes * 60,
    reason: "IRRIGATE",
    params: { litres: decision.plan.litres, minutes },
    source: "AUTO",
    plannedLitres: decision.plan.litres,
  };
}

async function clearCommand(deviceId: number) {
  await db.orm.public.Device.where({ id: deviceId }).update({ commandPump: "OFF", commandUntil: null });
}

// Opens an irrigation event when the relay turns on and closes it (with measured or estimated volume) when it turns off.
type PumpReading = Pick<ObservationRow, "pumpOn" | "flowTotalL" | "energyTotalKwh">;

export async function trackIrrigation(
  device: DeviceRow,
  field: FieldRow,
  observation: PumpReading,
  command: PumpCommand | null,
  now = new Date()
) {
  const pumpOn = observation.pumpOn ?? false;
  const open = await db.orm.public.IrrigationEvent
    .where({ deviceId: device.id })
    .where((e) => e.endedAt.isNull())
    .orderBy((e) => e.startedAt.desc())
    .first();

  if (pumpOn && !open) {
    return db.orm.public.IrrigationEvent.create({
      fieldId: field.id,
      deviceId: device.id,
      source: command?.source ?? (device.pumpMode === "MANUAL_ON" ? "MANUAL" : "AUTO"),
      startedAt: now.toISOString(),
      plannedLitres: command?.plannedLitres ?? null,
      reason: command?.reason ?? null,
      startFlowTotalL: observation.flowTotalL,
      startEnergyTotalKwh: observation.energyTotalKwh,
      measured: observation.flowTotalL !== null,
    });
  }

  if (!open) return null;

  const started = parseTimestamp(open.startedAt) ?? now;
  const minutes = Math.max(0, (now.getTime() - started.getTime()) / 60000);
  const usage = await usageForEvent(open, device, field, observation, minutes);

  if (pumpOn) {
    return db.orm.public.IrrigationEvent.where({ id: open.id }).update({ litres: usage.litres, kwh: usage.kwh, measured: usage.measured });
  }

  return db.orm.public.IrrigationEvent.where({ id: open.id }).update({
    endedAt: now.toISOString(),
    litres: usage.litres,
    kwh: usage.kwh,
    solarKwh: usage.solarKwh,
    measured: usage.measured,
  });
}

async function usageForEvent(
  event: { id: number; startFlowTotalL: number | null; startEnergyTotalKwh: number | null; startedAt: string },
  device: DeviceRow,
  field: FieldRow,
  observation: PumpReading,
  minutes: number
) {
  const farm = await db.orm.public.Farm.first({ id: field.farmId });
  const method = farm ? methodFor(field, farm) : "flood";
  const flowLpm = field.pumpFlowLpm ?? defaultFlowLpm(method);
  const meteredLitres =
    event.startFlowTotalL !== null && observation.flowTotalL !== null
      ? Math.max(0, observation.flowTotalL - event.startFlowTotalL)
      : null;
  const meteredKwh =
    event.startEnergyTotalKwh !== null && observation.energyTotalKwh !== null
      ? Math.max(0, observation.energyTotalKwh - event.startEnergyTotalKwh)
      : null;
  const litres = meteredLitres ?? Math.round(minutes * flowLpm);
  const kwh = meteredKwh ?? (field.pumpPowerKw ? (minutes / 60) * field.pumpPowerKw : null);

  let solarKwh: number | null = null;
  if (device.hasSolar && kwh !== null) {
    const readings = await db.orm.public.FieldObservation
      .where({ deviceId: device.id })
      .where((o) => o.observedAt.gte(event.startedAt))
      .select("solarW")
      .all();
    const solar = readings.map((r) => r.solarW).filter((v): v is number => typeof v === "number");
    if (solar.length) {
      const averageKw = solar.reduce((a, b) => a + b, 0) / solar.length / 1000;
      solarKwh = Math.min(kwh, averageKw * (minutes / 60));
    }
  }

  return {
    litres: Math.round(litres),
    kwh: kwh === null ? null : Math.round(kwh * 1000) / 1000,
    solarKwh: solarKwh === null ? null : Math.round(solarKwh * 1000) / 1000,
    measured: meteredLitres !== null,
  };
}

export async function setPumpMode(
  user: AuthUser,
  fieldId: number,
  input: { mode: "AUTO" | "MANUAL_ON" | "MANUAL_OFF"; minutes?: number; deviceId?: number }
) {
  const { farm } = await fieldAccess(user, fieldId, { write: true });
  const device = input.deviceId
    ? await db.orm.public.Device.where({ id: input.deviceId, fieldId }).first()
    : await db.orm.public.Device.where({ fieldId }).orderBy((d) => d.id.asc()).first();
  if (!device) throw new AppError("No field node is registered on this field", 404);

  const minutes = Math.min(maxRunMinutes, Math.max(1, input.minutes ?? 30));
  const updated = await db.orm.public.Device.where({ id: device.id }).update({
    pumpMode: input.mode,
    manualUntil: input.mode === "MANUAL_ON" ? new Date(Date.now() + minutes * 60000).toISOString() : null,
    commandPump: input.mode === "MANUAL_OFF" ? "OFF" : device.commandPump,
    commandUntil: input.mode === "MANUAL_OFF" ? null : device.commandUntil,
  });

  const members = await farmMemberIds(farm.id);
  publish(members, "pump", { fieldId, deviceId: device.id, mode: input.mode });
  return updated;
}

export async function listEvents(user: AuthUser, fieldId: number, limit = 50) {
  await fieldAccess(user, fieldId);
  return db.orm.public.IrrigationEvent.where({ fieldId }).orderBy((e) => e.startedAt.desc()).limit(limit).all();
}

export async function listDecisions(user: AuthUser, fieldId: number, limit = 50) {
  await fieldAccess(user, fieldId);
  return db.orm.public.IrrigationDecision.where({ fieldId }).orderBy((d) => d.decidedAt.desc()).limit(limit).all();
}

export async function listSchedules(user: AuthUser, fieldId: number) {
  await fieldAccess(user, fieldId);
  return db.orm.public.PumpSchedule.where({ fieldId }).orderBy((s) => s.startTime.asc()).all();
}

export async function createSchedule(
  user: AuthUser,
  fieldId: number,
  input: { startTime: string; durationMinutes: number; days: string; mode: "SMART" | "FIXED"; enabled?: boolean }
) {
  await fieldAccess(user, fieldId, { write: true });
  return db.orm.public.PumpSchedule.create({ fieldId, ...input, enabled: input.enabled ?? true });
}

export async function updateSchedule(user: AuthUser, fieldId: number, scheduleId: number, input: { enabled?: boolean; startTime?: string; durationMinutes?: number; days?: string; mode?: "SMART" | "FIXED" }) {
  await fieldAccess(user, fieldId, { write: true });
  const updated = await db.orm.public.PumpSchedule.where({ id: scheduleId, fieldId }).update(input);
  if (!updated) throw new AppError("Schedule not found", 404);
  return updated;
}

export async function deleteSchedule(user: AuthUser, fieldId: number, scheduleId: number) {
  await fieldAccess(user, fieldId, { write: true });
  await db.orm.public.PumpSchedule.where({ id: scheduleId, fieldId }).delete();
}

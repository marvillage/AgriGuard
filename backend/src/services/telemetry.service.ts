import db from "../config/database.js";
import { publish } from "../lib/events.js";
import { isFieldDeleting } from "../lib/field-lock.js";
import { parseTimestamp } from "../lib/time.js";
import { AppError } from "../utils/AppError.js";
import { round } from "./agronomy.service.js";
import { farmMemberIds } from "./access.service.js";
import { analyzeField, loadContext } from "./engine.service.js";
import { commandFor, trackIrrigation } from "./pump.service.js";
import { upsertRecommendation } from "./recommendation.service.js";

export interface TelemetryInput {
  soilMoisture?: number;
  soilTemp?: number;
  airTemp?: number;
  humidity?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  flowTotalL?: number;
  flowRateLpm?: number;
  energyTotalKwh?: number;
  powerW?: number;
  tankDistanceCm?: number;
  tankLevel?: number;
  solarW?: number;
  solarV?: number;
  batteryPct?: number;
  rssi?: number;
  pumpOn?: boolean;
  firmware?: string;
  uptimeSec?: number;
  rainfall?: number;
}

const measuredKeys = [
  "soilMoisture",
  "soilTemperature",
  "temperature",
  "humidity",
  "rainfall",
  "nitrogen",
  "phosphorus",
  "potassium",
  "flowTotalL",
  "flowRateLpm",
  "energyTotalKwh",
  "powerW",
  "tankDistanceCm",
  "tankLevel",
  "solarW",
  "batteryPct",
  "rssi",
] as const;

const analysisEveryMs = 15 * 60 * 1000;
const lastAnalysis = new Map<number, number>();

export async function ingestTelemetry(deviceKey: string | undefined, input: TelemetryInput, now = new Date()) {
  if (!deviceKey) throw new AppError("Missing X-Device-Key header", 401);
  const device = await db.orm.public.Device.where({ deviceKey }).first();
  if (!device) throw new AppError("Unknown device key", 401);
  if (isFieldDeleting(device.fieldId)) throw new AppError("This field is being deleted", 409);
  const field = (await db.orm.public.Field.first({ id: device.fieldId }))!;

  const tankLevel =
    input.tankLevel ??
    (input.tankDistanceCm !== undefined && device.tankHeightCm
      ? Math.max(0, Math.min(100, ((device.tankHeightCm - input.tankDistanceCm) / device.tankHeightCm) * 100))
      : undefined);

  const reading = {
    fieldId: field.id,
    deviceId: device.id,
    source: device.simulated ? ("SIMULATOR" as const) : ("DEVICE" as const),
    soilMoisture: input.soilMoisture ?? null,
    soilTemperature: input.soilTemp ?? null,
    temperature: input.airTemp ?? null,
    humidity: input.humidity ?? null,
    rainfall: input.rainfall ?? null,
    nitrogen: input.nitrogen ?? null,
    phosphorus: input.phosphorus ?? null,
    potassium: input.potassium ?? null,
    flowTotalL: input.flowTotalL ?? null,
    flowRateLpm: input.flowRateLpm ?? null,
    energyTotalKwh: input.energyTotalKwh ?? null,
    powerW: input.powerW ?? null,
    tankDistanceCm: input.tankDistanceCm ?? null,
    tankLevel: tankLevel === undefined ? null : round(tankLevel),
    solarW: input.solarW ?? null,
    batteryPct: input.batteryPct ?? null,
    rssi: input.rssi === undefined ? null : Math.round(input.rssi),
    pumpOn: input.pumpOn ?? device.pumpOn,
    observedAt: now.toISOString(),
  };
  // A phone used as the pump controller sends only the pump state, which the device and its irrigation events keep.
  const measured = measuredKeys.some((key) => reading[key] !== null);
  const observation = measured ? await db.orm.public.FieldObservation.create(reading) : reading;

  const updatedDevice = await db.orm.public.Device.where({ id: device.id }).update({
    lastSeenAt: now.toISOString(),
    firmware: input.firmware ?? device.firmware,
    batteryPct: input.batteryPct ?? device.batteryPct,
    rssi: input.rssi === undefined ? device.rssi : Math.round(input.rssi),
    pumpOn: input.pumpOn ?? device.pumpOn,
    lastFlowTotalL: input.flowTotalL ?? device.lastFlowTotalL,
    lastEnergyTotalKwh: input.energyTotalKwh ?? device.lastEnergyTotalKwh,
    hasFlowMeter: device.hasFlowMeter || input.flowTotalL !== undefined,
    hasEnergyMeter: device.hasEnergyMeter || input.energyTotalKwh !== undefined,
    hasTankSensor: device.hasTankSensor || tankLevel !== undefined,
    hasSolar: device.hasSolar || input.solarW !== undefined,
  });
  const liveDevice = updatedDevice ?? device;

  // A watering that just ended is closed first, so the decision below already counts its water.
  if (!observation.pumpOn) await trackIrrigation(liveDevice, field, observation, null, now);

  const context = await loadContext(field.id, now);
  let command = await commandFor(context, liveDevice, now);

  const anomaly = await checkTelemetryAnomalies(liveDevice, field, observation, now);
  if (anomaly === "NO_FLOW" && command.pump === "ON") {
    await db.orm.public.Device.where({ id: device.id }).update({ commandPump: "OFF", commandUntil: null });
    command = { ...command, pump: "OFF", runSeconds: 0, reason: "NO_FLOW" };
  }

  if (observation.pumpOn) await trackIrrigation(liveDevice, field, observation, command, now);

  const members = await farmMemberIds(field.farmId);
  publish(members, "telemetry", {
    fieldId: field.id,
    deviceId: device.id,
    observation,
    command: { pump: command.pump, reason: command.reason, runSeconds: command.runSeconds },
  });

  const last = lastAnalysis.get(field.id) ?? 0;
  if (now.getTime() - last >= analysisEveryMs) {
    lastAnalysis.set(field.id, now.getTime());
    analyzeField(field.id, { now, trigger: "telemetry" }).catch((error) => console.error("analysis failed", error));
  }

  const pumping = command.pump === "ON" || observation.pumpOn;
  return {
    pump: command.pump,
    runSeconds: command.runSeconds,
    reason: command.reason,
    reportEverySeconds: pumping ? 15 : 60,
    serverTime: now.toISOString(),
  };
}

async function checkTelemetryAnomalies(
  device: { id: number; name: string; hasFlowMeter: boolean },
  field: { id: number; name: string; farmId: number },
  observation: { pumpOn: boolean | null; flowRateLpm: number | null },
  now: Date
): Promise<"LEAK" | "NO_FLOW" | null> {
  const flow = observation.flowRateLpm;
  if (flow === null) return null;

  const previous = await db.orm.public.FieldObservation
    .where({ deviceId: device.id })
    .orderBy((o) => o.observedAt.desc())
    .limit(3)
    .all();

  if (!observation.pumpOn && flow > 0.5) {
    const sustained = previous.slice(1).some((o) => !o.pumpOn && (o.flowRateLpm ?? 0) > 0.5);
    if (sustained) {
      await upsertRecommendation({
        fieldId: field.id,
        farmId: field.farmId,
        code: "LEAK_SUSPECTED",
        type: "IRRIGATION",
        priority: "HIGH",
        params: { field: field.name, flow: round(flow), litresPerDay: Math.round(flow * 1440) },
        supportingFactors: "Flow meter pulses detected with the pump relay off",
      });
      return "LEAK";
    }
  }

  if (observation.pumpOn && device.hasFlowMeter && flow < 0.3) {
    const open = await db.orm.public.IrrigationEvent
      .where({ deviceId: device.id })
      .where((e) => e.endedAt.isNull())
      .first();
    const started = parseTimestamp(open?.startedAt ?? null);
    if (started && now.getTime() - started.getTime() > 3 * 60000) {
      await upsertRecommendation({
        fieldId: field.id,
        farmId: field.farmId,
        code: "NO_FLOW",
        type: "IRRIGATION",
        priority: "HIGH",
        params: { field: field.name },
        supportingFactors: "Pump relay on for over 3 minutes with zero flow",
      });
      return "NO_FLOW";
    }
  }

  return null;
}

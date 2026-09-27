import db from "../config/database.js";
import { env } from "../config/env.js";
import { deviceKey } from "../lib/ids.js";
import { parseTimestamp } from "../lib/time.js";
import { AppError } from "../utils/AppError.js";
import type { AuthUser } from "../utils/auth.types.js";
import type { DeviceRow } from "../types/models.js";
import { accessibleFieldIds, fieldAccess } from "./access.service.js";

export function present(device: DeviceRow, options: { revealKey?: boolean } = {}) {
  const lastSeen = parseTimestamp(device.lastSeenAt);
  const minutesAgo = lastSeen ? Math.round((Date.now() - lastSeen.getTime()) / 60000) : null;
  return {
    ...device,
    deviceKey: options.revealKey ? device.deviceKey : `${device.deviceKey.slice(0, 8)}…`,
    online: minutesAgo !== null && minutesAgo <= 10,
    minutesSinceSeen: minutesAgo,
    telemetryUrl: `${env.publicApiUrl}/api/device/telemetry`,
  };
}

export async function listDevices(user: AuthUser, fieldId?: number) {
  const fieldIds = fieldId ? [fieldId] : await accessibleFieldIds(user);
  if (fieldId) await fieldAccess(user, fieldId);
  if (fieldIds.length === 0) return [];
  const devices = await db.orm.public.Device.where((d) => d.fieldId.in(fieldIds)).orderBy((d) => d.id.asc()).all();
  const fields = await db.orm.public.Field.where((f) => f.id.in(fieldIds)).select("id", "name", "farmId").all();
  return devices.map((device) => ({ ...present(device), fieldName: fields.find((f) => f.id === device.fieldId)?.name ?? "" }));
}

export async function registerDevice(
  user: AuthUser,
  fieldId: number,
  input: { name: string; simulated?: boolean; tankHeightCm?: number; tankCapacityL?: number; dryRunLevelPct?: number }
) {
  await fieldAccess(user, fieldId, { write: true });
  const device = await db.orm.public.Device.create({
    fieldId,
    name: input.name,
    deviceKey: deviceKey(),
    simulated: input.simulated ?? false,
    tankHeightCm: input.tankHeightCm ?? null,
    tankCapacityL: input.tankCapacityL ?? null,
    dryRunLevelPct: input.dryRunLevelPct ?? 15,
  });
  return present(device, { revealKey: true });
}

export async function updateDevice(
  user: AuthUser,
  deviceId: number,
  input: Partial<{ name: string; tankHeightCm: number | null; tankCapacityL: number | null; dryRunLevelPct: number; hasFlowMeter: boolean; hasEnergyMeter: boolean; hasTankSensor: boolean; hasSolar: boolean }>
) {
  const device = await db.orm.public.Device.first({ id: deviceId });
  if (!device) throw new AppError("Device not found", 404);
  await fieldAccess(user, device.fieldId, { write: true });
  const updated = await db.orm.public.Device.where({ id: deviceId }).update(input);
  return present(updated ?? device);
}

export async function revealDeviceKey(user: AuthUser, deviceId: number) {
  const device = await db.orm.public.Device.first({ id: deviceId });
  if (!device) throw new AppError("Device not found", 404);
  await fieldAccess(user, device.fieldId, { write: true });
  return present(device, { revealKey: true });
}

export async function rotateDeviceKey(user: AuthUser, deviceId: number) {
  const device = await db.orm.public.Device.first({ id: deviceId });
  if (!device) throw new AppError("Device not found", 404);
  await fieldAccess(user, device.fieldId, { write: true });
  const updated = await db.orm.public.Device.where({ id: deviceId }).update({ deviceKey: deviceKey() });
  return present(updated ?? device, { revealKey: true });
}

export async function deleteDevice(user: AuthUser, deviceId: number) {
  const device = await db.orm.public.Device.first({ id: deviceId });
  if (!device) throw new AppError("Device not found", 404);
  await fieldAccess(user, device.fieldId, { write: true });
  await db.orm.public.Device.where({ id: deviceId }).delete();
}

import db from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import type { AuthUser } from "../utils/auth.types.js";

export type Access = "owner" | "advisor" | "admin";

export async function accessibleFarms(user: AuthUser) {
  if (user.role === "ADMIN") {
    const farms = await db.orm.public.Farm.orderBy((f) => f.id.asc()).all();
    return farms.map((farm) => ({ farm, access: "admin" as Access }));
  }

  const owned = await db.orm.public.Farm.where({ ownerId: user.id }).orderBy((f) => f.id.asc()).all();
  const links = await db.orm.public.FarmAdvisor.where({ advisorId: user.id }).all();
  const advisedIds = links.map((link) => link.farmId).filter((id) => !owned.some((farm) => farm.id === id));
  const advised = advisedIds.length
    ? await db.orm.public.Farm.where((f) => f.id.in(advisedIds)).all()
    : [];

  return [
    ...owned.map((farm) => ({ farm, access: "owner" as Access })),
    ...advised.map((farm) => ({ farm, access: "advisor" as Access })),
  ];
}

export async function accessibleFieldIds(user: AuthUser) {
  const farms = await accessibleFarms(user);
  if (farms.length === 0) return [];
  const fields = await db.orm.public.Field
    .where((f) => f.farmId.in(farms.map((entry) => entry.farm.id)))
    .select("id")
    .all();
  return fields.map((field) => field.id);
}

export async function farmAccess(user: AuthUser, farmId: number) {
  const farm = await db.orm.public.Farm.first({ id: farmId });
  if (!farm) throw new AppError("Farm not found", 404);
  if (user.role === "ADMIN") return { farm, access: "admin" as Access };
  if (farm.ownerId === user.id) return { farm, access: "owner" as Access };
  const link = await db.orm.public.FarmAdvisor.where({ farmId, advisorId: user.id }).first();
  if (link) return { farm, access: "advisor" as Access };
  throw new AppError("Farm not found", 404);
}

export async function fieldAccess(user: AuthUser, fieldId: number, options: { write?: boolean } = {}) {
  const field = await db.orm.public.Field.first({ id: fieldId });
  if (!field) throw new AppError("Field not found", 404);
  const { farm, access } = await farmAccess(user, field.farmId);
  if (options.write && access === "advisor") {
    throw new AppError("Only the farm owner can change this field", 403);
  }
  return { field, farm, access };
}

export async function farmMemberIds(farmId: number) {
  const farm = await db.orm.public.Farm.first({ id: farmId });
  if (!farm) return [];
  const links = await db.orm.public.FarmAdvisor.where({ farmId }).all();
  return [farm.ownerId, ...links.map((link) => link.advisorId)];
}

export function parseId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(`Invalid ${label} ID`, 400);
  return id;
}

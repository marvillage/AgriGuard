import { randomUUID } from "node:crypto";
import sharp from "sharp";
import db from "../config/database.js";
import { deleteUploads, saveUpload } from "../lib/uploads.js";
import { AppError } from "../utils/AppError.js";
import type { AuthUser } from "../utils/auth.types.js";
import {
  createFarm,
  deleteFarm,
  updateFarm,
  type CreateFarmData,
  type UpdateFarmData,
} from "../repositories/farm.repository.js";
import {
  findFieldsByFarm,
} from "../repositories/field.repository.js";
import { accessibleFarms, farmAccess } from "./access.service.js";
import { deleteFieldCascade } from "./field.service.js";
import { geocodeBest } from "./weather.service.js";

const withCoordinates = async <T extends { location?: string; latitude?: number | null; longitude?: number | null }>(
  data: T,
  locationChanged: boolean
) => {
  const hasCoordinates = typeof data.latitude === "number" && typeof data.longitude === "number";
  if (!data.location || hasCoordinates || !locationChanged) return data;
  const place = await geocodeBest(data.location).catch(() => null);
  return place ? { ...data, latitude: place.latitude, longitude: place.longitude } : data;
};

export const create = async (
  ownerId: number,
  data: Omit<CreateFarmData, "ownerId">
) => {
  return createFarm({
    ...(await withCoordinates(data, true)),
    ownerId,
  });
};

export const list = async (user: AuthUser) => {
  const farms = await accessibleFarms(user);
  const result = [];
  for (const { farm, access } of farms) {
    const fields = await findFieldsByFarm(farm.id);
    result.push({
      ...farm,
      access,
      fieldCount: fields.length,
      totalArea: Math.round(fields.reduce((sum, field) => sum + field.area, 0) * 10) / 10,
    });
  }
  return result;
};

export const getById = async (
  farmId: number,
  user: AuthUser
) => {
  const { farm, access } = await farmAccess(user, farmId);
  return { ...farm, access };
};

export const getWithFields = async (
  farmId: number,
  user: AuthUser
) => {
  const farm = await getById(farmId, user);
  const fields = await findFieldsByFarm(farmId);

  return {
    ...farm,
    fields,
  };
};

export const update = async (
  farmId: number,
  user: AuthUser,
  data: UpdateFarmData
) => {
  const farm = await getById(farmId, user);
  if (farm.access === "advisor") {
    throw new AppError("Only the farm owner can edit this farm", 403);
  }

  const locationChanged = data.location !== undefined && data.location !== farm.location;
  return updateFarm(farmId, await withCoordinates(data, locationChanged));
};

export const remove = async (
  farmId: number,
  user: AuthUser
) => {
  const farm = await getById(farmId, user);
  if (farm.access === "advisor") {
    throw new AppError("Only the farm owner can delete this farm", 403);
  }

  const fields = await findFieldsByFarm(farmId);
  for (const field of fields) {
    await deleteFieldCascade(field.id);
  }
  await db.orm.public.Trial.where({ farmId }).deleteAndCount();
  await db.orm.public.FarmAdvisor.where({ farmId }).deleteAndCount();
  if (farm.photoKey) await deleteUploads([farm.photoKey]);

  return deleteFarm(farmId);
};

// A new photo replaces the old one; null removes it.
export const setPhoto = async (farmId: number, user: AuthUser, upload: { buffer: Buffer; mimeType: string } | null) => {
  const farm = await getById(farmId, user);
  if (farm.access === "advisor") {
    throw new AppError("Only the farm owner can change the farm photo", 403);
  }

  let photoKey: string | null = null;
  if (upload) {
    if (!upload.mimeType.startsWith("image/")) throw new AppError("Please upload an image file", 400);
    const jpeg = await sharp(upload.buffer)
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer()
      .catch(() => {
        throw new AppError("This file could not be read as a photo", 400);
      });
    photoKey = `farms/${randomUUID()}.jpg`;
    await saveUpload(photoKey, jpeg, "image/jpeg");
  }

  const updated = await updateFarm(farmId, { photoKey });
  if (farm.photoKey) await deleteUploads([farm.photoKey]);
  return updated;
};

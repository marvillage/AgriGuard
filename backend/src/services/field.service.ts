import db from "../config/database.js";
import { isForeignKeyError, whileDeleting } from "../lib/field-lock.js";
import { getCrop } from "../data/crops.js";
import { acresFromPolygon, polygonCentroid, type LatLng } from "../lib/geo.js";
import { AppError } from "../utils/AppError.js";
import type { AuthUser } from "../utils/auth.types.js";
import {
  createField,
  deleteField,
  findFieldByIdAndFarm,
  findFieldsByFarm,
  updateField,
  type UpdateFieldData,
} from "../repositories/field.repository.js";
import { farmAccess, fieldAccess } from "./access.service.js";

type FieldInput = Omit<UpdateFieldData, "boundary"> & { boundary?: LatLng[] | null };

const verifyFarmAccess = async (
  farmId: number,
  user: AuthUser,
  write = false
) => {
  const { farm, access } = await farmAccess(user, farmId);

  if (write && access === "advisor") {
    throw new AppError("Only the farm owner can change fields", 403);
  }

  return farm;
};

// A drawn boundary sets the field's area and centre automatically.
const applyBoundary = (data: FieldInput): UpdateFieldData => {
  const { boundary, ...rest } = data;
  if (boundary === undefined) return rest;
  if (boundary === null) return { ...rest, boundary: null };
  const [latitude, longitude] = polygonCentroid(boundary);
  return {
    ...rest,
    boundary: JSON.stringify(boundary),
    area: Math.round(acresFromPolygon(boundary) * 100) / 100,
    latitude,
    longitude,
  };
};

export const create = async (
  farmId: number,
  user: AuthUser,
  data: FieldInput & { name: string; area: number }
) => {
  const farm = await verifyFarmAccess(farmId, user, true);
  const values = applyBoundary(data);

  return createField({
    ...values,
    name: data.name,
    area: values.area ?? data.area,
    latitude: values.latitude ?? farm.latitude,
    longitude: values.longitude ?? farm.longitude,
    farmId,
  });
};

export const list = async (
  farmId: number,
  user: AuthUser
) => {
  await verifyFarmAccess(farmId, user);

  return findFieldsByFarm(farmId);
};

export const getById = async (
  farmId: number,
  fieldId: number,
  user: AuthUser
) => {
  await verifyFarmAccess(farmId, user);

  const field = await findFieldByIdAndFarm(
    fieldId,
    farmId
  );

  if (!field) {
    throw new AppError("Field not found", 404);
  }

  return field;
};

export const update = async (
  farmId: number,
  fieldId: number,
  user: AuthUser,
  data: FieldInput
) => {
  await verifyFarmAccess(farmId, user, true);
  await getById(farmId, fieldId, user);

  return updateField(fieldId, applyBoundary(data));
};

export const updateById = async (user: AuthUser, fieldId: number, data: FieldInput) => {
  const { field } = await fieldAccess(user, fieldId, { write: true });
  return updateField(field.id, applyBoundary(data));
};

export const remove = async (
  farmId: number,
  fieldId: number,
  user: AuthUser
) => {
  await verifyFarmAccess(farmId, user, true);
  await getById(farmId, fieldId, user);

  await db.orm.public.Trial.where((t) => t.treatmentFieldId.eq(fieldId)).deleteAndCount();
  await db.orm.public.Trial.where((t) => t.controlFieldId.eq(fieldId)).deleteAndCount();

  return deleteFieldCascade(fieldId);
};

export async function deleteFieldCascade(fieldId: number) {
  return whileDeleting(fieldId, async () => {
    for (let attempt = 1; ; attempt += 1) {
      await deleteFieldChildren(fieldId);
      try {
        return await deleteField(fieldId);
      } catch (error) {
        // A reading that was already in flight can add a child row between the two steps.
        if (attempt >= 3 || !isForeignKeyError(error)) throw error;
      }
    }
  });
}

// The original relations use RESTRICT, so children are removed explicitly, deepest first.
async function deleteFieldChildren(fieldId: number) {
  const assessments = await db.orm.public.AIAssessment.where({ fieldId }).select("id").all();
  const assessmentIds = assessments.map((a) => a.id);

  await db.orm.public.Recommendation.where({ fieldId }).deleteAndCount();
  if (assessmentIds.length) {
    await db.orm.public.Recommendation.where((r) => r.assessmentId.in(assessmentIds)).deleteAndCount();
    await db.orm.public.DiseasePrediction.where((r) => r.assessmentId.in(assessmentIds)).deleteAndCount();
    await db.orm.public.CropImage.where((r) => r.assessmentId.in(assessmentIds)).deleteAndCount();
    await db.orm.public.IrrigationPrediction.where((r) => r.assessmentId.in(assessmentIds)).deleteAndCount();
    await db.orm.public.NutrientPrediction.where((r) => r.assessmentId.in(assessmentIds)).deleteAndCount();
    await db.orm.public.WeatherPrediction.where((r) => r.assessmentId.in(assessmentIds)).deleteAndCount();
    await db.orm.public.ProcessingJob.where((r) => r.assessmentId.in(assessmentIds)).deleteAndCount();
    await db.orm.public.SustainabilityRecord.where((r) => r.assessmentId.in(assessmentIds)).updateAndCount({ assessmentId: null });
  }
  await db.orm.public.AIAssessment.where({ fieldId }).deleteAndCount();
  await db.orm.public.SustainabilityRecord.where({ fieldId }).deleteAndCount();
  await db.orm.public.FieldObservation.where({ fieldId }).deleteAndCount();
  await db.orm.public.Crop.where({ fieldId }).deleteAndCount();
}

export async function listCrops(user: AuthUser, fieldId: number) {
  await fieldAccess(user, fieldId);
  return db.orm.public.Crop.where({ fieldId }).orderBy((c) => c.createdAt.desc()).all();
}

export async function plantCrop(
  user: AuthUser,
  fieldId: number,
  input: { cropType: string; name?: string; variety?: string; season?: string; plantingDate: string }
) {
  await fieldAccess(user, fieldId, { write: true });
  const profile = getCrop(input.cropType);
  if (!profile) throw new AppError(`Unknown crop "${input.cropType}"`, 400);

  await db.orm.public.Crop.where({ fieldId, status: "ACTIVE" }).updateAndCount({
    status: "HARVESTED",
    harvestDate: new Date().toISOString(),
  });

  return db.orm.public.Crop.create({
    fieldId,
    cropType: profile.key,
    name: input.name ?? profile.name,
    variety: input.variety ?? null,
    season: input.season ?? null,
    plantingDate: new Date(input.plantingDate).toISOString(),
    status: "ACTIVE",
  });
}

export async function harvestCrop(
  user: AuthUser,
  fieldId: number,
  cropId: number,
  input: { yieldKg?: number | null; harvestDate?: string; notes?: string }
) {
  await fieldAccess(user, fieldId, { write: true });
  const crop = await db.orm.public.Crop.where({ id: cropId, fieldId }).first();
  if (!crop) throw new AppError("Crop not found", 404);
  return db.orm.public.Crop.where({ id: cropId }).update({
    status: "HARVESTED",
    yieldKg: input.yieldKg ?? null,
    harvestDate: new Date(input.harvestDate ?? Date.now()).toISOString(),
    notes: input.notes ?? crop.notes,
  });
}

export async function addObservation(
  user: AuthUser,
  fieldId: number,
  input: { soilMoisture?: number; temperature?: number; humidity?: number; rainfall?: number; nitrogen?: number; phosphorus?: number; potassium?: number; notes?: string; observedAt?: string }
) {
  await fieldAccess(user, fieldId, { write: true });
  return db.orm.public.FieldObservation.create({
    fieldId,
    source: "MANUAL",
    soilMoisture: input.soilMoisture ?? null,
    temperature: input.temperature ?? null,
    humidity: input.humidity ?? null,
    rainfall: input.rainfall ?? null,
    nitrogen: input.nitrogen ?? null,
    phosphorus: input.phosphorus ?? null,
    potassium: input.potassium ?? null,
    notes: input.notes ?? null,
    observedAt: input.observedAt ? new Date(input.observedAt).toISOString() : new Date().toISOString(),
  });
}

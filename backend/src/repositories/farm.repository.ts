import db from "../config/database.js";

export interface FarmSettings {
  latitude?: number | null;
  longitude?: number | null;
  irrigationMethod?: string;
  baselineDepthMm?: number | null;
  baselineIntervalDays?: number | null;
  electricityRate?: number;
  solarCapacityKw?: number | null;
}

export interface CreateFarmData extends FarmSettings {
  name: string;
  location?: string;
  description?: string;
  ownerId: number;
}

export interface UpdateFarmData extends FarmSettings {
  name?: string;
  location?: string;
  description?: string;
}

export const createFarm = async (data: CreateFarmData) => {
  return db.orm.public.Farm.create({
    name: data.name,
    location: data.location,
    description: data.description,
    ownerId: data.ownerId,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    irrigationMethod: data.irrigationMethod ?? "flood",
    baselineDepthMm: data.baselineDepthMm ?? null,
    baselineIntervalDays: data.baselineIntervalDays ?? null,
    electricityRate: data.electricityRate ?? 7,
    solarCapacityKw: data.solarCapacityKw ?? null,
  });
};

export const findFarmById = async (id: number) => {
  return db.orm.public.Farm
    .where({ id })
    .first();
};

export const findFarmByIdAndOwner = async (
  id: number,
  ownerId: number
) => {
  return db.orm.public.Farm
    .where({
      id,
      ownerId,
    })
    .first();
};

export const findFarmsByOwner = async (
  ownerId: number
) => {
  return db.orm.public.Farm
    .where({ ownerId })
    .all();
};

export const updateFarm = async (
  id: number,
  data: UpdateFarmData
) => {
  return db.orm.public.Farm
    .where({ id })
    .update(data);
};

export const deleteFarm = async (id: number) => {
  return db.orm.public.Farm
    .where({ id })
    .delete();
};

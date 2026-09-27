import db from "../config/database.js";

export interface FieldSettings {
  latitude?: number | null;
  longitude?: number | null;
  boundary?: string | null;
  irrigationMethod?: string | null;
  pumpFlowLpm?: number | null;
  pumpFlowTest?: string | null;
  pumpPowerKw?: number | null;
  refillPoint?: number | null;
  fieldCapacity?: number | null;
  solarPreferred?: boolean;
}

export interface CreateFieldData extends FieldSettings {
  name: string;
  area: number;
  location?: string;
  soilType?: string;
  farmId: number;
}

export interface UpdateFieldData extends FieldSettings {
  name?: string;
  area?: number;
  location?: string;
  soilType?: string;
}

export const createField = async (data: CreateFieldData) => {
  return db.orm.public.Field.create({
    name: data.name,
    area: data.area,
    location: data.location,
    soilType: data.soilType,
    farmId: data.farmId,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    boundary: data.boundary ?? null,
    irrigationMethod: data.irrigationMethod ?? null,
    pumpFlowLpm: data.pumpFlowLpm ?? null,
    pumpPowerKw: data.pumpPowerKw ?? null,
    refillPoint: data.refillPoint ?? null,
    fieldCapacity: data.fieldCapacity ?? null,
    solarPreferred: data.solarPreferred ?? true,
  });
};

export const findFieldById = async (id: number) => {
  return db.orm.public.Field
    .where({ id })
    .first();
};

export const findFieldByIdAndFarm = async (
  id: number,
  farmId: number
) => {
  return db.orm.public.Field
    .where({
      id,
      farmId,
    })
    .first();
};

export const findFieldsByFarm = async (
  farmId: number
) => {
  return db.orm.public.Field
    .where({ farmId })
    .orderBy((f) => f.id.asc())
    .all();
};

export const updateField = async (
  id: number,
  data: UpdateFieldData
) => {
  return db.orm.public.Field
    .where({ id })
    .update(data);
};

export const deleteField = async (id: number) => {
  return db.orm.public.Field
    .where({ id })
    .delete();
};

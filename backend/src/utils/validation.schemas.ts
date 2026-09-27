import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name must not exceed 100 characters"),

  email: z
    .string()
    .trim()
    .email("Please provide a valid email address"),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .max(100, "Password must not exceed 100 characters"),

  role: z.enum(["FARMER", "AGRONOMIST"]).optional(),

  phone: z.string().trim().max(20).optional(),

  language: z.enum(["en", "hi", "mr", "pa", "te", "ta"]).optional(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address"),

  password: z
    .string()
    .min(1, "Password is required"),
});

const irrigationMethod = z.enum(["flood", "sprinkler", "drip"]);
const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);

export const createFarmSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Farm name must be at least 2 characters long")
    .max(100, "Farm name must not exceed 100 characters"),

  location: z
    .string()
    .trim()
    .max(255, "Location must not exceed 255 characters")
    .optional(),

  description: z
    .string()
    .trim()
    .max(1000, "Description must not exceed 1000 characters")
    .optional(),

  latitude: latitude.nullable().optional(),
  longitude: longitude.nullable().optional(),
  irrigationMethod: irrigationMethod.optional(),
  baselineDepthMm: z.number().positive().max(300).nullable().optional(),
  baselineIntervalDays: z.number().positive().max(60).nullable().optional(),
  electricityRate: z.number().min(0).max(50).optional(),
  solarCapacityKw: z.number().min(0).max(1000).nullable().optional(),
});

export const updateFarmSchema = createFarmSchema.partial();

const polygon = z
  .array(z.tuple([latitude, longitude]))
  .min(3, "A boundary needs at least 3 points")
  .max(500);

export const createFieldSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Field name must be at least 2 characters long")
    .max(100, "Field name must not exceed 100 characters"),

  area: z
    .number()
    .positive("Field area must be greater than 0"),

  location: z
    .string()
    .trim()
    .max(255, "Location must not exceed 255 characters")
    .optional(),

  soilType: z
    .string()
    .trim()
    .max(100, "Soil type must not exceed 100 characters")
    .optional(),

  latitude: latitude.nullable().optional(),
  longitude: longitude.nullable().optional(),
  boundary: polygon.nullable().optional(),
  irrigationMethod: irrigationMethod.nullable().optional(),
  pumpFlowLpm: z.number().positive().max(10000).nullable().optional(),
  pumpPowerKw: z.number().positive().max(100).nullable().optional(),
  refillPoint: z.number().min(1).max(60).nullable().optional(),
  fieldCapacity: z.number().min(5).max(70).nullable().optional(),
  solarPreferred: z.boolean().optional(),
});

export const updateFieldSchema =
  createFieldSchema.partial();

export const cropSchema = z.object({
  cropType: z.string().trim().min(2).max(50),
  name: z.string().trim().min(2).max(100).optional(),
  variety: z.string().trim().max(100).optional(),
  season: z.string().trim().max(50).optional(),
  plantingDate: z.string().trim().min(8),
});

export const harvestSchema = z.object({
  yieldKg: z.number().min(0).nullable().optional(),
  harvestDate: z.string().trim().min(8).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const observationSchema = z.object({
  soilMoisture: z.number().min(0).max(100).optional(),
  temperature: z.number().min(-20).max(60).optional(),
  humidity: z.number().min(0).max(100).optional(),
  rainfall: z.number().min(0).max(1000).optional(),
  nitrogen: z.number().min(0).max(5000).optional(),
  phosphorus: z.number().min(0).max(5000).optional(),
  potassium: z.number().min(0).max(5000).optional(),
  notes: z.string().trim().max(1000).optional(),
  observedAt: z.string().trim().optional(),
});

export const telemetrySchema = z.object({
  soilMoisture: z.number().min(0).max(100).optional(),
  soilTemp: z.number().min(-20).max(80).optional(),
  airTemp: z.number().min(-40).max(70).optional(),
  humidity: z.number().min(0).max(100).optional(),
  nitrogen: z.number().min(0).max(5000).optional(),
  phosphorus: z.number().min(0).max(5000).optional(),
  potassium: z.number().min(0).max(5000).optional(),
  flowTotalL: z.number().min(0).optional(),
  flowRateLpm: z.number().min(0).max(100000).optional(),
  energyTotalKwh: z.number().min(0).optional(),
  powerW: z.number().min(0).max(1000000).optional(),
  tankDistanceCm: z.number().min(0).max(10000).optional(),
  tankLevel: z.number().min(0).max(100).optional(),
  solarW: z.number().min(0).max(1000000).optional(),
  solarV: z.number().min(0).max(1000).optional(),
  batteryPct: z.number().min(0).max(100).optional(),
  rssi: z.number().min(-150).max(0).optional(),
  pumpOn: z.boolean().optional(),
  firmware: z.string().max(100).optional(),
  uptimeSec: z.number().min(0).optional(),
  rainfall: z.number().min(0).max(1000).optional(),
});

export const pumpSchema = z.object({
  mode: z.enum(["AUTO", "MANUAL_ON", "MANUAL_OFF"]),
  minutes: z.number().int().min(1).max(180).optional(),
  deviceId: z.number().int().positive().optional(),
});

const scheduleFields = {
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM"),
  durationMinutes: z.number().int().min(5).max(600),
  days: z.string().regex(/^[1-7]{1,7}$/, "Days are ISO weekdays 1-7"),
  mode: z.enum(["SMART", "FIXED"]),
  enabled: z.boolean().optional(),
};

export const scheduleSchema = z.object({
  ...scheduleFields,
  days: scheduleFields.days.default("1234567"),
  mode: scheduleFields.mode.default("SMART"),
});

// Separate from scheduleSchema so a partial update never fills in defaults.
export const scheduleUpdateSchema = z.object(scheduleFields).partial();

export const deviceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  simulated: z.boolean().optional(),
  tankHeightCm: z.number().positive().max(5000).optional(),
  tankCapacityL: z.number().positive().max(10000000).optional(),
  dryRunLevelPct: z.number().min(0).max(90).optional(),
});

export const deviceUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  tankHeightCm: z.number().positive().max(5000).nullable().optional(),
  tankCapacityL: z.number().positive().max(10000000).nullable().optional(),
  dryRunLevelPct: z.number().min(0).max(90).optional(),
  hasFlowMeter: z.boolean().optional(),
  hasEnergyMeter: z.boolean().optional(),
  hasTankSensor: z.boolean().optional(),
  hasSolar: z.boolean().optional(),
});

export const soilTestSchema = z.object({
  cropKey: z.string().trim().optional(),
  source: z.enum(["SOIL_CARD", "SENSOR", "MANUAL"]).optional(),
  soil: z
    .object({
      n: z.number().min(0).max(3000),
      p: z.number().min(0).max(1000),
      k: z.number().min(0).max(3000),
      ph: z.number().min(0).max(14).nullable().optional(),
      organicCarbon: z.number().min(0).max(10).nullable().optional(),
    })
    .optional(),
});

export const trialSchema = z.object({
  name: z.string().trim().min(2).max(100),
  treatmentFieldId: z.number().int().positive(),
  controlFieldId: z.number().int().positive(),
  startDate: z.string().trim().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const trialUpdateSchema = z.object({
  status: z.enum(["ACTIVE", "COMPLETED"]).optional(),
  treatmentYieldKg: z.number().min(0).nullable().optional(),
  controlYieldKg: z.number().min(0).nullable().optional(),
  notes: z.string().trim().max(1000).optional(),
  endDate: z.string().trim().nullable().optional(),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  language: z.enum(["en", "hi", "mr", "pa", "te", "ta"]).optional(),
  smsAlerts: z.boolean().optional(),
  whatsappAlerts: z.boolean().optional(),
  pushAlerts: z.boolean().optional(),
  dailyBriefing: z.boolean().optional(),
});

export const noteSchema = z.object({
  title: z.string().trim().min(3).max(150),
  message: z.string().trim().min(3).max(2000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  type: z.enum(["IRRIGATION", "FERTILIZER", "DISEASE", "WEATHER", "GENERAL"]).optional(),
});

export const chatSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  language: z.enum(["en", "hi", "mr", "pa", "te", "ta"]).optional(),
});
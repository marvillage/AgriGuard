import type { FieldContext } from "../src/services/engine.service.js";
import type { DailyPoint, Forecast, HourlyPoint } from "../src/services/weather.service.js";
import type { CropRow, DeviceRow, FarmRow, FieldRow, ObservationRow, ScheduleRow } from "../src/types/models.js";

// Sunday 1 March 2026, 10:00 in Asia/Kolkata.
export const now = new Date("2026-03-01T04:30:00.000Z");
const stamp = now.toISOString();

export function daysBefore(days: number) {
  return new Date(now.getTime() - days * 86400000).toISOString();
}

export function farmRow(overrides: Partial<FarmRow> = {}): FarmRow {
  return {
    id: 1,
    name: "Test farm",
    location: null,
    description: null,
    latitude: 30.9,
    longitude: 75.85,
    shareCode: null,
    irrigationMethod: "flood",
    baselineDepthMm: null,
    baselineIntervalDays: null,
    electricityRate: 7,
    solarCapacityKw: null,
    ownerId: 1,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

export function fieldRow(overrides: Partial<FieldRow> = {}): FieldRow {
  return {
    id: 1,
    name: "North",
    area: 1,
    location: null,
    soilType: "loam",
    latitude: null,
    longitude: null,
    boundary: null,
    irrigationMethod: null,
    pumpFlowLpm: null,
    pumpFlowTest: null,
    pumpPowerKw: null,
    refillPoint: null,
    fieldCapacity: null,
    solarPreferred: true,
    farmId: 1,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

export function cropRow(overrides: Partial<CropRow> = {}): CropRow {
  return {
    id: 1,
    name: "Wheat",
    variety: null,
    season: null,
    plantingDate: daysBefore(60),
    harvestDate: null,
    cropType: "wheat",
    status: "ACTIVE",
    yieldKg: null,
    notes: null,
    fieldId: 1,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

export function deviceRow(overrides: Partial<DeviceRow> = {}): DeviceRow {
  return {
    id: 1,
    name: "Node",
    deviceKey: "test-key",
    fieldId: 1,
    firmware: null,
    lastSeenAt: stamp,
    batteryPct: null,
    rssi: null,
    pumpMode: "AUTO",
    pumpOn: false,
    manualUntil: null,
    commandPump: null,
    commandUntil: null,
    hasFlowMeter: false,
    hasEnergyMeter: false,
    hasTankSensor: false,
    hasSolar: false,
    tankHeightCm: null,
    tankCapacityL: null,
    dryRunLevelPct: 15,
    lastFlowTotalL: null,
    lastEnergyTotalKwh: null,
    simulated: false,
    kind: "NODE",
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

export function observationRow(overrides: Partial<ObservationRow> = {}): ObservationRow {
  return {
    id: 1,
    soilMoisture: 16,
    temperature: 25,
    humidity: 60,
    rainfall: null,
    nitrogen: null,
    phosphorus: null,
    potassium: null,
    soilTemperature: null,
    flowTotalL: null,
    flowRateLpm: null,
    energyTotalKwh: null,
    powerW: null,
    tankDistanceCm: null,
    tankLevel: null,
    solarW: null,
    batteryPct: null,
    rssi: null,
    pumpOn: false,
    source: "DEVICE",
    notes: null,
    fieldId: 1,
    deviceId: null,
    observedAt: stamp,
    createdAt: stamp,
    ...overrides,
  };
}

export function scheduleRow(overrides: Partial<ScheduleRow> = {}): ScheduleRow {
  return {
    id: 1,
    fieldId: 1,
    startTime: "18:00",
    durationMinutes: 60,
    days: "1234567",
    mode: "SMART",
    enabled: true,
    createdAt: stamp,
    ...overrides,
  };
}

// Hourly points from 24 h before `now` to 48 h after; `hour` is the offset from the current hour.
export function forecast(options: { hourly?: (hour: number) => Partial<HourlyPoint>; daily?: Array<Partial<DailyPoint>> } = {}): Forecast {
  const currentHour = Math.floor(now.getTime() / 3600000) * 3600000;
  const hourly: HourlyPoint[] = [];
  for (let hour = -24; hour <= 48; hour += 1) {
    hourly.push({
      time: new Date(currentHour + hour * 3600000).toISOString(),
      temperature: 25,
      humidity: 60,
      rainMm: 0,
      rainProbability: 0,
      radiation: 0,
      windKmh: 5,
      et0: 0.2,
      ...options.hourly?.(hour),
    });
  }
  const days = options.daily ?? [{}, {}, {}];
  const daily: DailyPoint[] = days.map((day, index) => ({
    date: new Date(Date.UTC(2026, 2, 1 + index)).toISOString().slice(0, 10),
    tempMax: 30,
    tempMin: 15,
    rainMm: 0,
    rainProbability: 0,
    et0: 4,
    radiationMj: 18,
    windMaxKmh: 12,
    sunrise: "",
    sunset: "",
    ...day,
  }));
  return { latitude: 30.9, longitude: 75.85, timezone: "Asia/Kolkata", utcOffsetSeconds: 19800, fetchedAt: stamp, hourly, daily };
}

export function context(overrides: Partial<FieldContext> = {}): FieldContext {
  const latest = overrides.latest === undefined ? observationRow() : overrides.latest;
  return {
    field: fieldRow(),
    farm: farmRow(),
    crop: cropRow(),
    device: null,
    latest,
    latestAgeMinutes: latest ? 5 : null,
    recent: [],
    watered: [],
    schedules: [],
    forecast: forecast(),
    weatherError: null,
    now,
    ...overrides,
  };
}

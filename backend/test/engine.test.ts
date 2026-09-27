import assert from "node:assert/strict";
import { test } from "node:test";
import { assessRisks, decideIrrigation, levelOf, moistureAfterWatering, nutrientStatus } from "../src/services/engine.service.js";
import { context, deviceRow, farmRow, fieldRow, forecast, now, observationRow, scheduleRow } from "./fixtures.js";

// Wheat at day 60 on loam: refill point 17.3%, wilting point 11%, critical at or below 13.205%.
// At 16% moisture the deficit is 108 mm, so rain only covers it at >= 54 mm with a >= 60% chance.

test("no fresh reading means no decision", () => {
  assert.equal(decideIrrigation(context({ latest: null })).action, "NO_DATA");
  assert.equal(decideIrrigation(context({ latestAgeMinutes: 181 })).action, "NO_DATA");
  assert.equal(decideIrrigation(context({ latestAgeMinutes: 180 })).action, "IRRIGATE");
});

test("soil wetter than the refill point is skipped", () => {
  const decision = decideIrrigation(context({ latest: observationRow({ soilMoisture: 18 }) }));
  assert.equal(decision.action, "SKIP_WET");
  assert.deepEqual(decision.params, { moisture: 18 });
});

test("dry soil with no rain is irrigated with the planned volume", () => {
  const decision = decideIrrigation(context());
  assert.equal(decision.action, "IRRIGATE");
  assert.equal(decision.critical, false);
  assert.deepEqual(decision.params, { litres: 367896, minutes: 920, duration: "15.3 h" });
});

test("likely rain that covers the deficit skips irrigation", () => {
  const rain = forecast({ hourly: (hour) => (hour >= 0 && hour < 20 ? { rainMm: 3, rainProbability: 80 } : {}) });
  const decision = decideIrrigation(context({ forecast: rain }));
  assert.equal(decision.action, "SKIP_RAIN");
  assert.deepEqual(decision.params, { rain: 60, probability: 80, litres: 367896 });
});

test("rain below the deficit share or below 60% chance does not skip", () => {
  const light = forecast({ hourly: (hour) => (hour >= 0 && hour < 20 ? { rainMm: 2, rainProbability: 90 } : {}) });
  assert.equal(decideIrrigation(context({ forecast: light })).action, "IRRIGATE");
  const unlikely = forecast({ hourly: (hour) => (hour >= 0 && hour < 20 ? { rainMm: 3, rainProbability: 50 } : {}) });
  assert.equal(decideIrrigation(context({ forecast: unlikely })).action, "IRRIGATE");
});

test("a critically dry crop is irrigated even when rain is forecast", () => {
  const rain = forecast({ hourly: (hour) => (hour >= 0 && hour < 20 ? { rainMm: 5, rainProbability: 95 } : {}) });
  const decision = decideIrrigation(context({ forecast: rain, latest: observationRow({ soilMoisture: 13 }) }));
  assert.equal(decision.action, "IRRIGATE");
  assert.equal(decision.critical, true);
  assert.equal(decision.water.needMm, 144);
});

test("a tank below its dry-run level blocks the pump", () => {
  const decision = decideIrrigation(
    context({
      device: deviceRow({ hasTankSensor: true, dryRunLevelPct: 15 }),
      latest: observationRow({ soilMoisture: 13, tankLevel: 10 }),
    })
  );
  assert.equal(decision.action, "BLOCKED_TANK");
  assert.deepEqual(decision.params, { level: 10, limit: 15 });
});

// 5 kW of panels x 900 W/m2 x 0.8 = 3.6 kW, enough for a 3 kW pump from 2 hours from now.
test("with solar, watering waits for the sunny window when it starts within 6 hours", () => {
  const sunny = forecast({ hourly: (hour) => (hour >= 2 && hour <= 6 ? { radiation: 900 } : {}) });
  const decision = decideIrrigation(
    context({ forecast: sunny, farm: farmRow({ solarCapacityKw: 5 }), field: fieldRow({ pumpPowerKw: 3 }) })
  );
  assert.equal(decision.action, "WAIT_SOLAR");
  assert.equal(decision.params.kwh, 46);
  assert.ok(decision.solar?.start);
  assert.equal(decision.solar?.activeNow, false);
});

test("solar is ignored when the field opts out", () => {
  const sunny = forecast({ hourly: (hour) => (hour >= 2 && hour <= 6 ? { radiation: 900 } : {}) });
  const decision = decideIrrigation(
    context({ forecast: sunny, farm: farmRow({ solarCapacityKw: 5 }), field: fieldRow({ pumpPowerKw: 3, solarPreferred: false }) })
  );
  assert.equal(decision.action, "IRRIGATE");
});

test("smart schedules restrict watering to their window", () => {
  assert.equal(decideIrrigation(context({ schedules: [scheduleRow({ startTime: "18:00" })] })).action, "OUTSIDE_WINDOW");
  assert.equal(decideIrrigation(context({ schedules: [scheduleRow({ startTime: "09:30" })] })).action, "IRRIGATE");
  assert.equal(decideIrrigation(context({ schedules: [scheduleRow({ startTime: "09:30", days: "123456" })] })).action, "OUTSIDE_WINDOW");
});

test("risk levels and Soil Health Card nutrient ratings", () => {
  assert.equal(levelOf(null), null);
  assert.equal(levelOf(34), "Low");
  assert.equal(levelOf(35), "Moderate");
  assert.equal(levelOf(65), "High");
  assert.equal(nutrientStatus("N", 124), "Low");
  assert.equal(nutrientStatus("N", 250), "Medium");
  assert.equal(nutrientStatus("K", 126), "High");
  assert.equal(nutrientStatus("P", null), null);
});

// Disease: 10 humid hours x 6 x 1 (25 °C) + 5 forecast humid hours x 2 = 70.
// Weather: 39 °C (+50), 55 mm day (+45), 45 km/h wind (+20), capped at 100.
// Crop health: 100 - (0.35 x 64 + 0.3 x 70 + 0.2 x 20 + 0.15 x 100) = 37.6 -> 38; with NDVI 0.8, 0.7 x 38 + 0.3 x 100 = 56.6 -> 57.
test("risk scores follow the documented formula", () => {
  const stormy = forecast({
    hourly: (hour) => ({ humidity: (hour >= -10 && hour <= -1) || (hour >= 1 && hour <= 5) ? 95 : 60 }),
    daily: [{ tempMax: 39 }, { windMaxKmh: 45 }, { rainMm: 55 }],
  });
  const ctx = context({ forecast: stormy });
  const decision = decideIrrigation(ctx);
  const risks = assessRisks(ctx, decision, { recentDisease: null, ndvi: null });
  assert.equal(risks.humidHours, 10);
  assert.equal(risks.diseaseRisk, 70);
  assert.equal(risks.weatherRisk, 100);
  assert.equal(risks.waterStress, 64);
  assert.equal(risks.nutrientStress, null);
  assert.equal(risks.cropHealth, 38);
  assert.deepEqual(risks.levels, { water: "Moderate", disease: "High", weather: "High", nutrient: null });

  const withNdvi = assessRisks(ctx, decision, { recentDisease: null, ndvi: 0.8 });
  assert.equal(withNdvi.cropHealth, 57);

  const withScan = assessRisks(ctx, decision, { recentDisease: { name: "Leaf rust", confidence: 0.5 }, ndvi: null });
  assert.equal(withScan.diseaseRisk, 88);
});

test("water stress stays low while the soil is above the refill point", () => {
  const ctx = context({ latest: observationRow({ soilMoisture: 20 }) });
  const risks = assessRisks(ctx, decideIrrigation(ctx), { recentDisease: null, ndvi: null });
  assert.ok(risks.waterStress !== null && risks.waterStress <= 34);
});

// 367,896 L on 1 acre (4,046.86 m²) is 90.9 mm gross, 50 mm net at 55% flood efficiency: +5% moisture in a 1 m root zone.
// ETc of 4 mm/day takes 0.4% a day back out of that root zone.
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3600000).toISOString();
const watering = (moistureBefore: number | null) => ({ litres: 367896, startedAt: hoursAgo(13), endedAt: hoursAgo(12), moistureBefore });
const balance = { field: fieldRow(), farm: farmRow(), rootDepthM: 1, fieldCapacity: 25, etcMm: 4, now };

test("a logged watering is added to a reading that cannot see it, minus the crop use since", () => {
  assert.equal(moistureAfterWatering(16, [watering(16)], balance), 20.8);
  assert.equal(moistureAfterWatering(16, [watering(22)], balance), 24.8);
  assert.equal(moistureAfterWatering(24, [watering(16)], balance), 24);
  assert.equal(moistureAfterWatering(16, [], balance), 16);
  assert.equal(moistureAfterWatering(16, [watering(16)], { ...balance, etcMm: null }), 16);
});

test("after a logged watering the weather-model field is not irrigated again", () => {
  const decision = decideIrrigation(context({ latest: observationRow({ soilMoisture: 16, source: "OPEN_METEO" }), watered: [watering(16)] }));
  assert.equal(decision.action, "SKIP_WET");
  assert.equal(decision.watering?.reading, 16);
  assert.equal(decision.watering?.litres, 367896);
  assert.ok(decision.moisture !== null && decision.moisture > 17.3);
  assert.equal(decideIrrigation(context({ latest: observationRow({ soilMoisture: 16, source: "OPEN_METEO" }) })).action, "IRRIGATE");
});

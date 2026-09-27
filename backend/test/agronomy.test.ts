import assert from "node:assert/strict";
import { test } from "node:test";
import { getCrop } from "../src/data/crops.js";
import { getSoil } from "../src/data/soils.js";
import { cropEtMm, cropStage, formatDuration, irrigationPlan, waterStatus } from "../src/services/agronomy.service.js";
import { cropRow, daysBefore, farmRow, fieldRow, now } from "./fixtures.js";

const wheat = getCrop("wheat");

// Wheat profile (FAO-56 Table 11/12): stages 15/25/50/30 days, Kc 0.3/1.15/0.3, roots 0.15-1.2 m, p 0.55.
test("crop stage follows the FAO-56 Kc curve", () => {
  const stage = (days: number) => cropStage(cropRow({ plantingDate: daysBefore(days) }), wheat, now);

  const initial = stage(10);
  assert.equal(initial.stage, "initial");
  assert.equal(initial.kc, 0.3);
  assert.equal(initial.rootDepthM, 0.41);

  const development = stage(25);
  assert.equal(development.stage, "development");
  assert.equal(development.kc, 0.64);
  assert.equal(development.rootDepthM, 0.81);

  const mid = stage(60);
  assert.equal(mid.stage, "mid");
  assert.equal(mid.kc, 1.15);
  assert.equal(mid.rootDepthM, 1.2);

  const late = stage(100);
  assert.equal(late.stage, "late");
  assert.equal(late.kc, 0.87);
  assert.equal(late.seasonDays, 120);
});

test("crop stage without a planting date uses mid-season Kc and full roots", () => {
  const stage = cropStage(cropRow({ plantingDate: null }), wheat, now);
  assert.equal(stage.stage, null);
  assert.equal(stage.kc, 1.15);
  assert.equal(stage.rootDepthM, 1.2);
});

// Loam: field capacity 25%, wilting point 11%. TAW = 1000 x 0.14 x 1.2 m = 168 mm; RAW = 0.55 x 168 = 92.4 mm.
test("water status computes TAW, RAW, refill point and depletion", () => {
  const stage = cropStage(cropRow(), wheat, now);
  const water = waterStatus(fieldRow(), stage, 16);
  assert.equal(water.fieldCapacity, 25);
  assert.equal(water.wiltingPoint, 11);
  assert.equal(water.tawMm, 168);
  assert.equal(water.rawMm, 92.4);
  assert.equal(water.refillPoint, 17.3);
  assert.equal(water.depletionMm, 108);
  assert.equal(water.stressPct, 64);
  assert.equal(water.needMm, 108);
});

test("water status respects field overrides and has no deficit without a reading", () => {
  const stage = cropStage(cropRow(), wheat, now);
  const water = waterStatus(fieldRow({ refillPoint: 20, fieldCapacity: 28 }), stage, null);
  assert.equal(water.refillPoint, 20);
  assert.equal(water.fieldCapacity, 28);
  assert.equal(water.depletionMm, null);
  assert.equal(water.needMm, null);
});

test("wet soil above field capacity is not a deficit", () => {
  const stage = cropStage(cropRow(), wheat, now);
  const water = waterStatus(fieldRow(), stage, 30);
  assert.equal(water.depletionMm, 0);
  assert.equal(water.stressPct, 0);
});

// Flood: 55% efficient, at most 50 mm net per event. 50 / 0.55 = 90.9 mm gross x 4046.86 m2 = 367,896 L.
test("irrigation plan caps the net depth per event and grosses it up by efficiency", () => {
  const plan = irrigationPlan(fieldRow(), farmRow(), 108);
  assert.equal(plan.method, "flood");
  assert.equal(plan.efficiency, 0.55);
  assert.equal(plan.netMm, 50);
  assert.equal(plan.deficitMm, 108);
  assert.equal(plan.grossMm, 90.9);
  assert.equal(plan.litres, 367896);
  assert.equal(plan.flowLpm, 400);
  assert.equal(plan.runMinutes, 920);
  assert.equal(plan.duration, "15.3 h");
});

test("drip applies at most 12 mm net at 90% efficiency with the field's own pump flow", () => {
  const plan = irrigationPlan(fieldRow({ irrigationMethod: "drip", pumpFlowLpm: 180, area: 2 }), farmRow(), 30);
  assert.equal(plan.method, "drip");
  assert.equal(plan.netMm, 12);
  assert.equal(plan.grossMm, 13.3);
  assert.equal(plan.litres, Math.round((12 / 0.9) * 2 * 4046.86));
  assert.equal(plan.runMinutes, Math.round(plan.litres / 180));
});

test("unknown irrigation methods fall back to flood", () => {
  assert.equal(irrigationPlan(fieldRow({ irrigationMethod: "bucket" }), farmRow({ irrigationMethod: "bucket" }), 10).method, "flood");
});

test("soil types resolve by exact name before partial matches", () => {
  assert.equal(getSoil("Red (sandy loam)").key, "red");
  assert.equal(getSoil("Black (regur)").key, "black");
  assert.equal(getSoil("alluvial").key, "alluvial");
  assert.equal(getSoil("black cotton soil").key, "black");
  assert.equal(getSoil("Sandy").key, "sandy");
  assert.equal(getSoil(null).key, "loam");
  assert.equal(getSoil("something else").key, "loam");
});

test("crop water use is Kc x ET0", () => {
  assert.equal(cropEtMm(5.2, 1.15), 5.98);
  assert.equal(cropEtMm(0, 1.15), 0);
});

test("durations read as minutes, hours or days", () => {
  assert.equal(formatDuration(null), "-");
  assert.equal(formatDuration(45), "45 min");
  assert.equal(formatDuration(150), "2.5 h");
  assert.equal(formatDuration(60 * 72), "3 days");
});

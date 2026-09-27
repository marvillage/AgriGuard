import assert from "node:assert/strict";
import { test } from "node:test";
import { calculatePlan, rate } from "../src/services/fertilizer.service.js";

// Soil Health Card ratings (kg/ha), Methods Manual: Soil Testing in India (DAC 2011), Table 1.
test("soil ratings use the SHC thresholds", () => {
  assert.equal(rate("n", 279), "Low");
  assert.equal(rate("n", 280), "Medium");
  assert.equal(rate("n", 560), "Medium");
  assert.equal(rate("n", 561), "High");
  assert.equal(rate("p", 9.9), "Low");
  assert.equal(rate("p", 24.6), "Medium");
  assert.equal(rate("p", 24.7), "High");
  assert.equal(rate("k", 107), "Low");
  assert.equal(rate("k", 280), "Medium");
  assert.equal(rate("k", 281), "High");
});

// Wheat blanket dose 120:60:40 kg/ha. Low N gets +25% (150), medium P stays 60, high K gets -25% (30).
// DAP = 60 / 0.46 = 130.4 kg/ha (18% N), urea = (150 - 23.5) / 0.46 = 275.1 kg/ha, MOP = 30 / 0.6 = 50 kg/ha; one acre = 0.404686 ha.
test("fertilizer plan adjusts the blanket dose by soil rating", () => {
  const plan = calculatePlan("wheat", 1, { n: 200, p: 15, k: 300 }, "2026-11-01T00:00:00.000Z");
  assert.deepEqual(plan.status, { n: "Low", p: "Medium", k: "High" });
  assert.deepEqual(plan.required, { n: 150, p: 60, k: 30 });
  assert.deepEqual(plan.plan, { urea: 111.3, dap: 52.8, mop: 20.2 });
  assert.deepEqual(plan.blanket, { urea: 84.9, dap: 52.8, mop: 27 });
  assert.equal(plan.ureaSavedKg, -26.4);
  assert.equal(plan.cost, 2776);
  assert.equal(plan.blanketCost, 2852);
  assert.equal(plan.savingRupees, 76);
});

test("nitrogen is split 50/25/25 at sowing and the two top dressings", () => {
  const plan = calculatePlan("wheat", 1, { n: 200, p: 15, k: 300 }, "2026-11-01T00:00:00.000Z");
  assert.deepEqual(
    plan.schedule.map((split) => [split.date, split.urea, split.dap, split.mop]),
    [
      ["2026-11-01", 55.7, 52.8, 20.2],
      ["2026-11-16", 27.8, 0, 0],
      ["2026-12-11", 27.8, 0, 0],
    ]
  );
});

test("soil notes follow the manual's organic carbon and pH limits", () => {
  const acidic = calculatePlan("wheat", 1, { n: 300, p: 15, k: 150, ph: 5.2, organicCarbon: 0.4 });
  assert.ok(acidic.notes.some((note) => note.includes("farmyard manure")));
  assert.ok(acidic.notes.some((note) => note.includes("lime")));
  const alkaline = calculatePlan("wheat", 1, { n: 300, p: 15, k: 150, ph: 8.8, organicCarbon: 0.7 });
  assert.ok(alkaline.notes.some((note) => note.includes("gypsum")));
  assert.ok(!alkaline.notes.some((note) => note.includes("farmyard manure")));
});

test("unknown crops are rejected", () => {
  assert.throws(() => calculatePlan("dragonfruit", 1, { n: 300, p: 15, k: 150 }), /Unknown crop/);
});

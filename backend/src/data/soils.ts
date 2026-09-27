// Volumetric water content (%) at field capacity and wilting point (FAO-56 Table 19 ranges).
// Red and laterite read as sandy loam, alluvial as loam, black as clay; FC - WP also stays inside the Table 19 range.
export interface SoilProfile {
  key: string;
  name: string;
  fieldCapacity: number;
  wiltingPoint: number;
}

export const soils: SoilProfile[] = [
  { key: "sandy", name: "Sandy", fieldCapacity: 12, wiltingPoint: 5 },
  { key: "red", name: "Red (sandy loam)", fieldCapacity: 19, wiltingPoint: 8 },
  { key: "laterite", name: "Laterite", fieldCapacity: 23, wiltingPoint: 12 },
  { key: "loam", name: "Loam", fieldCapacity: 25, wiltingPoint: 11 },
  { key: "alluvial", name: "Alluvial", fieldCapacity: 28, wiltingPoint: 12 },
  { key: "clay", name: "Clay", fieldCapacity: 38, wiltingPoint: 22 },
  { key: "black", name: "Black (regur)", fieldCapacity: 40, wiltingPoint: 22 },
];

export function getSoil(value: string | null | undefined) {
  const normalized = (value ?? "").toLowerCase();
  return soils.find((soil) => normalized.includes(soil.key)) ?? soils.find((soil) => soil.key === "loam")!;
}

// Application efficiency when AgriGuard stops irrigation at field capacity (less deep percolation and runoff).
// Flood: CWC water-use-efficiency studies of 35 projects, weighted on-farm application efficiency 55% (Jal Shakti, Lok Sabha, 7 Dec 2023).
// Sprinkler 75%, drip 90%: FAO Irrigation Water Management Training Manual 4 (1989), Annex I Table 8.
export const irrigationEfficiency: Record<string, number> = {
  flood: 0.55,
  sprinkler: 0.75,
  drip: 0.9,
};

// Typical conventional practice used as the savings baseline when a farm has not entered its own.
// Not yet verified against a published source.
export const baselinePractice: Record<string, { depthMm: number; intervalDays: number }> = {
  flood: { depthMm: 70, intervalDays: 7 },
  sprinkler: { depthMm: 35, intervalDays: 4 },
  drip: { depthMm: 8, intervalDays: 1 },
};

// Pumping energy when no energy meter is fitted: 30 m head at 30% wire-to-water efficiency.
// Existing farm pump sets run at 25-30% (BEE AgDSM); the 30 m head is an assumption, not a BEE or EESL figure.
export const defaultKwhPerKilolitre = (1000 * 9.81 * 30) / (0.3 * 3.6e6);
// CEA CO2 Baseline Database v22.0 (Aug 2026): FY 2025-26 weighted average 0.675 tCO2/MWh.
export const gridKgCo2PerKwh = 0.675;

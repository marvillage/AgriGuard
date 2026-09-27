// Typical FAO-56 values (Tables 11, 12, 22) adapted to Indian seasons.
// stages: days in initial, development, mid-season, late-season.
// dose: recommended N:P2O5:K2O in kg/ha for an average soil (ICAR package of practices, typical values).
// FAO-56 (fao.org/3/x0490e): Table 11 stage lengths (row named per crop), Table 12 single Kc, Table 22 max root depth and p; Annex 8: Zr min 0.15-0.20 m.
// Yield: all-India average. Field crops: DES (DA&FW) final estimates 2024-25. Horticulture: Agricultural Statistics at a Glance 2024-25, Tables 2.47-2.51 (2023-24).
// Dose checked only for soybean, groundnut and mustard N (DOD Status Paper on Oilseeds, 2021); others not yet verified.
export interface CropProfile {
  key: string;
  name: string;
  stages: [number, number, number, number];
  kc: { ini: number; mid: number; end: number };
  rootDepthM: { min: number; max: number };
  depletionFraction: number;
  dose: { n: number; p: number; k: number };
  typicalYieldKgPerHa: number;
}

export const crops: CropProfile[] = [
  // Table 11 Barley/Oats/Wheat, Central India (Nov); Table 12 Spring Wheat.
  { key: "wheat", name: "Wheat", stages: [15, 25, 50, 30], kc: { ini: 0.3, mid: 1.15, end: 0.3 }, rootDepthM: { min: 0.15, max: 1.2 }, depletionFraction: 0.55, dose: { n: 120, p: 60, k: 40 }, typicalYieldKgPerHa: 3595 },
  // Table 11 Rice, Tropics. Yield as paddy: DES milled rice 2929 kg/ha x 1.5 (paddy/rice ratio in ASG 2024-25 Table 6.2).
  { key: "paddy", name: "Paddy (rice)", stages: [30, 30, 60, 30], kc: { ini: 1.05, mid: 1.2, end: 0.9 }, rootDepthM: { min: 0.15, max: 0.5 }, depletionFraction: 0.2, dose: { n: 100, p: 50, k: 50 }, typicalYieldKgPerHa: 4394 },
  // Table 11 Maize (grain), India (dry, cool).
  { key: "maize", name: "Maize", stages: [20, 35, 40, 30], kc: { ini: 0.3, mid: 1.2, end: 0.35 }, rootDepthM: { min: 0.15, max: 1.2 }, depletionFraction: 0.55, dose: { n: 120, p: 60, k: 40 }, typicalYieldKgPerHa: 3590 },
  // Table 11 Cotton, Egypt/Pakistan (Mar-May). Yield is lint (DES, bales of 170 kg).
  { key: "cotton", name: "Cotton", stages: [30, 50, 60, 55], kc: { ini: 0.35, mid: 1.15, end: 0.6 }, rootDepthM: { min: 0.15, max: 1.3 }, depletionFraction: 0.65, dose: { n: 100, p: 50, k: 50 }, typicalYieldKgPerHa: 440 },
  // Table 11 Sugarcane (virgin), Low Latitudes.
  { key: "sugarcane", name: "Sugarcane", stages: [35, 60, 190, 120], kc: { ini: 0.4, mid: 1.25, end: 0.75 }, rootDepthM: { min: 0.3, max: 1.5 }, depletionFraction: 0.65, dose: { n: 250, p: 100, k: 120 }, typicalYieldKgPerHa: 83416 },
  // Table 11 Tomato, Arid Region (Jan).
  { key: "tomato", name: "Tomato", stages: [30, 40, 40, 25], kc: { ini: 0.6, mid: 1.15, end: 0.8 }, rootDepthM: { min: 0.15, max: 1.0 }, depletionFraction: 0.4, dose: { n: 120, p: 60, k: 60 }, typicalYieldKgPerHa: 25000 },
  // Table 11 Potato, (Semi) Arid, Nov planting.
  { key: "potato", name: "Potato", stages: [25, 30, 45, 30], kc: { ini: 0.5, mid: 1.15, end: 0.75 }, rootDepthM: { min: 0.15, max: 0.5 }, depletionFraction: 0.35, dose: { n: 150, p: 80, k: 100 }, typicalYieldKgPerHa: 24568 },
  // Table 11 Onion (dry), Mediterranean.
  { key: "onion", name: "Onion", stages: [15, 25, 70, 40], kc: { ini: 0.7, mid: 1.05, end: 0.75 }, rootDepthM: { min: 0.15, max: 0.4 }, depletionFraction: 0.3, dose: { n: 100, p: 50, k: 50 }, typicalYieldKgPerHa: 15751 },
  // FAO-56 lists only Sweet Peppers (bell); Table 11 Europe/Mediterranean row. Yield is green chilli.
  { key: "chilli", name: "Chilli / pepper", stages: [30, 35, 40, 20], kc: { ini: 0.6, mid: 1.05, end: 0.9 }, rootDepthM: { min: 0.15, max: 0.7 }, depletionFraction: 0.3, dose: { n: 100, p: 50, k: 50 }, typicalYieldKgPerHa: 10640 },
  // Table 11 Soybeans, Tropics. Dose: DOD gives 20:40:40:30 and 20:60-80:20:20 NPKS; N is 20 in both.
  { key: "soybean", name: "Soybean", stages: [15, 15, 40, 15], kc: { ini: 0.4, mid: 1.15, end: 0.5 }, rootDepthM: { min: 0.15, max: 1.0 }, depletionFraction: 0.5, dose: { n: 20, p: 60, k: 40 }, typicalYieldKgPerHa: 1179 },
  // Table 11 Groundnut, West Africa dry season. Dose inside DOD state-wise range (Status Paper Table 23).
  { key: "groundnut", name: "Groundnut", stages: [25, 35, 45, 25], kc: { ini: 0.4, mid: 1.15, end: 0.6 }, rootDepthM: { min: 0.15, max: 0.8 }, depletionFraction: 0.5, dose: { n: 20, p: 40, k: 40 }, typicalYieldKgPerHa: 2073 },
  // No Table 11 row: stages are the Safflower (High Latitudes) row; Kc, root, p: Rapeseed, Canola. DOD: 40-80 kg N irrigated.
  { key: "mustard", name: "Mustard", stages: [25, 35, 55, 30], kc: { ini: 0.35, mid: 1.1, end: 0.35 }, rootDepthM: { min: 0.15, max: 1.2 }, depletionFraction: 0.6, dose: { n: 80, p: 40, k: 40 }, typicalYieldKgPerHa: 1463 },
  // No Table 11 row: stages are the Peas (Mediterranean) row; Kc, root, p: Chick pea.
  { key: "chickpea", name: "Chickpea", stages: [20, 30, 35, 15], kc: { ini: 0.4, mid: 1.0, end: 0.35 }, rootDepthM: { min: 0.15, max: 0.8 }, depletionFraction: 0.5, dose: { n: 20, p: 40, k: 20 }, typicalYieldKgPerHa: 1218 },
  // Table 11 Grapes, Low Latitudes; Kc and p for table or raisin grapes.
  { key: "grapes", name: "Grapes", stages: [20, 40, 120, 60], kc: { ini: 0.3, mid: 0.85, end: 0.45 }, rootDepthM: { min: 1.0, max: 1.5 }, depletionFraction: 0.35, dose: { n: 200, p: 100, k: 200 }, typicalYieldKgPerHa: 21689 },
];

export function getCrop(key: string | null | undefined) {
  if (!key) return undefined;
  const normalized = key.trim().toLowerCase();
  return (
    crops.find((crop) => crop.key === normalized) ??
    crops.find((crop) => crop.name.toLowerCase().includes(normalized) || normalized.includes(crop.key))
  );
}

export function seasonLength(crop: CropProfile) {
  return crop.stages.reduce((sum, days) => sum + days, 0);
}

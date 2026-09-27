// Impact model used by the calculator, dashboard and sustainability pages.
// Every constant is an explicit, displayed assumption — change them here and the UI follows.
// waterMm is each crop's net seasonal water need (FAO-56 / TNAU); paddy uses its ETc, not its much larger
// applied total, so dividing by the method efficiency below doesn't double-count puddling and percolation.
// ureaKgPerAcre: PAU Package of Practices (Rabi 2025-26 / Kharif 2026) and ICAR-AICRP(S) bulletin.
export const crops = [
  { id: "wheat", label: "Wheat", waterMm: 450, ureaKgPerAcre: 100 },
  { id: "paddy", label: "Paddy (rice)", waterMm: 650, ureaKgPerAcre: 110 },
  { id: "sugarcane", label: "Sugarcane", waterMm: 1800, ureaKgPerAcre: 150 },
  { id: "cotton", label: "Cotton", waterMm: 700, ureaKgPerAcre: 120 },
  { id: "vegetables", label: "Tomato / vegetables", waterMm: 600, ureaKgPerAcre: 130 },
] as const;

// efficiency: ICAR-NIAP, Indian J. Agric. Sci. 92(9), Sep 2022 (share of applied water used by the crop).
// savingRate: flood/paddy is a measured result (Kukal, Hira & Sidhu, PAU, Irrigation Science 23, 2005:
// tensiometer scheduling saved 30-35% vs a fixed interval); sprinkler and drip are illustrative estimates —
// no equivalent published figure was found for them.
export const irrigationMethods = [
  { id: "flood", label: "Flood / furrow", efficiency: 0.4, savingRate: 0.3 },
  { id: "sprinkler", label: "Sprinkler", efficiency: 0.7, savingRate: 0.2 },
  { id: "drip", label: "Drip", efficiency: 0.9, savingRate: 0.12 },
] as const;

export type CropId = (typeof crops)[number]["id"];
export type IrrigationId = (typeof irrigationMethods)[number]["id"];

export const assumptions = {
  squareMetresPerAcre: 4046.86, // international acre, NIST
  pumpHeadMetres: 30, // consistent with CGWB borewell depths in NW India plus delivery head
  pumpEfficiency: 0.3, // BEE AgDSM: existing Indian farm pump sets run 25-30% wire-to-water
  gridKgCo2PerKwh: 0.675, // CEA CO2 Baseline Database v22.0, FY 2025-26 weighted average
  rupeesPerKwh: 7,
  fertilizerSavingRate: 0.1, // illustrative estimate: no published SHC fertilizer-reduction study found
  rupeesPerKgUrea: 5.9,
};

export const kwhPerKilolitre =
  (1000 * 9.81 * assumptions.pumpHeadMetres) /
  (assumptions.pumpEfficiency * 3.6e6);

export function impactFromLitres(litresSaved: number, ureaKgSaved = 0) {
  const kwhSaved = (litresSaved / 1000) * kwhPerKilolitre;
  const co2Kg = kwhSaved * assumptions.gridKgCo2PerKwh;
  const rupees =
    kwhSaved * assumptions.rupeesPerKwh +
    ureaKgSaved * assumptions.rupeesPerKgUrea;

  return { litresSaved, kwhSaved, co2Kg, ureaKgSaved, rupees };
}

export function estimateSeasonImpact(
  acres: number,
  cropId: CropId,
  irrigationId: IrrigationId
) {
  const crop = crops.find((item) => item.id === cropId) ?? crops[0];
  const method =
    irrigationMethods.find((item) => item.id === irrigationId) ??
    irrigationMethods[0];

  const appliedMetres = crop.waterMm / 1000 / method.efficiency;
  const baselineLitres =
    acres * assumptions.squareMetresPerAcre * appliedMetres * 1000;
  const litresSaved = baselineLitres * method.savingRate;
  const ureaKgSaved =
    acres * crop.ureaKgPerAcre * assumptions.fertilizerSavingRate;

  return {
    baselineLitres,
    savingRate: method.savingRate,
    ...impactFromLitres(litresSaved, ureaKgSaved),
  };
}

const indian = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const indianOne = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

export function formatIndian(value: number, digits: 0 | 1 = 0) {
  return (digits === 1 ? indianOne : indian).format(value);
}

export function formatLitres(litres: number) {
  if (litres >= 1e7) return `${indianOne.format(litres / 1e7)} crore L`;
  if (litres >= 1e5) return `${indianOne.format(litres / 1e5)} lakh L`;
  return `${indian.format(litres)} L`;
}

export function formatRupees(rupees: number) {
  if (rupees >= 1e5) return `₹${indianOne.format(rupees / 1e5)} lakh`;
  return `₹${indian.format(rupees)}`;
}

export function formatCo2(kg: number) {
  if (kg >= 1000) return `${indianOne.format(kg / 1000)} t`;
  return `${indianOne.format(kg)} kg`;
}

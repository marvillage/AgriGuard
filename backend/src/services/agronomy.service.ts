import { getCrop, seasonLength, type CropProfile } from "../data/crops.js";
import { getSoil, irrigationEfficiency } from "../data/soils.js";
import { parseTimestamp } from "../lib/time.js";
import { squareMetresPerAcre } from "../lib/geo.js";
import type { CropRow, FarmRow, FieldRow } from "../types/models.js";

export const stageNames = ["initial", "development", "mid", "late"] as const;

export function cropStage(crop: CropRow | null, profile: CropProfile | undefined, now = new Date()) {
  const planted = parseTimestamp(crop?.plantingDate ?? null);
  if (!profile || !planted) {
    return {
      profile,
      stage: null,
      stageIndex: -1,
      dayOfSeason: null,
      seasonDays: profile ? seasonLength(profile) : null,
      kc: profile ? profile.kc.mid : 1,
      rootDepthM: profile ? profile.rootDepthM.max : 0.6,
      progress: null,
      expectedHarvest: null,
    };
  }

  const day = Math.max(0, Math.floor((now.getTime() - planted.getTime()) / 86400000));
  const [ini, dev, mid, late] = profile.stages;
  const total = ini + dev + mid + late;
  let kc: number;
  let stageIndex: number;

  if (day < ini) {
    stageIndex = 0;
    kc = profile.kc.ini;
  } else if (day < ini + dev) {
    stageIndex = 1;
    kc = profile.kc.ini + ((day - ini) / dev) * (profile.kc.mid - profile.kc.ini);
  } else if (day < ini + dev + mid) {
    stageIndex = 2;
    kc = profile.kc.mid;
  } else {
    stageIndex = 3;
    const into = Math.min(day - ini - dev - mid, late);
    kc = profile.kc.mid + (into / late) * (profile.kc.end - profile.kc.mid);
  }

  const rootShare = Math.min(1, day / (ini + dev));
  const rootDepthM = profile.rootDepthM.min + rootShare * (profile.rootDepthM.max - profile.rootDepthM.min);

  return {
    profile,
    stage: stageNames[stageIndex],
    stageIndex,
    dayOfSeason: day,
    seasonDays: total,
    kc: round(kc, 2),
    rootDepthM: round(rootDepthM, 2),
    progress: Math.min(1, day / total),
    expectedHarvest: new Date(planted.getTime() + total * 86400000).toISOString(),
  };
}

export function soilLimits(field: FieldRow) {
  const soil = getSoil(field.soilType);
  return {
    soil,
    fieldCapacity: field.fieldCapacity ?? soil.fieldCapacity,
    wiltingPoint: soil.wiltingPoint,
  };
}

export function waterStatus(
  field: FieldRow,
  stage: ReturnType<typeof cropStage>,
  moisturePct: number | null
) {
  const { fieldCapacity, wiltingPoint } = soilLimits(field);
  const p = stage.profile?.depletionFraction ?? 0.5;
  const tawMm = 1000 * ((fieldCapacity - wiltingPoint) / 100) * stage.rootDepthM;
  const rawMm = p * tawMm;
  const refillPoint = field.refillPoint ?? round(fieldCapacity - p * (fieldCapacity - wiltingPoint), 1);

  if (moisturePct === null) {
    return { fieldCapacity, wiltingPoint, refillPoint, tawMm: round(tawMm), rawMm: round(rawMm), depletionMm: null, stressPct: null, needMm: null };
  }

  const depletionMm = Math.max(0, 1000 * ((fieldCapacity - moisturePct) / 100) * stage.rootDepthM);
  return {
    fieldCapacity,
    wiltingPoint,
    refillPoint,
    tawMm: round(tawMm),
    rawMm: round(rawMm),
    depletionMm: round(depletionMm),
    stressPct: tawMm > 0 ? Math.min(100, Math.round((depletionMm / tawMm) * 100)) : null,
    needMm: round(depletionMm),
  };
}

export function methodFor(field: FieldRow, farm: FarmRow) {
  const method = (field.irrigationMethod ?? farm.irrigationMethod ?? "flood").toLowerCase();
  return irrigationEfficiency[method] ? method : "flood";
}

// Largest net depth applied in one irrigation event; deeper deficits are refilled over several events.
const maxNetPerEventMm: Record<string, number> = { flood: 50, sprinkler: 25, drip: 12 };

export function irrigationPlan(field: FieldRow, farm: FarmRow, netMm: number) {
  const method = methodFor(field, farm);
  const efficiency = irrigationEfficiency[method];
  const areaM2 = field.area * squareMetresPerAcre;
  const appliedNetMm = Math.min(netMm, maxNetPerEventMm[method] ?? 50);
  const grossMm = appliedNetMm / efficiency;
  const litres = grossMm * areaM2;
  const flowLpm = field.pumpFlowLpm ?? defaultFlowLpm(method);
  const runMinutes = flowLpm > 0 ? Math.round(litres / flowLpm) : null;
  return {
    method,
    efficiency,
    netMm: round(appliedNetMm),
    deficitMm: round(netMm),
    grossMm: round(grossMm),
    litres: Math.round(litres),
    runMinutes,
    duration: formatDuration(runMinutes),
    flowLpm,
  };
}

export function formatDuration(minutes: number | null) {
  if (minutes === null) return "-";
  if (minutes < 90) return `${minutes} min`;
  const hours = minutes / 60;
  return hours < 48 ? `${round(hours)} h` : `${round(hours / 24)} days`;
}

export function defaultFlowLpm(method: string) {
  if (method === "drip") return 60;
  if (method === "sprinkler") return 250;
  return 400;
}

export function cropEtMm(et0: number, kc: number) {
  return round(et0 * kc, 2);
}

export function profileFor(crop: CropRow | null) {
  return getCrop(crop?.cropType ?? crop?.name ?? null);
}

export function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function litresPerAcre(litres: number, acres: number) {
  return acres > 0 ? litres / acres : 0;
}

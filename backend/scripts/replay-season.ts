// Past-season replay: AgriGuard's irrigation rules against a rain-blind weekly schedule over one real past season of
// reanalysis weather at each demo field's coordinates. The result is a simulation, never a measured saving.
// Reads the database only; writes nothing but the archive cache (.cache/replay) and data/validation/season-replay.json.
// Usage: npx tsx scripts/replay-season.ts [--refresh] [--as-of YYYY-MM-DD]
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import db from "../src/config/database.js";
import { fromRoot } from "../src/config/paths.js";
import { seasonLength, type CropProfile } from "../src/data/crops.js";
import { baselinePractice, getSoil, gridKgCo2PerKwh, irrigationEfficiency, soils } from "../src/data/soils.js";
import { squareMetresPerAcre } from "../src/lib/geo.js";
import { addDays, dayKey, localClock, parseTimestamp, startOfLocalDay } from "../src/lib/time.js";
import { cropEtMm, cropStage, irrigationPlan, methodFor, profileFor, round, soilLimits, waterStatus } from "../src/services/agronomy.service.js";
import { decideIrrigation } from "../src/services/engine.service.js";
import { baselineFor, controlFieldIds, energyPerLitre } from "../src/services/ledger.service.js";
import type { Forecast } from "../src/services/weather.service.js";
import type { CropRow, FarmRow, FieldRow, ObservationRow } from "../src/types/models.js";

const args = process.argv.slice(2);
const option = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const refresh = args.includes("--refresh");
const asOf = option("as-of") ?? dayKey(new Date());
if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new Error("--as-of must be YYYY-MM-DD");

const label = "Simulated on real historical weather (Open-Meteo archive). Not measured savings.";
const archiveApi = "https://archive-api.open-meteo.com/v1/archive";
const archiveDocs = "https://open-meteo.com/en/docs/historical-weather-api";
const archiveModel = "era5_seamless";
const timezone = "Asia/Kolkata";
const fao56Chapter8 = "https://www.fao.org/4/x0490e/x0490e0e.htm";
const weekDays = 7;
const cacheDir = fromRoot(".cache", "replay");
const outputFile = fromRoot("data", "validation", "season-replay.json");
// Farm owners created by scripts/seed-demo.ts.
const demoOwners = ["demo@agriguard.in", "sunita@agriguard.in", "anil@agriguard.in", "lakshmi@agriguard.in"];
const controlReason = "trial control plot: it follows the usual practice, and the app never counts savings on control plots";
const appDefaultNote =
  "The app's default usual-practice schedule (baselinePractice in data/soils.ts), which soils.ts marks \"Not yet verified against a published source\". Kept for reference only; it is not used in any totals or headlines.";

interface ArchiveBody {
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  utc_offset_seconds: number;
  daily?: { time: string[]; et0_fao_evapotranspiration: Array<number | null>; precipitation_sum: Array<number | null> };
}

interface Archive {
  url: string;
  fetchedAt: string;
  body: ArchiveBody;
}

interface Tally {
  irrigations: number;
  ontoFullSoil: number;
  netMm: number;
  litres: number;
  actualEtMm: number;
  etReductionMm: number;
  stressDays: number;
  daysEndingAboveRaw: number;
  deepPercolationMm: number;
  depletionMm: number;
}

interface Day {
  tawMm: number;
  rawMm: number;
  etcMm: number;
  rainMm: number;
}

interface Pricing {
  kwhPerLitre: number;
  rupeesPerKwh: number;
  areaM2: number;
  etcMm: number;
}

function archiveUrl(latitude: number, longitude: number, start: string, end: string) {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    start_date: start,
    end_date: end,
    daily: "et0_fao_evapotranspiration,precipitation_sum",
    timezone,
    models: archiveModel,
  });
  return `${archiveApi}?${params}`;
}

async function fetchArchive(url: string): Promise<Archive> {
  const file = resolve(cacheDir, `${createHash("sha256").update(url).digest("hex").slice(0, 24)}.json`);
  if (!refresh && existsSync(file)) return JSON.parse(readFileSync(file, "utf8")) as Archive;
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Open-Meteo archive returned ${response.status}: ${await response.text()}`);
  const archive: Archive = { url, fetchedAt: new Date().toISOString(), body: (await response.json()) as ArchiveBody };
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(file, JSON.stringify(archive, null, 2));
  return archive;
}

function missingDays(body: ArchiveBody, start: string, days: number) {
  let missing = 0;
  for (let day = 0; day < days; day += 1) {
    const ok =
      body.daily?.time[day] === addDays(start, day) &&
      typeof body.daily.precipitation_sum[day] === "number" &&
      typeof body.daily.et0_fao_evapotranspiration[day] === "number";
    if (!ok) missing += 1;
  }
  return missing;
}

function isCalendarDay(key: string) {
  const probe = new Date(`${key}T12:00:00Z`);
  return !Number.isNaN(probe.getTime()) && probe.toISOString().slice(0, 10) === key;
}

// Most recent season with the same planting month/day that has ended before --as-of and has archive data for every day.
async function pickSeason(crop: CropRow, profile: CropProfile, latitude: number, longitude: number) {
  const planted = parseTimestamp(crop.plantingDate)!;
  const plantedKey = dayKey(planted);
  const timeOfDayMs = planted.getTime() - startOfLocalDay(plantedKey).getTime();
  const days = seasonLength(profile);
  const rejected: Array<{ year: number; reason: string; url?: string }> = [];
  const latestYear = Number(asOf.slice(0, 4));
  for (let year = latestYear; year > latestYear - 5; year -= 1) {
    const start = `${year}${plantedKey.slice(4)}`;
    if (!isCalendarDay(start)) {
      rejected.push({ year, reason: `${start} is not a calendar day` });
      continue;
    }
    const lastDay = addDays(start, days - 1);
    if (lastDay >= asOf) {
      rejected.push({ year, reason: `season runs to ${lastDay}, not finished before ${asOf}` });
      continue;
    }
    const url = archiveUrl(latitude, longitude, start, lastDay);
    const archive = await fetchArchive(url);
    const missing = missingDays(archive.body, start, days);
    if (missing > 0) {
      rejected.push({ year, reason: `archive has no data for ${missing} of ${days} days (ERA5 is published about 5 days late)`, url });
      continue;
    }
    const plantedAt = new Date(startOfLocalDay(start).getTime() + timeOfDayMs);
    return { year, start, lastDay, days, plantedAt, archive, rejected };
  }
  throw new Error(`No complete past season found for crop ${crop.id}: ${JSON.stringify(rejected)}`);
}

// Inverse of waterStatus: depletion = 1000 x (FC - moisture) / 100 x Zr.
function moistureFor(field: FieldRow, rootDepthM: number, depletionMm: number) {
  return soilLimits(field).fieldCapacity - (100 * depletionMm) / (1000 * rootDepthM);
}

// Historical data has no forecast, so the next 24 h hold the day's observed rain (spread evenly), certain whenever any
// fell. Only rain, its probability and the day's ET0 reach the decision; the other forecast fields are left as NaN.
function perfectForecast(now: Date, date: string, rainMm: number, et0Mm: number, body: ArchiveBody): Forecast {
  const probability = rainMm > 0 ? 100 : 0;
  return {
    latitude: body.latitude,
    longitude: body.longitude,
    timezone: body.timezone,
    utcOffsetSeconds: body.utc_offset_seconds,
    fetchedAt: now.toISOString(),
    hourly: [...Array(24).keys()].map((hour) => ({
      time: new Date(now.getTime() + hour * 3600000).toISOString(),
      temperature: Number.NaN,
      humidity: Number.NaN,
      rainMm: rainMm / 24,
      rainProbability: probability,
      radiation: Number.NaN,
      windKmh: Number.NaN,
      et0: Number.NaN,
    })),
    daily: [
      {
        date,
        tempMax: Number.NaN,
        tempMin: Number.NaN,
        rainMm,
        rainProbability: probability,
        et0: et0Mm,
        radiationMj: Number.NaN,
        windMaxKmh: Number.NaN,
        sunrise: "",
        sunset: "",
      },
    ],
  };
}

function simulatedReading(fieldId: number, moisture: number, now: Date): ObservationRow {
  const at = now.toISOString();
  return {
    id: 0,
    soilMoisture: moisture,
    temperature: null,
    humidity: null,
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
    pumpOn: null,
    source: "SIMULATOR",
    notes: "season replay water balance",
    fieldId,
    deviceId: null,
    observedAt: at,
    createdAt: at,
  };
}

const newTally = (): Tally => ({
  irrigations: 0,
  ontoFullSoil: 0,
  netMm: 0,
  litres: 0,
  actualEtMm: 0,
  etReductionMm: 0,
  stressDays: 0,
  daysEndingAboveRaw: 0,
  deepPercolationMm: 0,
  depletionMm: 0,
});

function countIrrigation(tally: Tally, netMm: number, litres: number) {
  tally.irrigations += 1;
  if (tally.depletionMm === 0) tally.ontoFullSoil += 1;
  tally.netMm += netMm;
  tally.litres += litres;
}

// FAO-56 ch. 8: eq. 85 with RO = CR = 0, deep percolation eq. 88, limits eq. 86. Ks (eq. 84) uses the depletion at the
// start of the day after the morning irrigation (Example 38, note 5); rain is not credited until the end of the day.
function balanceDay(tally: Tally, day: Day, netMm: number, litres: number) {
  if (netMm > 0) countIrrigation(tally, netMm, litres);
  const startMm = Math.max(0, tally.depletionMm - netMm);
  const ks = startMm > day.rawMm ? Math.max(0, (day.tawMm - startMm) / (day.tawMm - day.rawMm)) : 1;
  const actualEtMm = ks * day.etcMm;
  const balance = tally.depletionMm - day.rainMm - netMm + actualEtMm;
  tally.deepPercolationMm += Math.max(0, -balance);
  tally.depletionMm = Math.min(day.tawMm, Math.max(0, balance));
  tally.actualEtMm += actualEtMm;
  tally.etReductionMm += day.etcMm - actualEtMm;
  if (ks < 1) tally.stressDays += 1;
  if (tally.depletionMm > day.rawMm) tally.daysEndingAboveRaw += 1;
  return ks;
}

// The weekly baseline's final partial week, applied after the last season day: it only refills the root zone.
function seasonEndIrrigation(tally: Tally, netMm: number, litres: number) {
  countIrrigation(tally, netMm, litres);
  tally.deepPercolationMm += Math.max(0, netMm - tally.depletionMm);
  tally.depletionMm = Math.max(0, tally.depletionMm - netMm);
}

function summarize(tally: Tally, pricing: Pricing) {
  const kwh = tally.litres * pricing.kwhPerLitre;
  return {
    irrigations: tally.irrigations,
    litres: Math.round(tally.litres),
    grossMm: round(tally.litres / pricing.areaM2, 1),
    netMm: round(tally.netMm, 1),
    kwh: round(kwh, 1),
    rupees: Math.round(kwh * pricing.rupeesPerKwh),
    co2Kg: round(kwh * gridKgCo2PerKwh, 1),
    actualEtMm: round(tally.actualEtMm, 1),
    actualEtPctOfEtc: pricing.etcMm > 0 ? round((100 * tally.actualEtMm) / pricing.etcMm, 2) : null,
    stressDays: tally.stressDays,
    daysEndingAboveRaw: tally.daysEndingAboveRaw,
    etReductionMm: round(tally.etReductionMm, 1),
    deepPercolationMm: round(tally.deepPercolationMm, 1),
    endDepletionMm: round(tally.depletionMm, 1),
    irrigationsOntoSoilAtFieldCapacity: tally.ontoFullSoil,
  };
}

type StrategySummary = ReturnType<typeof summarize>;

function savingAgainst(baseline: Tally, agriguard: Tally, pricing: Pricing) {
  const litres = baseline.litres - agriguard.litres;
  const kwh = litres * pricing.kwhPerLitre;
  return {
    litres: Math.round(litres),
    pct: baseline.litres > 0 ? round((100 * litres) / baseline.litres, 1) : null,
    kwh: round(kwh, 1),
    rupees: Math.round(kwh * pricing.rupeesPerKwh),
    co2Kg: round(kwh * gridKgCo2PerKwh, 1),
  };
}

async function replayField(field: FieldRow, farm: FarmRow, crop: CropRow, profile: CropProfile, control: boolean) {
  const latitude = (field.latitude ?? farm.latitude)!;
  const longitude = (field.longitude ?? farm.longitude)!;
  const season = await pickSeason(crop, profile, latitude, longitude);
  const body = season.archive.body;
  const weather = body.daily!;
  const replayCrop: CropRow = { ...crop, plantingDate: season.plantedAt.toISOString() };
  const decisionField: FieldRow = { ...field, solarPreferred: false };
  const method = methodFor(field, farm);
  const efficiency = irrigationEfficiency[method];
  const appDefault = baselineFor(field, farm);
  const areaM2 = field.area * squareMetresPerAcre;
  const appDefaultLitres = appDefault.depthMm * areaM2;
  const limitsAtStart = soilLimits(field);
  const agriguard = newTally();
  const weekly = newTally();
  const unverified = newTally();
  const actions: Record<string, number> = {};
  let criticalIrrigations = 0;
  let cappedIrrigations = 0;
  let weeklyAboveRefill = 0;
  let pendingEtcMm = 0;
  let pendingDays = 0;
  const totals = { rainMm: 0, effectiveRainMm: 0, et0Mm: 0, etcMm: 0 };
  const daily = [];

  for (let day = 0; day < season.days; day += 1) {
    const now = new Date(season.plantedAt.getTime() + day * 86400000);
    const date = weather.time[day];
    if (date !== dayKey(now)) throw new Error(`Archive day ${date} does not match decision day ${dayKey(now)}`);
    const rainMm = weather.precipitation_sum[day]!;
    const et0Mm = weather.et0_fao_evapotranspiration[day]!;
    const stage = cropStage(replayCrop, profile, now);
    const limits = waterStatus(field, stage, null);
    const etcMm = cropEtMm(et0Mm, stage.kc);
    // FAO-56 ch. 8: daily rain below about 0.2 ET0 evaporates and is ignored with the single crop coefficient.
    const effectiveRainMm = rainMm < 0.2 * et0Mm ? 0 : rainMm;
    const today: Day = { tawMm: limits.tawMm, rawMm: limits.rawMm, etcMm, rainMm: effectiveRainMm };
    totals.rainMm += rainMm;
    totals.effectiveRainMm += effectiveRainMm;
    totals.et0Mm += et0Mm;
    totals.etcMm += etcMm;

    const moisture = moistureFor(field, stage.rootDepthM, agriguard.depletionMm);
    const decision = decideIrrigation({
      field: decisionField,
      farm,
      crop: replayCrop,
      device: null,
      latest: simulatedReading(field.id, moisture, now),
      latestAgeMinutes: 0,
      recent: [],
      schedules: [],
      forecast: perfectForecast(now, date, rainMm, et0Mm, body),
      weatherError: null,
      now,
    });
    actions[decision.action] = (actions[decision.action] ?? 0) + 1;
    const irrigate = decision.action === "IRRIGATE";
    if (irrigate && decision.critical) criticalIrrigations += 1;
    if (irrigate && decision.plan.deficitMm > decision.plan.netMm) cappedIrrigations += 1;
    const agriguardNet = irrigate ? decision.plan.netMm : 0;
    const agriguardLitres = irrigate ? decision.plan.litres : 0;
    const agriguardKs = balanceDay(agriguard, today, agriguardNet, agriguardLitres);

    // Rain-blind weekly schedule: on day 7, 14, ... replace the previous 7 days' ETc, whatever the rain or soil.
    const weeklyDue = day > 0 && day % weekDays === 0;
    const weeklyNet = weeklyDue ? pendingEtcMm : 0;
    const weeklyLitres = (weeklyNet / efficiency) * areaM2;
    if (weeklyDue) {
      pendingEtcMm = 0;
      pendingDays = 0;
    }
    const weeklyMoisture = moistureFor(field, stage.rootDepthM, weekly.depletionMm);
    if (weeklyDue && weeklyMoisture > limits.refillPoint) weeklyAboveRefill += 1;
    const weeklyKs = balanceDay(weekly, today, weeklyNet, weeklyLitres);
    pendingEtcMm += etcMm;
    pendingDays += 1;

    const appDefaultDue = (day + 1) % appDefault.intervalDays === 0;
    balanceDay(unverified, today, appDefaultDue ? appDefault.depthMm * efficiency : 0, appDefaultDue ? appDefaultLitres : 0);

    daily.push({
      date,
      day,
      stage: stage.stage,
      kc: stage.kc,
      rootDepthM: stage.rootDepthM,
      tawMm: limits.tawMm,
      rawMm: limits.rawMm,
      rainMm,
      et0Mm,
      etcMm,
      agriguard: {
        moisturePct: round(moisture, 2),
        action: decision.action,
        netMm: agriguardNet,
        litres: agriguardLitres,
        ks: round(agriguardKs, 3),
        depletionMm: round(agriguard.depletionMm, 2),
      },
      rainBlindWeekly: {
        moisturePct: round(weeklyMoisture, 2),
        netMm: round(weeklyNet, 2),
        litres: Math.round(weeklyLitres),
        ks: round(weeklyKs, 3),
        depletionMm: round(weekly.depletionMm, 2),
      },
    });
  }

  const finalNet = pendingEtcMm;
  const finalLitres = (finalNet / efficiency) * areaM2;
  if (finalNet > 0) seasonEndIrrigation(weekly, finalNet, finalLitres);

  const energy = await energyPerLitre(field);
  const pricing: Pricing = { kwhPerLitre: energy.value, rupeesPerKwh: farm.electricityRate, areaM2, etcMm: totals.etcMm };
  const clock = localClock(season.plantedAt);

  return {
    fieldId: field.id,
    field: field.name,
    farm: farm.name,
    location: farm.location,
    latitude: round(latitude, 4),
    longitude: round(longitude, 4),
    areaAcres: field.area,
    areaM2: Math.round(areaM2),
    trialControl: control,
    includedInTotals: !control,
    inConservativeHeadline: !control && agriguard.irrigations > 0,
    crop: {
      name: profile.name,
      key: profile.key,
      stageDays: profile.stages,
      kc: profile.kc,
      rootDepthM: profile.rootDepthM,
      depletionFraction: profile.depletionFraction,
    },
    soil: { type: field.soilType, profile: getSoil(field.soilType).name, fieldCapacityPct: limitsAtStart.fieldCapacity, wiltingPointPct: limitsAtStart.wiltingPoint },
    irrigation: {
      method,
      efficiency,
      maxNetPerEventMm: irrigationPlan(field, farm, 1e6).netMm,
      pumpFlowLpm: field.pumpFlowLpm,
      pumpPowerKw: field.pumpPowerKw,
    },
    season: {
      year: season.year,
      planted: season.start,
      lastDay: season.lastDay,
      days: season.days,
      dailyDecisionTime: `${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")} ${timezone}`,
      activeCropPlanted: dayKey(parseTimestamp(crop.plantingDate)!),
      rejected: season.rejected,
    },
    weather: {
      url: season.archive.url,
      fetchedAt: season.archive.fetchedAt,
      gridLatitude: body.latitude,
      gridLongitude: body.longitude,
      gridElevationM: body.elevation,
      rainMm: round(totals.rainMm, 1),
      effectiveRainMm: round(totals.effectiveRainMm, 1),
      et0Mm: round(totals.et0Mm, 1),
    },
    etcMm: round(totals.etcMm, 1),
    energy: { kwhPerKilolitre: round(energy.value * 1000, 4), source: energy.source },
    tariffRupeesPerKwh: farm.electricityRate,
    agriguard: {
      ...summarize(agriguard, pricing),
      skipRainMornings: actions.SKIP_RAIN ?? 0,
      decisions: actions,
      criticalIrrigations,
      irrigationsCappedAtMaxNet: cappedIrrigations,
    },
    rainBlindWeekly: {
      rule: `On day ${weekDays}, ${2 * weekDays}, ... after planting: gross = the previous ${weekDays} days' ETc (cropEtMm) / ${method} efficiency ${efficiency}, regardless of rain or soil moisture; the final partial week is applied pro rata after the last day.`,
      ...summarize(weekly, pricing),
      weeklyEvents: weekly.irrigations - (finalNet > 0 ? 1 : 0),
      finalProRata: { days: finalNet > 0 ? pendingDays : 0, netMm: round(finalNet, 2), litres: Math.round(finalLitres) },
      eventsWhileAboveRefillPoint: weeklyAboveRefill,
    },
    saved: savingAgainst(weekly, agriguard, pricing),
    unverifiedAppDefaultBaseline: {
      note: appDefaultNote,
      source: farm.baselineDepthMm !== null || farm.baselineIntervalDays !== null ? "farm settings" : `baselinePractice.${appDefault.method}`,
      depthMm: appDefault.depthMm,
      intervalDays: appDefault.intervalDays,
      litresPerIrrigation: Math.round(appDefaultLitres),
      ...summarize(unverified, pricing),
      savedByAgriGuard: savingAgainst(unverified, agriguard, pricing),
    },
    daily,
  };
}

type FieldResult = Awaited<ReturnType<typeof replayField>>;

function totalsOf(results: FieldResult[]) {
  const sum = (pick: (result: FieldResult) => number) => results.reduce((total, result) => total + pick(result), 0);
  const etcVolume = sum((r) => r.etcMm * r.areaM2);
  const strategy = (pick: (result: FieldResult) => StrategySummary) => ({
    irrigations: sum((r) => pick(r).irrigations),
    litres: sum((r) => pick(r).litres),
    kwh: round(sum((r) => pick(r).kwh), 1),
    rupees: sum((r) => pick(r).rupees),
    co2Kg: round(sum((r) => pick(r).co2Kg), 1),
    stressFieldDays: sum((r) => pick(r).stressDays),
    actualEtPctOfEtc: etcVolume > 0 ? round((100 * sum((r) => pick(r).actualEtMm * r.areaM2)) / etcVolume, 2) : null,
  });
  const agriguard = { ...strategy((r) => r.agriguard), skipRainMornings: sum((r) => r.agriguard.skipRainMornings) };
  const rainBlindWeekly = { ...strategy((r) => r.rainBlindWeekly), weeklyEvents: sum((r) => r.rainBlindWeekly.weeklyEvents) };
  const savedLitres = rainBlindWeekly.litres - agriguard.litres;
  return {
    fields: results.map((r) => r.field),
    fieldDays: sum((r) => r.season.days),
    period: {
      from: results.map((r) => r.season.planted).sort()[0] ?? null,
      to: results.map((r) => r.season.lastDay).sort().at(-1) ?? null,
    },
    agriguard,
    rainBlindWeekly,
    saved: {
      litres: savedLitres,
      pct: rainBlindWeekly.litres > 0 ? round((100 * savedLitres) / rainBlindWeekly.litres, 1) : null,
      kwh: round(sum((r) => r.saved.kwh), 1),
      rupees: sum((r) => r.saved.rupees),
      co2Kg: round(sum((r) => r.saved.co2Kg), 1),
    },
  };
}

function concernsFor(results: FieldResult[], headlineSavedLitres: number) {
  const counted = results.filter((r) => r.includedInTotals);
  const headline = counted.filter((r) => r.inConservativeHeadline);
  const rainfed = counted.filter((r) => !r.inConservativeHeadline);
  const format = (litres: number) => Math.round(litres).toLocaleString("en-IN");
  const share = (litres: number) => (headlineSavedLitres > 0 ? Math.round((100 * litres) / headlineSavedLitres) : 0);
  const concerns = [
    `The headline baseline replaces the crop's full FAO-56 ETc every ${weekDays} days and ignores rain, i.e. the gross irrigation a season without rain would need. Farmers who skip irrigating after rain pump less, so even the conservative saving overstates what a rain-aware farmer would save.`,
  ];
  if (rainfed.length) {
    concerns.push(
      `AgriGuard never irrigated ${rainfed.map((r) => r.field).join(", ")}: rain kept the soil above the refill point all season, so their entire baseline volume (${format(rainfed.reduce((total, r) => total + r.saved.litres, 0))} L) would count as saved. They are left out of the conservative headline.`
    );
  }
  concerns.push(
    `SKIP_RAIN uses the observed rain as a perfect forecast (probability 100% whenever rain fell): AgriGuard skipped on ${counted.reduce((total, r) => total + r.agriguard.skipRainMornings, 0)} mornings knowing the rain would come. A real forecast misses some events, so the saving would be smaller.`
  );
  const stressed = counted.filter((r) => r.rainBlindWeekly.stressDays > 0);
  if (stressed.length) {
    concerns.push(
      `The weekly baseline's stress days (${stressed.map((r) => `${r.field} ${r.rainBlindWeekly.stressDays}`).join(", ")}) come from its fixed ${weekDays}-day interval, not from under-supply: over the season it pumps the full ETc, but shallow young roots cannot hold a week of ETc.`
    );
  }
  const paddy = headline.filter((r) => r.crop.key === "paddy");
  if (paddy.length) {
    concerns.push(
      `Paddy is modelled like an upland crop (FAO-56 root-zone balance, p = ${paddy[0].crop.depletionFraction}): ponding, puddling and percolation from standing water are not represented, so paddy water use is understated for both strategies. Paddy is ${share(paddy.reduce((total, r) => total + r.saved.litres, 0))}% of the conservative saving.`
    );
  }
  const drawdown = headline.reduce(
    (total, r) => total + Math.max(0, ((r.agriguard.endDepletionMm - r.rainBlindWeekly.endDepletionMm) * r.areaM2) / r.irrigation.efficiency),
    0
  );
  if (drawdown > 0) {
    concerns.push(
      `AgriGuard ends seasons with drier soil than the baseline; refilling the difference would take ${format(drawdown)} L of pumping (${share(drawdown)}% of the conservative saving), so that part is soil water drawn down rather than water never needed. Both runs let deepening roots use subsoil assumed to be at field capacity.`
    );
  }
  for (const r of results) {
    const named = soils.find((soil) => soil.name.toLowerCase() === (r.soil.type ?? "").toLowerCase());
    const used = getSoil(r.soil.type);
    if (named && named.key !== used.key) {
      concerns.push(`${r.field}: getSoil resolves the soil type "${r.soil.type}" to the ${used.name} profile instead of ${named.name}.`);
    }
  }
  concerns.push("Rain and ET0 are ERA5/ERA5-Land grid-cell values (about 11-25 km), not an on-farm rain gauge; local showers can differ a lot from the grid cell.");
  concerns.push(
    "Field areas, irrigation methods and pump ratings are the demo set-ups in seed-demo.ts (fictional farms on real coordinates), so litres and kWh scale with those values. Rupees use each farm's stored 2026-27 tariff; where power is free or flat-rate to farmers (seed-demo.ts notes this for Punjab, Andhra Pradesh and Madhya Pradesh) they are the tariff or subsidy value, not the farmer's bill. Solar arrays are ignored: all pumping is priced as grid electricity."
  );
  concerns.push(
    `The app's default usual-practice schedule (baselinePractice: flood ${baselinePractice.flood.depthMm} mm every ${baselinePractice.flood.intervalDays} d, sprinkler ${baselinePractice.sprinkler.depthMm} mm every ${baselinePractice.sprinkler.intervalDays} d, drip ${baselinePractice.drip.depthMm} mm daily) is marked in soils.ts as not yet verified against a published source; its results appear only under unverifiedAppDefaultBaseline.`
  );
  return concerns;
}

async function main() {
  const owners = await db.orm.public.User.where((u) => u.email.in(demoOwners)).all();
  const farms = await db.orm.public.Farm.where((f) => f.ownerId.in(owners.map((owner) => owner.id))).orderBy((f) => f.id.asc()).all();
  const controls = await controlFieldIds();
  const results: FieldResult[] = [];
  const skipped: Array<{ fieldId: number; field: string; reason: string }> = [];

  for (const farm of farms) {
    const fields = await db.orm.public.Field.where({ farmId: farm.id }).orderBy((f) => f.id.asc()).all();
    for (const field of fields) {
      const crop = await db.orm.public.Crop.where({ fieldId: field.id, status: "ACTIVE" }).orderBy((c) => c.createdAt.desc()).first();
      const profile = profileFor(crop);
      const skip = (reason: string) => skipped.push({ fieldId: field.id, field: field.name, reason });
      if (!crop || !profile) {
        skip("no active crop with a known crop profile");
        continue;
      }
      if (!parseTimestamp(crop.plantingDate)) {
        skip("active crop has no planting date");
        continue;
      }
      if ((field.latitude ?? farm.latitude) === null || (field.longitude ?? farm.longitude) === null) {
        skip("no coordinates");
        continue;
      }
      const result = await replayField(field, farm, crop, profile, controls.has(field.id));
      results.push(result);
      console.log(
        `${farm.name} / ${field.name}: ${result.season.planted}..${result.season.lastDay}, rain ${result.weather.rainMm} mm, ` +
          `A ${result.agriguard.irrigations}x ${result.agriguard.litres.toLocaleString("en-IN")} L (${result.agriguard.skipRainMornings} SKIP_RAIN), ` +
          `B ${result.rainBlindWeekly.irrigations}x ${result.rainBlindWeekly.litres.toLocaleString("en-IN")} L, saved ${result.saved.pct}%, ` +
          `stress days A ${result.agriguard.stressDays} B ${result.rainBlindWeekly.stressDays}`
      );
    }
  }

  const counted = results.filter((r) => r.includedInTotals);
  const controlExclusions = results
    .filter((r) => !r.includedInTotals)
    .map((r) => ({ fieldId: r.fieldId, field: r.field, reason: controlReason }));
  const conservative = {
    headline: true,
    rule: "Only fields where AgriGuard irrigated at least once in the replayed season, i.e. fields that needed irrigation that year.",
    ...totalsOf(counted.filter((r) => r.inConservativeHeadline)),
    excludedFields: [
      ...controlExclusions,
      ...counted
        .filter((r) => !r.inConservativeHeadline)
        .map((r) => ({
          fieldId: r.fieldId,
          field: r.field,
          reason: `AgriGuard never irrigated: ${r.weather.rainMm} mm of rain kept the soil above the refill point all season, so the crop did not need irrigation in ${r.season.year} and the whole baseline volume would count as saved`,
        })),
    ],
  };
  const allFields = { headline: false, ...totalsOf(counted), excludedFields: controlExclusions };

  const output = {
    generatedAt: new Date().toISOString(),
    label,
    source: {
      api: archiveApi,
      docs: archiveDocs,
      model: archiveModel,
      variables: ["et0_fao_evapotranspiration", "precipitation_sum"],
      timezone,
      urls: results.map((r) => r.weather.url),
      dataset:
        "Open-Meteo ERA5-Seamless: ECMWF ERA5 reanalysis (0.25 deg) merged by Open-Meteo with ERA5-Land (0.1 deg) temperature and humidity; precipitation comes from ERA5 (ERA5-Land has none of its own). Daily ET0 is Open-Meteo's FAO-56 Penman-Monteith reference evapotranspiration. The default best_match model was not used because it also blends the ECMWF IFS HRES operational analysis, which is not a reanalysis.",
      docsQuotes: [
        "Gap-free and consistent historical weather data using weather reanalysis from ERA5 (0.25°, from 1940) and ERA5-Land (0.1°, from 1950) and ECMWF IFS (9 km, from 2017).",
        "The default Best Match combines IFS HRES, ERA5 and ERA5-Land seamlessly.",
        "Only with model “ERA5-Seamless” merging temperature and humidity from ERA5-Land with wind and solar radiation from ERA5.",
        "ERA5 ... Daily with 5 days delay",
        "et0_fao_evapotranspiration: Daily sum of ET₀ Reference Evapotranspiration of a well watered grass field. Based on FAO-56 Penman-Monteith equations ET₀ is calculated from temperature, wind speed, humidity and solar radiation. Unlimited soil water is assumed.",
      ],
      docsCheckedOn: "2026-09-28",
      citation: [
        "Hersbach, H., Bell, B., Berrisford, P., Biavati, G., Horányi, A., Muñoz Sabater, J., Nicolas, J., Peubey, C., Radu, R., Rozum, I., Schepers, D., Simmons, A., Soci, C., Dee, D., Thépaut, J-N. (2023). ERA5 hourly data on single levels from 1940 to present [Data set]. ECMWF. https://doi.org/10.24381/cds.adbb2d47",
        "Muñoz Sabater, J. (2019). ERA5-Land hourly data from 2001 to present [Data set]. ECMWF. https://doi.org/10.24381/CDS.E2161BAC",
        "Zippenfenig, P. (2023). Open-Meteo.com Weather API [Computer software]. Zenodo. https://doi.org/10.5281/ZENODO.7970649",
      ],
      attribution:
        "Weather data by Open-Meteo.com (https://open-meteo.com/), licensed CC BY 4.0 (https://open-meteo.com/en/licence). Generated using Copernicus Climate Change Service information. Daily values were used as published; the water balance built on them is this script's own simulation.",
    },
    method: {
      summary:
        "Each demo field with an active crop was replayed over its most recent complete past season with the same planting day, on ERA5-Seamless daily rain and ET0 at the field's coordinates. A daily FAO-56 root-zone water balance (FAO Irrigation and Drainage Paper 56, ch. 8, eq. 84-88) starts at field capacity on planting day and uses the app's own crop stage Kc, root depth, depletion fraction, TAW and RAW. It is run for A (AgriGuard): the app's real decideIrrigation is called every morning with the simulated soil moisture and a perfect next-24-h rain forecast, and irrigationPlan's net depth is applied (gross = net / method efficiency). It is run again for B (rain-blind weekly schedule): every 7 days from day 7, gross water = the previous 7 days' FAO-56 ETc (cropEtMm) / the field's method efficiency, regardless of rain or soil moisture, with the final partial week applied pro rata at season end. Litres, kWh (energyPerLitre), rupees (farm tariff) and CO2 (CEA grid factor) come from the app's own functions and constants. The conservative headline counts only fields where A irrigated at least once.",
      reference: `Allen, R.G., Pereira, L.S., Raes, D., Smith, M. (1998). Crop evapotranspiration: guidelines for computing crop water requirements. FAO Irrigation and Drainage Paper 56, chapter 8. ${fao56Chapter8}`,
      assumptions: [
        `Season: the active crop's planting month/day and the crop profile's season length (data/crops.ts); the most recent year whose season ended before ${asOf} and has archive data for every day. Day 0 is planting day. Irrigation decisions are taken once a day at the stored planting time of day (06:00 IST).`,
        "Weather: Open-Meteo archive, model era5_seamless, daily precipitation_sum and et0_fao_evapotranspiration, timezone Asia/Kolkata, at the field centroid; values are for the grid cell, not the farm.",
        "Soil starts at field capacity on planting day (Dr = 0). Soil field capacity and wilting point come from getSoil (data/soils.ts) for the field's soil type (no field overrides are set). Capillary rise is 0.",
        "Kc, root depth Zr and depletion fraction p for each day come from the app's cropStage/profileFor; TAW = 1000 (FC - WP) Zr and RAW = p TAW from waterStatus; ETc = Kc x ET0 via cropEtMm.",
        "When roots deepen, the new layer is assumed to be at field capacity (FAO-56 Example 38 note 5), so depletion in mm is carried over unchanged.",
        "Surface runoff is taken as 0; daily rain below 0.2 x ET0 is ignored (FAO-56 ch. 8); rain or irrigation beyond the current depletion drains as deep percolation (eq. 88); depletion is bounded 0..TAW (eq. 86).",
        "Ks (eq. 84) reduces ETc when the depletion at the start of the day, after that morning's irrigation, exceeds RAW; rain is credited at the end of the day. A water-stress day is a day with Ks < 1 (start-of-day Dr > RAW). daysEndingAboveRaw also counts days whose end-of-day Dr exceeds RAW. Actual ET % of ETc = sum of Ks x ETc over the sum of ETc.",
        "A: soil moisture % = FC - 100 Dr / (1000 Zr), the inverse of waterStatus. The real decideIrrigation is called with that reading (fresh), no device, no pump schedules and solarPreferred off, so solar waiting, the tank dry-run block and schedule windows are ignored. Its rules then decide: SKIP_WET above the refill point; SKIP_RAIN if next-24-h rain >= max(5 mm, 0.5 x need) at >= 60% probability unless critical; otherwise IRRIGATE.",
        "A's forecast is perfect: next-24-h rain is that day's observed total, at 100% probability when any rain fell and 0% otherwise. Historical data has no forecast probabilities, so this makes A optimistic.",
        "A applies irrigationPlan in full: net = min(deficit, per-event cap: flood 50, sprinkler 25, drip 12 mm), gross = net / method efficiency (irrigationEfficiency, data/soils.ts), litres = plan.litres; at most one irrigation per day.",
        "B (headline baseline, rain-blind weekly schedule): on day 7, 14, 21, ... after planting, gross water = the sum of the previous 7 days' ETc from cropEtMm / the field's method efficiency, the same 7-day interval for every method, regardless of rain or soil moisture. The ETc of the days after the last weekly event (a final partial week of 1-7 days) is applied pro rata at season end, after the last day, as one more event. Net water reaching the root zone = that ETc (gross x efficiency), so over a season B pumps exactly total ETc / efficiency. It uses no practice numbers beyond FAO-56 Kc (via the app) and the sourced method efficiencies.",
        "The app's default baselinePractice schedule is still simulated as before (depthMm of gross water once per complete intervalDays period, on the period's last day) but reported only per field under unverifiedAppDefaultBaseline, because soils.ts marks it not yet verified; it is not in any totals or headlines.",
        `Litres = gross mm x field area (acres x ${squareMetresPerAcre} m2). kWh per litre from energyPerLitre (no metered events exist, so pump rating: pumpPowerKw / (pumpFlowLpm x 60)). Rupees = kWh x the farm's electricityRate. CO2 = kWh x ${gridKgCo2PerKwh} kg/kWh (gridKgCo2PerKwh, CEA). Solar generation is ignored.`,
        "Saved = B - A (not floored at zero); % saved = (B - A) / B.",
        "The trial control plot is simulated for reference but excluded from all totals, as the app excludes control plots from savings.",
        "Conservative headline: only fields where A irrigated at least once; fields A never irrigated are excluded because rain alone met the crop's need that season, so any saving there would be baseline pumping the crop did not need.",
      ],
      changesFromFirstRun: [
        "The headline baseline B is now the rain-blind weekly ETc schedule; it was the app's baselinePractice schedule (flood 70 mm every 7 d, sprinkler 35 mm every 4 d, drip 8 mm daily).",
        "The baselinePractice result moved to unverifiedAppDefaultBaseline and is excluded from all totals and headlines.",
        "getSoil in data/soils.ts now matches the exact soil key or name first, so Chilli Block runs as Red (sandy loam), FC 19% / WP 8%; the first run resolved it to Sandy, FC 12% / WP 5%.",
        "Totals are now split into the conservative headline (fields where AgriGuard irrigated at least once) and all fields.",
        "All other assumptions are unchanged.",
      ],
    },
    concerns: concernsFor(results, conservative.saved.litres),
    skipped,
    fields: results.map((r) => ({ ...r, daily: `@daily:${r.fieldId}` })),
    totals: { conservative, allFields },
  };

  let text = JSON.stringify(output, null, 2);
  for (const result of results) {
    const rows = result.daily.map((row) => `        ${JSON.stringify(row)}`).join(",\n");
    text = text.replace(`"@daily:${result.fieldId}"`, `[\n${rows}\n      ]`);
  }
  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, `${text}\n`);

  for (const [name, totals] of [["Conservative headline", conservative], ["All fields", allFields]] as const) {
    console.log(
      `\n${name} (${totals.fields.length} fields): A ${totals.agriguard.litres.toLocaleString("en-IN")} L, ` +
        `B ${totals.rainBlindWeekly.litres.toLocaleString("en-IN")} L, saved ${totals.saved.litres.toLocaleString("en-IN")} L (${totals.saved.pct}%), ` +
        `${totals.saved.kwh} kWh, Rs ${totals.saved.rupees}, ${totals.saved.co2Kg} kg CO2`
    );
  }
  console.log(`${label}\nWrote ${outputFile}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

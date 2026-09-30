export type UserRole = "FARMER" | "AGRONOMIST" | "ADMIN";
export type Language = "en" | "hi" | "mr" | "pa" | "te" | "ta";
export type Level = "Low" | "Moderate" | "High";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RecType = "IRRIGATION" | "FERTILIZER" | "DISEASE" | "WEATHER" | "GENERAL";
export type PumpMode = "AUTO" | "MANUAL_ON" | "MANUAL_OFF";
export type IrrigationMethod = "flood" | "sprinkler" | "drip";
export type Access = "owner" | "advisor" | "admin";
export type LatLng = [number, number];

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  language?: Language;
  smsAlerts?: boolean;
  whatsappAlerts?: boolean;
  pushAlerts?: boolean;
  dailyBriefing?: boolean;
}

export interface Farm {
  id: number;
  name: string;
  location: string | null;
  description: string | null;
  ownerId: number;
  latitude: number | null;
  longitude: number | null;
  shareCode: string | null;
  irrigationMethod: IrrigationMethod;
  baselineDepthMm: number | null;
  baselineIntervalDays: number | null;
  electricityRate: number;
  solarCapacityKw: number | null;
  photoKey: string | null;
  createdAt: string;
  updatedAt: string;
  access?: Access;
  fieldCount?: number;
  totalArea?: number;
}

export interface Field {
  id: number;
  name: string;
  area: number;
  location: string | null;
  soilType: string | null;
  farmId: number;
  latitude: number | null;
  longitude: number | null;
  boundary: string | null;
  irrigationMethod: IrrigationMethod | null;
  pumpFlowLpm: number | null;
  pumpFlowTest: string | null;
  pumpPowerKw: number | null;
  refillPoint: number | null;
  fieldCapacity: number | null;
  solarPreferred: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FarmWithFields extends Farm {
  fields: Field[];
}

export interface Crop {
  id: number;
  name: string;
  cropType: string | null;
  variety: string | null;
  season: string | null;
  plantingDate: string | null;
  harvestDate: string | null;
  status: "ACTIVE" | "HARVESTED";
  yieldKg: number | null;
  fieldId: number;
}

export interface Observation {
  id: number;
  soilMoisture: number | null;
  temperature: number | null;
  humidity: number | null;
  rainfall: number | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  soilTemperature: number | null;
  flowTotalL: number | null;
  flowRateLpm: number | null;
  energyTotalKwh: number | null;
  powerW: number | null;
  tankLevel: number | null;
  solarW: number | null;
  batteryPct: number | null;
  rssi: number | null;
  pumpOn: boolean | null;
  source: "DEVICE" | "MANUAL" | "SIMULATOR" | "OPEN_METEO";
  notes: string | null;
  observedAt: string;
}

export interface RawReading extends Observation {
  deviceId: number | null;
  deviceName: string | null;
}

export interface HourlyPoint {
  time: string;
  soilMoisture: number | null;
  temperature: number | null;
  humidity: number | null;
  tankLevel: number | null;
  solarW: number | null;
  flowRateLpm: number | null;
  pumpOn: boolean;
}

export type DeviceKind = "NODE" | "PHONE";

export interface PumpCommand {
  pump: "ON" | "OFF";
  runSeconds: number;
  reason: string;
  reportEverySeconds: number;
  serverTime: string;
}

export interface FlowTest {
  bucketLitres: number;
  seconds: number[];
  lpm: number;
  measuredAt: string;
}

export interface Device {
  id: number;
  name: string;
  deviceKey: string;
  fieldId: number;
  fieldName?: string;
  firmware: string | null;
  lastSeenAt: string | null;
  batteryPct: number | null;
  rssi: number | null;
  pumpMode: PumpMode;
  pumpOn: boolean;
  manualUntil: string | null;
  commandPump: string | null;
  commandUntil: string | null;
  hasFlowMeter: boolean;
  hasEnergyMeter: boolean;
  hasTankSensor: boolean;
  hasSolar: boolean;
  tankHeightCm: number | null;
  tankCapacityL: number | null;
  dryRunLevelPct: number;
  simulated: boolean;
  kind: DeviceKind;
  online: boolean;
  minutesSinceSeen: number | null;
  telemetryUrl: string;
}

export interface IrrigationEvent {
  id: number;
  fieldId: number;
  deviceId: number | null;
  source: "AUTO" | "MANUAL" | "SCHEDULE";
  startedAt: string;
  endedAt: string | null;
  plannedLitres: number | null;
  litres: number | null;
  kwh: number | null;
  solarKwh: number | null;
  measured: boolean;
  reason: string | null;
}

export interface Decision {
  id: number;
  action: string;
  message?: string;
  soilMoisture: number | null;
  refillPoint: number | null;
  rainNext24Mm: number | null;
  recommendedLitres: number | null;
  decidedAt: string;
  reason?: string | null;
}

export interface Schedule {
  id: number;
  fieldId: number;
  startTime: string;
  durationMinutes: number;
  days: string;
  mode: "SMART" | "FIXED";
  enabled: boolean;
}

export interface WeatherSummary {
  rainNext24Mm: number;
  rainNext48Mm: number;
  rainProbabilityNext24: number;
  rainPast24Mm: number;
  et0Today: number;
  tempNow: number | null;
  humidityNow: number | null;
  maxTempNext3Days: number;
  maxWindNext3Days: number;
  humidHoursPast24: number;
  humidHoursNext24: number;
  meanTempNext24: number | null;
  heaviestRainDay: WeatherDay | null;
}

export interface WeatherDay {
  date: string;
  tempMax: number;
  tempMin: number;
  rainMm: number;
  rainProbability: number;
  et0: number;
  etc?: number;
  radiationMj: number;
  windMaxKmh: number;
  sunrise: string;
  sunset: string;
}

export interface Risks {
  waterStress: number | null;
  diseaseRisk: number;
  weatherRisk: number;
  nutrientStress: number | null;
  cropHealth: number;
  humidHours: number;
  meanTemp: number;
  nutrients: { N: string | null; P: string | null; K: string | null };
  levels: { water: Level | null; disease: Level | null; weather: Level | null; nutrient: Level | null };
}

export interface MoistureForecast {
  model: "learned" | "physics";
  samples: number;
  r2: number | null;
  coefficients: { intercept: number; etc: number; rain: number; irrigation: number };
  current: number;
  refillPoint: number;
  fieldCapacity: number;
  wiltingPoint: number;
  refillAt: string | null;
  hoursUntilRefill: number | null;
  points: Array<{ time: string; moisture: number; rainMm: number }>;
}

export interface NdviSnapshot {
  id: number;
  fieldId: number;
  sceneId: string;
  sceneDate: string;
  cloudCover: number;
  meanNdvi: number;
  minNdvi: number;
  maxNdvi: number;
  validPixelRatio: number;
  zones: { low: number; medium: number; high: number };
  bounds: [[number, number], [number, number]];
  imageUrl: string;
  approximate?: boolean;
}

export interface FieldOverview {
  access: Access;
  field: Field;
  farm: { id: number; name: string; latitude: number | null; longitude: number | null; irrigationMethod: IrrigationMethod; solarCapacityKw: number | null };
  soil: { key: string; name: string; fieldCapacity: number; wiltingPoint: number };
  crop: Crop | null;
  stage: {
    name: string | null;
    label: string | null;
    index: number;
    day: number | null;
    seasonDays: number | null;
    progress: number | null;
    kc: number;
    rootDepthM: number;
    expectedHarvest: string | null;
    stages: [number, number, number, number] | null;
    profile: { key: string; name: string } | null;
  };
  latest: Observation | null;
  latestAgeMinutes: number | null;
  water: { fieldCapacity: number; wiltingPoint: number; refillPoint: number; tawMm: number; rawMm: number; depletionMm: number | null; stressPct: number | null; needMm: number | null };
  decision: {
    action: string;
    message: string;
    params: Record<string, string | number>;
    plan: { method: string; efficiency: number; netMm: number; deficitMm: number; grossMm: number; litres: number; runMinutes: number | null; duration: string; flowLpm: number };
    critical: boolean;
    et0: number | null;
    etc: number | null;
    watering: { reading: number; moisture: number; litres: number; endedAt: string } | null;
  };
  risks: Risks;
  weather: WeatherSummary | null;
  weatherDaily: WeatherDay[];
  weatherError: string | null;
  solar: { hours: Array<{ time: string; predictedKw: number }>; usable: Array<{ time: string; predictedKw: number }>; start: string | null; end: string | null; activeNow: boolean } | null;
  forecast: MoistureForecast | null;
  ndvi: NdviSnapshot | null;
  devices: Device[];
  events: IrrigationEvent[];
  decisions: Decision[];
  schedules: Schedule[];
  series: HourlyPoint[];
}

export interface Recommendation {
  id: number;
  type: RecType;
  priority: Priority;
  title: string;
  message: string;
  status: "OPEN" | "DONE" | "DISMISSED";
  code: string | null;
  params: Record<string, string | number>;
  supportingFactors: string | null;
  expectedImpact: string | null;
  fieldId: number | null;
  fieldName: string;
  authorId: number | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ImpactTotals {
  litresSaved: number;
  litresUsed: number;
  kwhSaved: number;
  co2Kg: number;
  rupeesSaved: number;
  ureaKgSaved: number;
  measuredShare: number;
  savingPct: number;
}

export interface LedgerEntry {
  id: number;
  fieldId: number;
  kind: string | null;
  method: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  baselineWater: number | null;
  waterUsed: number | null;
  waterSaved: number | null;
  fertilizerReduced: number | null;
  kwhSaved: number | null;
  co2Kg: number | null;
  rupeesSaved: number | null;
  sourceRef: string | null;
  prevHash: string | null;
  hash: string | null;
  recordedAt: string;
}

export interface ImpactSummary {
  totals: ImpactTotals;
  monthly: Array<{ month: string; litresUsed: number; litresSaved: number; baseline: number; kwhSaved: number; co2Kg: number; rupeesSaved: number }>;
  fields: Array<{ fieldId: number; name: string; farmName: string; areaAcres: number; litresUsed: number; litresSaved: number; method: string; control: boolean; baseline: { method: string; depthMm: number; intervalDays: number } }>;
  pending: Array<{ fieldId: number; periodStart: string; periodEnd: string; elapsed: number; usedSoFar: number; savedSoFar: number }>;
  ledger: { entries: number; broken: number; verified: boolean; firstHash: string | null; lastHash: string | null };
  score: { value: number | null; parts: Array<{ key: string; label: string; value: number | null }> };
  farms: Array<{ id: number; name: string }>;
  entries: LedgerEntry[];
}

export interface DashboardField {
  id: number;
  name: string;
  farmId: number;
  farmName: string;
  areaAcres: number;
  crop: { name: string; stage: string | null; day: number | null; progress: number | null } | null;
  moisture: number | null;
  refillPoint: number;
  minutesSinceReading: number | null;
  cropHealth: number | null;
  waterStress: number | null;
  diseaseRisk: number | null;
  weatherRisk: number | null;
  action: { code: string; message: string; at: string } | null;
  device: Device | null;
}

export interface Dashboard {
  stats: { farms: number; fields: number; devices: number; devicesOnline: number; avgCropHealth: number | null; openAlerts: number };
  impact: { totals: ImpactTotals; score: number | null };
  weather: Array<{ farmId: number; farmName: string; summary?: WeatherSummary; daily?: WeatherDay[]; error?: string }>;
  healthTrend: Array<{ day: string; health: number | null; waterStress: number | null; diseaseRisk: number | null }>;
  fields: DashboardField[];
  sensor: { fieldId: number; fieldName: string; device: Device | null; latest: Observation | null; refillPoint: number; action: DashboardField["action"]; series: HourlyPoint[] } | null;
  recommendations: Recommendation[];
}

export interface DiseaseView {
  label: string | null;
  confidence: number;
  source: string | null;
  name: string;
  crop: string | null;
  healthy: boolean;
  pathogen: string | null;
  kind: string | null;
  spreadRisk: string | null;
  symptoms: string[];
  actions: string[];
  prevention: string[];
}

export interface Scan {
  id: number;
  fieldId: number;
  createdAt: string;
  imageUrl: string | null;
  mode: "disease" | "pest";
  lowConfidence: boolean;
  cropFiltered: boolean;
  affectedPct: number | null;
  yellowingPct: number | null;
  model: string | null;
  top: DiseaseView | null;
  alternatives: DiseaseView[];
  ai: {
    status: "pending" | "done" | "unavailable" | "failed";
    provider?: string;
    model?: string;
    isPlant?: boolean;
    crop?: string;
    diagnosis?: string;
    confidence?: number;
    agreesWithModel?: boolean;
    damagePct?: number;
    explanation?: string;
    actions?: string[];
    pest?: string | null;
  };
}

export interface FertilizerPlanPreview {
  source: string;
  crop: { key: string; name: string; dose: { n: number; p: number; k: number } };
  areaAcres: number;
  soil: { n: number; p: number; k: number; ph?: number | null; organicCarbon?: number | null };
  status: { n: string; p: string; k: string };
  required: { n: number; p: number; k: number };
  plan: { urea: number; dap: number; mop: number };
  blanket: { urea: number; dap: number; mop: number };
  cost: number;
  blanketCost: number;
  ureaSavedKg: number;
  savingRupees: number;
  schedule: Array<{ stage: string; day: number; date: string | null; urea: number; dap: number; mop: number }>;
  notes: string[];
}

export interface FertilizerPlan {
  id: number;
  fieldId: number;
  cropType: string;
  source: string;
  soilN: number;
  soilP: number;
  soilK: number;
  soilPh?: number | null;
  organicCarbon?: number | null;
  nStatus: string;
  pStatus: string;
  kStatus: string;
  ureaKg: number;
  dapKg: number;
  mopKg: number;
  blanketUreaKg: number;
  blanketDapKg: number;
  blanketMopKg: number;
  costRupees: number;
  blanketCostRupees: number;
  schedule: { schedule: FertilizerPlanPreview["schedule"]; notes: string[] };
  applied: boolean;
  appliedAt: string | null;
  createdAt: string;
}

export interface SoilCard {
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  ph: number | null;
  organicCarbon: number | null;
  ec: number | null;
  units: string;
  confidence: number;
  provider: string;
  model?: string;
}

export interface TrialPlot {
  fieldId: number;
  name: string;
  areaAcres: number;
  irrigations: number;
  litres: number;
  litresPerAcre: number;
  kwh: number;
  kwhPerAcre: number;
  measured: boolean;
  meanMoisture: number | null;
  series: Array<{ time: string; litresPerAcre: number }>;
}

export interface Trial {
  id: number;
  farmId: number;
  name: string;
  treatmentFieldId: number;
  controlFieldId: number;
  startDate: string;
  endDate: string | null;
  status: "ACTIVE" | "COMPLETED";
  treatmentYieldKg: number | null;
  controlYieldKg: number | null;
  notes: string | null;
  results: {
    days: number;
    treatment: TrialPlot | null;
    control: TrialPlot | null;
    savingPct: number | null;
    energySavingPct: number | null;
    yieldChangePct: number | null;
  };
}

export interface AdvisorFarm {
  farm: { id: number; name: string; location: string | null; latitude: number | null; longitude: number | null };
  access: Access;
  owner: { id: number; name: string; phone: string | null } | null;
  fields: Array<{ id: number; name: string; areaAcres: number; cropHealth: number | null; waterStress: number | null; diseaseRisk: number | null; weatherRisk: number | null; moisture: number | null; minutesSinceReading: number | null }>;
  openAlerts: number;
  criticalAlerts: number;
  topAlerts: Recommendation[];
  waterSavedL: number;
  rupeesSaved: number;
  worstRisk: number;
}

export interface AppNotification {
  id: number;
  userId: number;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  link: string | null;
  fieldId: number | null;
  channels: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  provider: string | null;
  createdAt: string;
}

export interface AiStatus {
  available: boolean;
  providers: Array<{ provider: string; configured: boolean; textModel: string | null; visionModel: string | null; error: string | null }>;
}

export interface CropOption {
  key: string;
  name: string;
  dose: { n: number; p: number; k: number };
  seasonDays: number;
}

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ValidationRatio {
  correct: number;
  n: number;
  pct: number | null;
  ci95?: [number, number];
}

export interface ReplaySide {
  irrigations: number;
  litres: number;
  kwh: number;
  rupees: number;
  co2Kg: number;
  stressDays?: number;
  stressFieldDays?: number;
  actualEtPctOfEtc: number;
}

export interface ReplaySaved {
  litres: number;
  pct: number;
  kwh: number;
  rupees: number;
  co2Kg: number;
}

export interface ReplayTotal {
  fields: string[];
  agriguard: ReplaySide;
  rainBlindWeekly: ReplaySide;
  saved: ReplaySaved;
  excludedFields: Array<{ fieldId: number; field: string; reason: string }>;
}

export interface SeasonReplay {
  generatedAt: string;
  label: string;
  source: { dataset: string; model: string; attribution: string };
  fields: Array<{
    fieldId: number;
    field: string;
    farm: string;
    trialControl: boolean;
    includedInTotals: boolean;
    inConservativeHeadline: boolean;
    crop: { name: string; key: string };
    irrigation: { method: string };
    season: { year: number; planted: string; lastDay: string };
    agriguard: ReplaySide;
    rainBlindWeekly: ReplaySide;
    saved: ReplaySaved;
  }>;
  totals: { conservative: ReplayTotal; allFields: ReplayTotal };
}

export interface ValidationSummary {
  tests: { ranAt: string; total: number; passed: number; failed: number; suites: string[] } | null;
  diseaseModel: {
    generatedAt: string;
    dataset: { name: string; citation: string; url: string; license: string; split: string; imagesEvaluated: number; classesEvaluated: number; labelConflicts: number };
    model: { id: string; dtype: string };
    metrics: {
      noCrop: { top1: ValidationRatio; top3: ValidationRatio };
      cropFiltered: { top1: ValidationRatio; top3: ValidationRatio };
      multiLabelCrops: { images: number; top1: ValidationRatio; top3: ValidationRatio } | null;
      lowConfidence: { confident: ValidationRatio; flagged: ValidationRatio; shareFlaggedLow: number };
    };
    perCrop: Array<{ crop: string; cropKey: string; n: number; labels: number; noCropTop1: ValidationRatio; cropFilteredTop1: ValidationRatio; cropFilteredTop3: ValidationRatio }>;
    gemini: { model: string; imagesEvaluated: number; stoppedEarly: string | null };
    notes: string[];
  } | null;
  seasonReplay: SeasonReplay | null;
}

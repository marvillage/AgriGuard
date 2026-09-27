import { clearAuth, getToken } from "./auth";
import type {
  AdvisorFarm,
  AiStatus,
  ApiError,
  ApiSuccess,
  AppNotification,
  AuthResponse,
  ChatMessage,
  Crop,
  CropOption,
  Dashboard,
  Decision,
  Device,
  Farm,
  FarmWithFields,
  FertilizerPlan,
  FertilizerPlanPreview,
  Field,
  FieldOverview,
  HourlyPoint,
  ImpactSummary,
  IrrigationEvent,
  LatLng,
  MoistureForecast,
  NdviSnapshot,
  Observation,
  RawReading,
  Recommendation,
  Scan,
  Schedule,
  SoilCard,
  Trial,
  User,
  ValidationSummary,
  WeatherDay,
  WeatherSummary,
} from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

let currentLanguage = "en";

export function setApiLanguage(language: string) {
  currentLanguage = language;
}

export function assetUrl(path: string | null | undefined) {
  if (!path) return null;
  return path.startsWith("http") ? path : `${API_URL}${path}`;
}

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  headers.set("X-Language", currentLanguage);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiRequestError("Cannot reach the AgriGuard server. Check your connection.", 0);
  }

  const payload = (await response.json().catch(() => ({ success: false, message: `HTTP ${response.status}` }))) as ApiSuccess<T> | ApiError;

  if (!response.ok || !payload.success) {
    if (response.status === 401) {
      clearAuth();
    }

    throw new ApiRequestError(
      payload.success ? "Request failed" : payload.message,
      response.status
    );
  }

  return payload.data;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

export async function download(path: string, filename: string) {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}`, "X-Language": currentLanguage } : {},
  });
  if (!response.ok) throw new ApiRequestError(`Download failed (${response.status})`, response.status);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export type FarmInput = Partial<Pick<Farm, "name" | "location" | "description" | "latitude" | "longitude" | "irrigationMethod" | "baselineDepthMm" | "baselineIntervalDays" | "electricityRate" | "solarCapacityKw">>;
export type FieldInput = Partial<Omit<Field, "id" | "farmId" | "createdAt" | "updatedAt" | "boundary">> & { boundary?: LatLng[] | null };

export const api = {
  register: (body: { name: string; email: string; password: string; role?: "FARMER" | "AGRONOMIST"; phone?: string; language?: string }) =>
    request<AuthResponse>("/api/auth/register", json("POST", body)),

  login: (body: { email: string; password: string }) =>
    request<AuthResponse>("/api/auth/login", json("POST", body)),

  me: () => request<{ user: User }>("/api/auth/me"),

  updateMe: (body: Partial<Pick<User, "name" | "phone" | "language" | "smsAlerts" | "whatsappAlerts" | "pushAlerts" | "dailyBriefing">>) =>
    request<{ user: User }>("/api/auth/me", json("PATCH", body)),

  listFarms: () => request<{ farms: Farm[] }>("/api/farms"),

  getFarm: (farmId: number) =>
    request<{ farm: FarmWithFields }>(`/api/farms/${farmId}`),

  createFarm: (body: FarmInput & { name: string }) =>
    request<{ farm: Farm }>("/api/farms", json("POST", body)),

  updateFarm: (farmId: number, body: FarmInput) =>
    request<{ farm: Farm }>(`/api/farms/${farmId}`, json("PATCH", body)),

  deleteFarm: (farmId: number) =>
    request<null>(`/api/farms/${farmId}`, { method: "DELETE" }),

  listFields: (farmId: number) =>
    request<{ fields: Field[] }>(`/api/farms/${farmId}/fields`),

  getField: (farmId: number, fieldId: number) =>
    request<{ field: Field }>(`/api/farms/${farmId}/fields/${fieldId}`),

  createField: (farmId: number, body: FieldInput & { name: string; area: number }) =>
    request<{ field: Field }>(`/api/farms/${farmId}/fields`, json("POST", body)),

  updateField: (farmId: number, fieldId: number, body: FieldInput) =>
    request<{ field: Field }>(`/api/farms/${farmId}/fields/${fieldId}`, json("PATCH", body)),

  deleteField: (farmId: number, fieldId: number) =>
    request<null>(`/api/farms/${farmId}/fields/${fieldId}`, { method: "DELETE" }),

  fieldOverview: (fieldId: number) =>
    request<FieldOverview>(`/api/fields/${fieldId}/overview`),

  patchField: (fieldId: number, body: FieldInput) =>
    request<{ field: Field }>(`/api/fields/${fieldId}`, json("PATCH", body)),

  analyzeField: (fieldId: number) =>
    request<{ action: string }>(`/api/fields/${fieldId}/analyze`, json("POST")),

  observations: (fieldId: number, hours = 48) =>
    request<{ hourly: HourlyPoint[]; latest: Observation | null; count: number }>(`/api/fields/${fieldId}/observations?hours=${hours}`),

  rawObservations: (fieldId: number, options: { before?: string; limit?: number; source?: Observation["source"] } = {}) => {
    const params = new URLSearchParams();
    if (options.before) params.set("before", options.before);
    if (options.limit) params.set("limit", String(options.limit));
    if (options.source) params.set("source", options.source);
    const query = params.toString();
    return request<{ readings: RawReading[]; hasMore: boolean }>(`/api/fields/${fieldId}/observations/raw${query ? `?${query}` : ""}`);
  },

  addObservation: (fieldId: number, body: Partial<Pick<Observation, "soilMoisture" | "temperature" | "humidity" | "rainfall" | "nitrogen" | "phosphorus" | "potassium" | "notes">>) =>
    request<{ observation: Observation }>(`/api/fields/${fieldId}/observations`, json("POST", body)),

  moistureForecast: (fieldId: number) =>
    request<{ forecast: MoistureForecast | null }>(`/api/fields/${fieldId}/forecast`),

  crops: (fieldId: number) => request<{ crops: Crop[] }>(`/api/fields/${fieldId}/crops`),

  plantCrop: (fieldId: number, body: { cropType: string; variety?: string; season?: string; plantingDate: string }) =>
    request<{ crop: Crop }>(`/api/fields/${fieldId}/crops`, json("POST", body)),

  harvestCrop: (fieldId: number, cropId: number, body: { yieldKg?: number | null; harvestDate?: string; notes?: string }) =>
    request<{ crop: Crop }>(`/api/fields/${fieldId}/crops/${cropId}/harvest`, json("PATCH", body)),

  setPump: (fieldId: number, body: { mode: "AUTO" | "MANUAL_ON" | "MANUAL_OFF"; minutes?: number; deviceId?: number }) =>
    request<{ device: Device }>(`/api/fields/${fieldId}/pump`, json("POST", body)),

  events: (fieldId: number) => request<{ events: IrrigationEvent[] }>(`/api/fields/${fieldId}/events`),

  decisions: (fieldId: number) => request<{ decisions: Decision[] }>(`/api/fields/${fieldId}/decisions`),

  schedules: (fieldId: number) => request<{ schedules: Schedule[] }>(`/api/fields/${fieldId}/schedules`),

  createSchedule: (fieldId: number, body: { startTime: string; durationMinutes: number; days: string; mode: "SMART" | "FIXED" }) =>
    request<{ schedule: Schedule }>(`/api/fields/${fieldId}/schedules`, json("POST", body)),

  updateSchedule: (fieldId: number, scheduleId: number, body: Partial<Pick<Schedule, "enabled" | "startTime" | "durationMinutes" | "days" | "mode">>) =>
    request<{ schedule: Schedule }>(`/api/fields/${fieldId}/schedules/${scheduleId}`, json("PATCH", body)),

  deleteSchedule: (fieldId: number, scheduleId: number) =>
    request<null>(`/api/fields/${fieldId}/schedules/${scheduleId}`, { method: "DELETE" }),

  devices: () => request<{ devices: Device[] }>("/api/devices"),

  fieldDevices: (fieldId: number) => request<{ devices: Device[] }>(`/api/fields/${fieldId}/devices`),

  registerDevice: (fieldId: number, body: { name: string; simulated?: boolean; tankHeightCm?: number; tankCapacityL?: number; dryRunLevelPct?: number }) =>
    request<{ device: Device }>(`/api/fields/${fieldId}/devices`, json("POST", body)),

  updateDevice: (deviceId: number, body: Partial<Pick<Device, "name" | "tankHeightCm" | "tankCapacityL" | "dryRunLevelPct" | "hasFlowMeter" | "hasEnergyMeter" | "hasTankSensor" | "hasSolar">>) =>
    request<{ device: Device }>(`/api/devices/${deviceId}`, json("PATCH", body)),

  deviceKey: (deviceId: number) => request<{ device: Device }>(`/api/devices/${deviceId}/key`),

  rotateDeviceKey: (deviceId: number) => request<{ device: Device }>(`/api/devices/${deviceId}/rotate-key`, json("POST")),

  deleteDevice: (deviceId: number) => request<null>(`/api/devices/${deviceId}`, { method: "DELETE" }),

  fertilizerPlans: (fieldId: number) => request<{ plans: FertilizerPlan[] }>(`/api/fields/${fieldId}/fertilizer-plans`),

  previewFertilizer: (fieldId: number, body: { cropKey?: string; source?: string; soil?: { n: number; p: number; k: number; ph?: number | null; organicCarbon?: number | null } }) =>
    request<{ plan: FertilizerPlanPreview }>(`/api/fields/${fieldId}/fertilizer/preview`, json("POST", body)),

  saveFertilizer: (fieldId: number, body: { cropKey?: string; source?: string; soil?: { n: number; p: number; k: number; ph?: number | null; organicCarbon?: number | null } }) =>
    request<{ plan: FertilizerPlan }>(`/api/fields/${fieldId}/fertilizer-plans`, json("POST", body)),

  markFertilizerApplied: (fieldId: number, planId: number) =>
    request<{ plan: FertilizerPlan }>(`/api/fields/${fieldId}/fertilizer-plans/${planId}/applied`, json("POST")),

  readSoilCard: (fieldId: number, image: File) => {
    const form = new FormData();
    form.append("image", image);
    return request<{ card: SoilCard }>(`/api/fields/${fieldId}/soil-card`, { method: "POST", body: form });
  },

  ndvi: (fieldId: number) => request<{ snapshots: NdviSnapshot[] }>(`/api/fields/${fieldId}/ndvi`),

  refreshNdvi: (fieldId: number) => request<{ snapshot: NdviSnapshot }>(`/api/fields/${fieldId}/ndvi`, json("POST")),

  fieldReport: (fieldId: number) =>
    request<{ report: { stats: Record<string, unknown>; daily: string[]; text: string | null; provider: string } }>(`/api/fields/${fieldId}/report`),

  addNote: (fieldId: number, body: { title: string; message: string; priority: string; type?: string }) =>
    request<{ recommendation: Recommendation }>(`/api/fields/${fieldId}/notes`, json("POST", body)),

  dashboard: () => request<Dashboard>("/api/dashboard"),

  recommendations: (filters: { status?: string; type?: string; fieldId?: number; limit?: number } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value !== undefined && params.set(key, String(value)));
    return request<{ recommendations: Recommendation[] }>(`/api/recommendations?${params}`);
  },

  setRecommendationStatus: (id: number, status: "OPEN" | "DONE" | "DISMISSED") =>
    request<{ recommendation: Recommendation }>(`/api/recommendations/${id}`, json("PATCH", { status })),

  explainRecommendation: (id: number) =>
    request<{ explanation: { text: string; provider: string } }>(`/api/recommendations/${id}/explain`),

  explainField: (fieldId: number, topic: "irrigation" | "risk" | "fertilizer" | "ndvi", options: { planId?: number; snapshotId?: number } = {}) => {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => value !== undefined && params.set(key, String(value)));
    const query = params.toString();
    return request<{ explanation: { text: string; provider: string } }>(`/api/fields/${fieldId}/explain/${topic}${query ? `?${query}` : ""}`);
  },

  explainScan: (id: number) => request<{ explanation: { text: string; provider: string } }>(`/api/scans/${id}/explain`),

  impact: (farmId?: number) => request<ImpactSummary>(`/api/impact${farmId ? `?farmId=${farmId}` : ""}`),

  validation: () => request<ValidationSummary>("/api/validation"),

  scans: (fieldId?: number) => request<{ scans: Scan[] }>(`/api/scans${fieldId ? `?fieldId=${fieldId}` : ""}`),

  scan: (id: number) => request<{ scan: Scan }>(`/api/scans/${id}`),

  createScan: (body: { image: File; fieldId: number; cropKey?: string; mode?: "disease" | "pest" }) => {
    const form = new FormData();
    form.append("image", body.image);
    form.append("fieldId", String(body.fieldId));
    if (body.cropKey) form.append("cropKey", body.cropKey);
    form.append("mode", body.mode ?? "disease");
    return request<{ scan: Scan }>("/api/scans", { method: "POST", body: form });
  },

  chat: (message: string, language?: string) =>
    request<{ answer: string; provider: string; id: number }>("/api/copilot/chat", json("POST", { message, language })),

  chatHistory: () => request<{ messages: ChatMessage[] }>("/api/copilot/history"),

  clearChat: () => request<null>("/api/copilot/history", { method: "DELETE" }),

  aiStatus: () => request<AiStatus>("/api/ai/status"),

  translate: (text: string, language: string) =>
    request<{ text: string; provider: string }>("/api/ai/translate", json("POST", { text, language })),

  briefing: () => request<{ briefing: { title: string; text: string; provider: string } }>("/api/ai/briefing"),

  notifications: () => request<{ notifications: AppNotification[]; unread: number }>("/api/notifications"),

  markNotificationsRead: (id?: number) => request<null>("/api/notifications/read", json("POST", { id })),

  notificationChannels: () => request<{ sms: boolean; whatsapp: boolean; push: boolean }>("/api/notifications/channels"),

  testNotification: () => request<{ notification: AppNotification }>("/api/notifications/test", json("POST")),

  pushPublicKey: () => request<{ publicKey: string }>("/api/push/public-key"),

  pushSubscribe: (subscription: PushSubscriptionJSON) =>
    request<null>("/api/push/subscribe", json("POST", { subscription })),

  pushUnsubscribe: (endpoint: string) => request<null>("/api/push/unsubscribe", json("POST", { endpoint })),

  farmWeather: (farmId: number) =>
    request<{ summary: WeatherSummary; daily: WeatherDay[]; solar: FieldOverview["solar"] }>(`/api/farms/${farmId}/weather`),

  geocode: (query: string) =>
    request<{ results: Array<{ name: string; latitude: number; longitude: number; countryCode: string | null }> }>(`/api/geocode?q=${encodeURIComponent(query)}`),

  trials: (farmId: number) => request<{ trials: Trial[] }>(`/api/farms/${farmId}/trials`),

  createTrial: (farmId: number, body: { name: string; treatmentFieldId: number; controlFieldId: number; startDate?: string; notes?: string }) =>
    request<{ trial: Trial }>(`/api/farms/${farmId}/trials`, json("POST", body)),

  updateTrial: (trialId: number, body: Partial<Pick<Trial, "status" | "treatmentYieldKg" | "controlYieldKg" | "notes">>) =>
    request<{ trial: Trial }>(`/api/trials/${trialId}`, json("PATCH", body)),

  deleteTrial: (trialId: number) => request<null>(`/api/trials/${trialId}`, { method: "DELETE" }),

  shareFarm: (farmId: number) => request<{ shareCode: string }>(`/api/farms/${farmId}/share`, json("POST")),

  resetShareCode: (farmId: number) => request<{ shareCode: string }>(`/api/farms/${farmId}/share/reset`, json("POST")),

  advisors: (farmId: number) =>
    request<{ advisors: Array<{ id: number; name: string; email: string; role: string; since: string | null }> }>(`/api/farms/${farmId}/advisors`),

  removeAdvisor: (farmId: number, advisorId: number) =>
    request<null>(`/api/farms/${farmId}/advisors/${advisorId}`, { method: "DELETE" }),

  joinFarm: (code: string) => request<{ farmId: number; name: string }>("/api/advisor/join", json("POST", { code })),

  advisorOverview: () => request<{ farms: AdvisorFarm[] }>("/api/advisor/overview"),

  cropOptions: () =>
    request<{ crops: CropOption[]; scanCrops: Array<{ key: string; name: string }>; soils: Array<{ key: string; name: string; label: string; fieldCapacity: number; wiltingPoint: number }> }>("/api/meta/crops"),
};

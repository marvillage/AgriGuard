import { AppError } from "../utils/AppError.js";

const forecastUrl = "https://api.open-meteo.com/v1/forecast";
const geocodeUrl = "https://geocoding-api.open-meteo.com/v1/search";
const cacheTtlMs = 30 * 60 * 1000;

const hourlyVars = [
  "temperature_2m",
  "relative_humidity_2m",
  "precipitation",
  "precipitation_probability",
  "shortwave_radiation",
  "wind_speed_10m",
  "et0_fao_evapotranspiration",
] as const;

const dailyVars = [
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "et0_fao_evapotranspiration",
  "shortwave_radiation_sum",
  "wind_speed_10m_max",
  "sunrise",
  "sunset",
] as const;

export interface HourlyPoint {
  time: string;
  temperature: number;
  humidity: number;
  rainMm: number;
  rainProbability: number;
  radiation: number;
  windKmh: number;
  et0: number;
}

export interface DailyPoint {
  date: string;
  tempMax: number;
  tempMin: number;
  rainMm: number;
  rainProbability: number;
  et0: number;
  radiationMj: number;
  windMaxKmh: number;
  sunrise: string;
  sunset: string;
}

export interface Forecast {
  latitude: number;
  longitude: number;
  timezone: string;
  utcOffsetSeconds: number;
  fetchedAt: string;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
}

const cache = new Map<string, { at: number; value: Forecast }>();

export async function getForecast(latitude: number, longitude: number, pastDays = 2): Promise<Forecast> {
  const key = `${latitude.toFixed(2)},${longitude.toFixed(2)},${pastDays}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < cacheTtlMs) return hit.value;

  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    hourly: hourlyVars.join(","),
    daily: dailyVars.join(","),
    timezone: "auto",
    forecast_days: "7",
    past_days: String(pastDays),
    timeformat: "unixtime",
  });

  const response = await fetchWithTimeout(`${forecastUrl}?${params}`);
  if (!response.ok) throw new AppError(`Weather service error (${response.status})`, 502);
  const body = (await response.json()) as {
    timezone: string;
    utc_offset_seconds: number;
    hourly: Record<string, number[]>;
    daily: Record<string, number[]>;
  };

  const hourlyTime = body.hourly.time ?? [];
  const hourly = hourlyTime.map((unix, index) => ({
    time: new Date(unix * 1000).toISOString(),
    temperature: body.hourly.temperature_2m?.[index] ?? 0,
    humidity: body.hourly.relative_humidity_2m?.[index] ?? 0,
    rainMm: body.hourly.precipitation?.[index] ?? 0,
    rainProbability: body.hourly.precipitation_probability?.[index] ?? 0,
    radiation: body.hourly.shortwave_radiation?.[index] ?? 0,
    windKmh: body.hourly.wind_speed_10m?.[index] ?? 0,
    et0: body.hourly.et0_fao_evapotranspiration?.[index] ?? 0,
  }));

  const dailyTime = body.daily.time ?? [];
  const daily = dailyTime.map((unix, index) => ({
    date: new Date((unix + body.utc_offset_seconds) * 1000).toISOString().slice(0, 10),
    tempMax: body.daily.temperature_2m_max?.[index] ?? 0,
    tempMin: body.daily.temperature_2m_min?.[index] ?? 0,
    rainMm: body.daily.precipitation_sum?.[index] ?? 0,
    rainProbability: body.daily.precipitation_probability_max?.[index] ?? 0,
    et0: body.daily.et0_fao_evapotranspiration?.[index] ?? 0,
    radiationMj: body.daily.shortwave_radiation_sum?.[index] ?? 0,
    windMaxKmh: body.daily.wind_speed_10m_max?.[index] ?? 0,
    sunrise: new Date((body.daily.sunrise?.[index] ?? 0) * 1000).toISOString(),
    sunset: new Date((body.daily.sunset?.[index] ?? 0) * 1000).toISOString(),
  }));

  const value: Forecast = {
    latitude,
    longitude,
    timezone: body.timezone,
    utcOffsetSeconds: body.utc_offset_seconds,
    fetchedAt: new Date().toISOString(),
    hourly,
    daily,
  };
  cache.set(key, { at: Date.now(), value });
  return value;
}

export function summarizeForecast(forecast: Forecast, now = new Date()) {
  const future = forecast.hourly.filter((point) => new Date(point.time) >= new Date(now.getTime() - 3600 * 1000));
  const next24 = future.slice(0, 24);
  const next48 = future.slice(0, 48);
  const past24 = forecast.hourly.filter(
    (point) => new Date(point.time) < now && new Date(point.time) >= new Date(now.getTime() - 24 * 3600 * 1000)
  );
  const localToday = new Date(now.getTime() + forecast.utcOffsetSeconds * 1000).toISOString().slice(0, 10);
  const upcomingDays = forecast.daily.filter((day) => day.date >= localToday);
  const today = upcomingDays[0];

  return {
    rainNext24Mm: round(sum(next24.map((point) => point.rainMm))),
    rainNext48Mm: round(sum(next48.map((point) => point.rainMm))),
    rainProbabilityNext24: Math.max(0, ...next24.map((point) => point.rainProbability)),
    rainPast24Mm: round(sum(past24.map((point) => point.rainMm))),
    et0Today: round(today?.et0 ?? 0),
    tempNow: next24[0]?.temperature ?? null,
    humidityNow: next24[0]?.humidity ?? null,
    maxTempNext3Days: Math.max(-99, ...upcomingDays.slice(0, 3).map((day) => day.tempMax)),
    heaviestRainDay: upcomingDays.reduce<DailyPoint | null>(
      (best, day) => (!best || day.rainMm > best.rainMm ? day : best),
      null
    ),
    maxWindNext3Days: Math.max(0, ...upcomingDays.slice(0, 3).map((day) => day.windMaxKmh)),
    humidHoursPast24: past24.filter((point) => point.humidity >= 90).length,
    humidHoursNext24: next24.filter((point) => point.humidity >= 90).length,
    meanTempNext24: next24.length ? round(sum(next24.map((point) => point.temperature)) / next24.length) : null,
  };
}

// Hours in the next day where predicted PV output covers the pump load.
export function solarWindow(forecast: Forecast, capacityKw: number, pumpKw: number, now = new Date()) {
  const upcoming = forecast.hourly
    .filter((point) => new Date(point.time) >= new Date(now.getTime() - 3600 * 1000))
    .slice(0, 36);
  const hours = upcoming.map((point) => ({
    time: point.time,
    predictedKw: round((capacityKw * point.radiation * 0.8) / 1000, 2),
  }));
  const firstIndex = hours.findIndex((hour) => hour.predictedKw >= pumpKw);
  const block: typeof hours = [];
  if (firstIndex >= 0) {
    for (let index = firstIndex; index < hours.length && hours[index].predictedKw >= pumpKw; index += 1) {
      block.push(hours[index]);
    }
  }
  const nowMs = now.getTime();
  return {
    hours,
    usable: block,
    start: block[0]?.time ?? null,
    end: block.length ? new Date(new Date(block[block.length - 1].time).getTime() + 3600 * 1000).toISOString() : null,
    activeNow: block.some((hour) => nowMs >= new Date(hour.time).getTime() && nowMs < new Date(hour.time).getTime() + 3600 * 1000),
  };
}

export async function geocode(query: string) {
  const params = new URLSearchParams({ name: query, count: "5", language: "en", format: "json" });
  const response = await fetchWithTimeout(`${geocodeUrl}?${params}`);
  if (!response.ok) return [];
  const body = (await response.json()) as {
    results?: Array<{ name: string; latitude: number; longitude: number; admin1?: string; country?: string; country_code?: string }>;
  };
  return (body.results ?? []).map((item) => ({
    name: [item.name, item.admin1, item.country].filter(Boolean).join(", "),
    latitude: item.latitude,
    longitude: item.longitude,
    countryCode: item.country_code ?? null,
  }));
}

export async function geocodeBest(location: string) {
  const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
  for (const candidate of [location, ...parts]) {
    const results = await geocode(candidate);
    const indian = results.find((result) => result.countryCode === "IN");
    if (indian ?? results[0]) return indian ?? results[0];
  }
  return null;
}

export interface SoilPoint {
  time: string;
  soilMoisture: number | null;
  soilTemperature: number | null;
  temperature: number | null;
  humidity: number | null;
  rainMm: number | null;
}

// Modelled soil state for a location from the Open-Meteo forecast API (best-match model).
// Soil moisture is the 9-27 cm root-zone layer converted from m3/m3 to % by volume; only completed hours are returned.
export async function getSoilHistory(latitude: number, longitude: number, pastDays: number): Promise<SoilPoint[]> {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    hourly: "soil_moisture_9_to_27cm,soil_temperature_6cm,temperature_2m,relative_humidity_2m,precipitation",
    past_days: String(Math.min(92, Math.max(1, Math.round(pastDays)))),
    forecast_days: "1",
    timezone: "auto",
    timeformat: "unixtime",
  });
  const response = await fetchWithTimeout(`${forecastUrl}?${params}`);
  if (!response.ok) throw new AppError(`Weather service error (${response.status})`, 502);
  const body = (await response.json()) as { hourly: Record<string, Array<number | null>> };
  const value = (name: string, index: number, scale = 1) => {
    const raw = body.hourly[name]?.[index];
    return raw === null || raw === undefined ? null : Math.round(raw * scale * 10) / 10;
  };
  const completedBefore = Date.now() - 3600000;
  return (body.hourly.time ?? [])
    .map((unix, index) => ({
      time: new Date(Number(unix) * 1000).toISOString(),
      soilMoisture: value("soil_moisture_9_to_27cm", index, 100),
      soilTemperature: value("soil_temperature_6cm", index),
      temperature: value("temperature_2m", index),
      humidity: value("relative_humidity_2m", index),
      rainMm: value("precipitation", index),
    }))
    .filter((point) => new Date(point.time).getTime() <= completedBefore && point.soilMoisture !== null);
}

async function fetchWithTimeout(url: string, ms = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch {
    throw new AppError("Weather service is unreachable", 502);
  } finally {
    clearTimeout(timer);
  }
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

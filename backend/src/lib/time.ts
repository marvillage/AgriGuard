import { env } from "../config/env.js";

// Postgres returns timestamptz as text like "2026-09-26 01:29:10.365276+05:30".
export function parseTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const iso = value
    .replace(" ", "T")
    .replace(/(\.\d{3})\d+/, "$1")
    .replace(/([+-]\d{2})$/, "$1:00");
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toIso(value: string | null | undefined) {
  return parseTimestamp(value)?.toISOString() ?? null;
}

export function hoursAgo(hours: number, from = new Date()) {
  return new Date(from.getTime() - hours * 3600 * 1000);
}

export function daysAgo(days: number, from = new Date()) {
  return new Date(from.getTime() - days * 86400 * 1000);
}

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: env.timezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: env.timezone,
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

export function dayKey(date: Date) {
  return dayFormatter.format(date);
}

export function monthKey(date: Date) {
  return dayKey(date).slice(0, 7);
}

export function localClock(date = new Date()) {
  const parts = Object.fromEntries(partsFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return {
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    isoWeekday: weekdays.indexOf(parts.weekday ?? "Mon") + 1,
  };
}

// Start of a local calendar day (app timezone) as a UTC Date.
export function startOfLocalDay(key: string) {
  const probe = new Date(`${key}T12:00:00Z`);
  const offsetMinutes = timezoneOffsetMinutes(probe);
  return new Date(Date.parse(`${key}T00:00:00Z`) - offsetMinutes * 60 * 1000);
}

function timezoneOffsetMinutes(date: Date) {
  const local = new Date(date.toLocaleString("en-US", { timeZone: env.timezone }));
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  return Math.round((local.getTime() - utc.getTime()) / 60000);
}

export function addDays(key: string, days: number) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

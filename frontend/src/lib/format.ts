import { translate } from "@/i18n/provider";
import type { Language } from "./types";

// Postgres timestamptz text ("2026-09-26 01:29:10.36+05:30") or ISO strings.
export function toDate(value: string | null | undefined) {
  if (!value) return null;
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (day) return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
  const iso = value.includes("T") ? value : value.replace(" ", "T").replace(/(\.\d{3})\d+/, "$1").replace(/([+-]\d{2})$/, "$1:00");
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function timeAgo(value: string | null | undefined, language: Language = "en") {
  const date = toDate(value);
  if (!date) return "–";
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return translate(language, "common.justNow");
  if (minutes < 60) return translate(language, "common.minutesAgo", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 48) return translate(language, "common.hoursAgo", { count: hours });
  return translate(language, "common.daysAgo", { count: Math.round(hours / 24) });
}

export function locale(language: Language) {
  return language === "en" ? "en-IN" : `${language}-IN-u-nu-latn`;
}

export function formatDate(value: string | null | undefined, language: Language = "en", options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat(locale(language), options).format(date) : "–";
}

export function formatTime(value: string | null | undefined, language: Language = "en") {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat(locale(language), { hour: "numeric", minute: "2-digit" }).format(date) : "–";
}

export function formatNumber(value: number | null | undefined, digits = 0, language: Language = "en") {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  return new Intl.NumberFormat(locale(language), { maximumFractionDigits: digits }).format(value);
}

export function formatLitres(litres: number | null | undefined, language: Language = "en") {
  if (litres === null || litres === undefined) return "–";
  if (litres >= 1e7) return `${formatNumber(litres / 1e7, 1, language)} crore L`;
  if (litres >= 1e5) return `${formatNumber(litres / 1e5, 1, language)} lakh L`;
  return `${formatNumber(litres, 0, language)} L`;
}

export function formatRupees(value: number | null | undefined, language: Language = "en") {
  if (value === null || value === undefined) return "–";
  if (Math.abs(value) >= 1e5) return `₹${formatNumber(value / 1e5, 1, language)} lakh`;
  return `₹${formatNumber(value, 0, language)}`;
}

export function formatCo2(kg: number | null | undefined, language: Language = "en") {
  if (kg === null || kg === undefined) return "–";
  return kg >= 1000 ? `${formatNumber(kg / 1000, 1, language)} t` : `${formatNumber(kg, 1, language)} kg`;
}

export function levelTone(level: string | null | undefined) {
  if (level === "High") return "critical" as const;
  if (level === "Moderate") return "warning" as const;
  if (level === "Low") return "good" as const;
  return "navy" as const;
}

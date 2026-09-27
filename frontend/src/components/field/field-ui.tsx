import type { ComponentProps, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { ApiRequestError } from "@/lib/api";
import { locale } from "@/lib/format";
import type { Language, Level } from "@/lib/types";
import { cn } from "@/lib/utils";

export type BadgeVariant = ComponentProps<typeof Badge>["variant"];

export const selectClass =
  "flex h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm text-ink transition-all hover:border-slate-300 focus-visible:border-sun-400 focus-visible:ring-4 focus-visible:ring-sun-400/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

// Server faults (5xx) carry raw database text, so show the friendly fallback instead.
export function clientErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiRequestError && error.status < 500 ? error.message : fallback;
}

export function levelVariant(level: Level | string | null | undefined): BadgeVariant {
  if (level === "High") return "danger";
  if (level === "Moderate") return "warning";
  if (level === "Low") return "success";
  return "secondary";
}

export function levelKey(level: Level | string | null | undefined) {
  if (level === "High") return "common.high" as const;
  if (level === "Moderate") return "common.moderate" as const;
  if (level === "Medium") return "common.medium" as const;
  if (level === "Low") return "common.low" as const;
  return "common.unknown" as const;
}

// Weather days arrive as plain "YYYY-MM-DD"; parse them as local dates.
export function dayDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function formatDay(value: string, language: Language, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale(language), options).format(dayDate(value));
}

export function formatMs(value: number, language: Language, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale(language), options).format(new Date(value));
}

export function formatFixed(value: number, digits: number, language: Language) {
  return new Intl.NumberFormat(locale(language), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

// Ticks on local clock boundaries (every 6 h, 12 h or at midnight) between two timestamps.
export function alignedTicks(start: number, end: number, stepHours: number) {
  const ticks: number[] = [];
  const cursor = new Date(start);
  cursor.setMinutes(0, 0, 0);
  cursor.setHours(Math.ceil((cursor.getHours() + 0.01) / stepHours) * stepHours);
  while (cursor.getTime() < end) {
    ticks.push(cursor.getTime());
    cursor.setHours(cursor.getHours() + stepHours);
  }
  return ticks;
}

export function localIsoDate(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function InfoRow({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-2", className)}>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-semibold text-ink tabular-nums">{value}</dd>
    </div>
  );
}

export function SectionTitle({ icon, title, action }: { icon?: ReactNode; title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-ink">
        {icon}
        {title}
      </h3>
      {action}
    </div>
  );
}

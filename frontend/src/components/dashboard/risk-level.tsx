"use client";

import { CircleAlert, CircleCheck, CircleHelp, TriangleAlert, type LucideIcon } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import type { Level } from "@/lib/types";
import { cn } from "@/lib/utils";

export function levelFromScore(score: number | null | undefined): Level | null {
  if (score === null || score === undefined) return null;
  if (score >= 65) return "High";
  if (score >= 35) return "Moderate";
  return "Low";
}

export const levelStyle: Record<Level, { chip: string; icon: LucideIcon; label: "common.low" | "common.moderate" | "common.high" }> = {
  Low: { chip: "bg-emerald-50 text-emerald-800 ring-emerald-200", icon: CircleCheck, label: "common.low" },
  Moderate: { chip: "bg-amber-50 text-amber-800 ring-amber-200", icon: CircleAlert, label: "common.moderate" },
  High: { chip: "bg-red-50 text-red-700 ring-red-200", icon: TriangleAlert, label: "common.high" },
};

export type HealthStatus = "healthy" | "watch" | "atRisk";

export function healthStatus(score: number | null | undefined): HealthStatus | null {
  if (score === null || score === undefined) return null;
  if (score >= 75) return "healthy";
  if (score >= 50) return "watch";
  return "atRisk";
}

export const healthStyle: Record<HealthStatus, { icon: LucideIcon; ring: string; badge: "success" | "warning" | "danger"; label: "risk.healthy" | "risk.watch" | "risk.atRisk" }> = {
  healthy: { icon: CircleCheck, ring: "#059669", badge: "success", label: "risk.healthy" },
  watch: { icon: CircleAlert, ring: "#f59e0b", badge: "warning", label: "risk.watch" },
  atRisk: { icon: TriangleAlert, ring: "#dc2626", badge: "danger", label: "risk.atRisk" },
};

export function RiskChip({ icon: Icon, label, score }: { icon: LucideIcon; label: string; score: number | null | undefined }) {
  const { t } = useI18n();
  const level = levelFromScore(score);
  const LevelIcon = level ? levelStyle[level].icon : CircleHelp;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        level ? levelStyle[level].chip : "bg-slate-50 text-slate-500 ring-slate-200"
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {t("risk.chip", { risk: label, level: level ? t(levelStyle[level].label) : t("risk.noData") })}
      <LevelIcon className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  );
}

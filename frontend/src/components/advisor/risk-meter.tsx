"use client";

import { CircleAlert, CircleCheck, HeartPulse, TriangleAlert } from "lucide-react";
import { Meter } from "@/components/ui/meter";
import { useI18n } from "@/i18n/provider";
import { levelTone } from "@/lib/format";
import type { Level } from "@/lib/types";
import { cn } from "@/lib/utils";

export function riskLevel(value: number | null): Level | null {
  if (value === null) return null;
  if (value >= 65) return "High";
  if (value >= 35) return "Moderate";
  return "Low";
}

const levelStyle: Record<Level, { icon: typeof CircleCheck; text: string }> = {
  Low: { icon: CircleCheck, text: "text-emerald-700" },
  Moderate: { icon: CircleAlert, text: "text-amber-700" },
  High: { icon: TriangleAlert, text: "text-red-700" },
};

function MetricLabel({ label, hideLabelOnWide }: { label: string; hideLabelOnWide?: boolean }) {
  return <p className={cn("mb-1 text-[11px] font-medium tracking-wide text-slate-500 uppercase", hideLabelOnWide && "xl:sr-only")}>{label}</p>;
}

export function RiskMeter({ name, value, hideLabelOnWide }: { name: string; value: number | null; hideLabelOnWide?: boolean }) {
  const { t, tx } = useI18n();
  const level = riskLevel(value);

  if (level === null || value === null) {
    return (
      <div className="min-w-0">
        <MetricLabel label={name} hideLabelOnWide={hideLabelOnWide} />
        <p className="text-xs text-slate-400">{t("advisor.notAssessed")}</p>
        <div className="mt-1.5 h-1.5 rounded-full bg-slate-100" />
      </div>
    );
  }

  const { icon: Icon, text } = levelStyle[level];
  return (
    <div className="min-w-0">
      <MetricLabel label={name} hideLabelOnWide={hideLabelOnWide} />
      <div className={cn("flex items-center gap-1.5 text-xs font-semibold", text)}>
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{tx(`advisor.level_${level}`)}</span>
        <span className="ml-auto font-normal text-slate-500 tabular-nums">{Math.round(value)}</span>
      </div>
      <Meter
        value={value}
        tone={levelTone(level)}
        label={`${t("advisor.riskLabel", { name, value: Math.round(value) })}, ${tx(`advisor.level_${level}`)}`}
        className="mt-1.5 h-1.5"
      />
    </div>
  );
}

export function HealthMeter({ name, value, hideLabelOnWide }: { name: string; value: number | null; hideLabelOnWide?: boolean }) {
  const { t } = useI18n();

  if (value === null) {
    return (
      <div className="min-w-0">
        <MetricLabel label={name} hideLabelOnWide={hideLabelOnWide} />
        <p className="text-xs text-slate-400">{t("advisor.notAssessed")}</p>
        <div className="mt-1.5 h-1.5 rounded-full bg-slate-100" />
      </div>
    );
  }

  const tone = value >= 70 ? "good" : value >= 50 ? "warning" : "critical";
  const text = tone === "good" ? "text-emerald-700" : tone === "warning" ? "text-amber-700" : "text-red-700";
  return (
    <div className="min-w-0">
      <MetricLabel label={name} hideLabelOnWide={hideLabelOnWide} />
      <div className={cn("flex items-center gap-1.5 text-xs font-semibold", text)}>
        <HeartPulse className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="font-display text-sm text-ink tabular-nums">{Math.round(value)}</span>
        <span className="font-normal text-slate-400">/ 100</span>
      </div>
      <Meter value={value} tone={tone} label={t("advisor.healthLabel", { value: Math.round(value) })} className="mt-1.5 h-1.5" />
    </div>
  );
}

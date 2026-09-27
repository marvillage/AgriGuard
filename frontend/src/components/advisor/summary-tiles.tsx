"use client";

import { Droplets, Layers, Sprout, TriangleAlert } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { formatLitres, formatNumber } from "@/lib/format";
import type { AdvisorFarm } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SummaryTiles({ farms }: { farms: AdvisorFarm[] }) {
  const { t, language } = useI18n();
  const fields = farms.flatMap((item) => item.fields);
  const acres = fields.reduce((sum, field) => sum + field.areaAcres, 0);
  const critical = farms.reduce((sum, item) => sum + item.criticalAlerts, 0);
  const water = farms.reduce((sum, item) => sum + item.waterSavedL, 0);

  const tiles = [
    { key: "farms", icon: Sprout, label: t("advisor.statFarms"), value: formatNumber(farms.length, 0, language), hint: t("advisor.statFarmsHint"), accent: "bg-sun-400 text-ink" },
    { key: "fields", icon: Layers, label: t("advisor.statFields"), value: formatNumber(fields.length, 0, language), hint: t("advisor.statFieldsHint", { acres: formatNumber(acres, 1, language) }), accent: "bg-navy-950 text-sun-400" },
    { key: "critical", icon: TriangleAlert, label: t("advisor.statCritical"), value: formatNumber(critical, 0, language), hint: t("advisor.statCriticalHint"), accent: critical > 0 ? "bg-red-600 text-white" : "bg-emerald-600 text-white" },
    { key: "water", icon: Droplets, label: t("advisor.statWater"), value: formatLitres(water, language), hint: t("advisor.statWaterHint"), accent: "bg-sky-600 text-white" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {tiles.map(({ key, icon: Icon, label, value, hint, accent }) => (
        <div key={key} className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase sm:text-sm sm:normal-case sm:tracking-normal">{label}</p>
            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", accent)}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight text-ink tabular-nums sm:text-3xl">{value}</p>
          <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
        </div>
      ))}
    </div>
  );
}

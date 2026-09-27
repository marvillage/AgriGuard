"use client";

import type { LucideIcon } from "lucide-react";
import { Droplet, Droplets, Gauge, IndianRupee, Leaf, Percent, Sprout, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { useI18n } from "@/i18n/provider";
import { formatCo2, formatLitres, formatNumber, formatRupees } from "@/lib/format";
import type { ImpactTotals } from "@/lib/types";
import { cn } from "@/lib/utils";

const tones = {
  sun: "bg-sun-100 text-sun-700",
  navy: "bg-navy-50 text-navy-700",
  good: "bg-emerald-50 text-emerald-700",
  ink: "bg-slate-100 text-slate-700",
};

interface Tile {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: keyof typeof tones;
  meter?: number;
}

export function ImpactKpis({ totals }: { totals: ImpactTotals }) {
  const { t, language } = useI18n();
  const measuredPct = Math.round(totals.measuredShare * 100);

  const tiles: Tile[] = [
    { label: t("sustainability.kpiWaterSaved"), value: formatLitres(totals.litresSaved, language), hint: t("sustainability.kpiWaterSavedHint"), icon: Droplets, tone: "navy" },
    { label: t("sustainability.kpiWaterUsed"), value: formatLitres(totals.litresUsed, language), hint: t("sustainability.kpiWaterUsedHint"), icon: Droplet, tone: "ink" },
    { label: t("sustainability.kpiSavingPct"), value: t("sustainability.unitPct", { value: formatNumber(totals.savingPct, 1, language) }), hint: t("sustainability.kpiSavingPctHint"), icon: Percent, tone: "sun" },
    { label: t("sustainability.kpiKwh"), value: t("sustainability.unitKwh", { value: formatNumber(totals.kwhSaved, 0, language) }), hint: t("sustainability.kpiKwhHint"), icon: Zap, tone: "sun" },
    { label: t("sustainability.kpiCo2"), value: formatCo2(totals.co2Kg, language), hint: t("sustainability.kpiCo2Hint"), icon: Leaf, tone: "good" },
    { label: t("sustainability.kpiRupees"), value: formatRupees(totals.rupeesSaved, language), hint: t("sustainability.kpiRupeesHint"), icon: IndianRupee, tone: "sun" },
    { label: t("sustainability.kpiFertilizer"), value: t("sustainability.unitKg", { value: formatNumber(totals.ureaKgSaved, 1, language) }), hint: t("sustainability.kpiFertilizerHint"), icon: Sprout, tone: "good" },
    { label: t("sustainability.kpiMeasured"), value: t("sustainability.unitPct", { value: formatNumber(measuredPct, 0, language) }), hint: t("sustainability.kpiMeasuredHint", { pct: formatNumber(measuredPct, 0, language) }), icon: Gauge, tone: "navy", meter: measuredPct },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {tiles.map(({ label, value, hint, icon: Icon, tone, meter }) => (
        <Card key={label} className="group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
          <div className="flex h-full flex-col p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 sm:h-9 sm:w-9 sm:rounded-xl", tones[tone])}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2 font-display text-xl font-bold tracking-tight break-words text-ink sm:text-2xl lg:text-3xl">{value}</p>
            {meter !== undefined ? <Meter value={meter} tone="navy" label={label} className="mt-2" /> : null}
            <p className="mt-1.5 text-xs leading-snug text-slate-400">{hint}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

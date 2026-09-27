"use client";

import Link from "next/link";
import { ArrowRight, Clock, MessageSquarePlus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { formatNumber } from "@/lib/format";
import type { AdvisorFarm } from "@/lib/types";
import { cn } from "@/lib/utils";
import { HealthMeter, RiskMeter } from "./risk-meter";

type AdvisorField = AdvisorFarm["fields"][number];

export const fieldGrid = "xl:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))_minmax(0,0.9fr)_auto]";

export function worstRisk(field: AdvisorField) {
  return Math.max(field.waterStress ?? 0, field.diseaseRisk ?? 0, field.weatherRisk ?? 0);
}

function useSinceReading() {
  const { t } = useI18n();
  return (minutes: number | null) => {
    if (minutes === null) return t("advisor.noReading");
    if (minutes < 1) return t("common.justNow");
    if (minutes < 60) return t("common.minutesAgo", { count: minutes });
    const hours = Math.round(minutes / 60);
    if (hours < 48) return t("common.hoursAgo", { count: hours });
    return t("common.daysAgo", { count: Math.round(hours / 24) });
  };
}

function Reading({ minutes }: { minutes: number | null }) {
  const since = useSinceReading();
  const stale = minutes === null || minutes > 60;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs whitespace-nowrap", stale ? "text-amber-700" : "text-slate-500")}>
      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {since(minutes)}
    </span>
  );
}

export function FieldHeaderRow() {
  const { t } = useI18n();
  return (
    <div className={cn("hidden gap-4 border-b border-slate-100 px-6 pb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase xl:grid", fieldGrid)} aria-hidden="true">
      <span>{t("advisor.colField")}</span>
      <span>{t("advisor.colHealth")}</span>
      <span>{t("advisor.colWater")}</span>
      <span>{t("advisor.colDisease")}</span>
      <span>{t("advisor.colWeather")}</span>
      <span>{t("advisor.colReading")}</span>
      <span className="w-[164px]" />
    </div>
  );
}

export function FieldRow({ field, onAddNote }: { field: AdvisorField; onAddNote: () => void }) {
  const { t, language } = useI18n();

  return (
    <li className={cn("grid gap-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-colors xl:items-center xl:rounded-none xl:border-0 xl:border-b xl:border-slate-100 xl:bg-transparent xl:px-6 xl:py-4 xl:last:border-b-0 xl:hover:bg-slate-50/70", fieldGrid)}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{field.name}</p>
          <p className="text-xs text-slate-500">
            {formatNumber(field.areaAcres, 1, language)} {t("common.acres")}
            {field.moisture !== null ? ` · ${t("advisor.moisture", { value: formatNumber(field.moisture, 1, language) })}` : ""}
          </p>
        </div>
        <span className="xl:hidden">
          <Reading minutes={field.minutesSinceReading} />
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4 xl:contents">
        <HealthMeter name={t("advisor.colHealth")} value={field.cropHealth} hideLabelOnWide />
        <RiskMeter name={t("advisor.colWater")} value={field.waterStress} hideLabelOnWide />
        <RiskMeter name={t("advisor.colDisease")} value={field.diseaseRisk} hideLabelOnWide />
        <RiskMeter name={t("advisor.colWeather")} value={field.weatherRisk} hideLabelOnWide />
      </div>

      <span className="hidden xl:block">
        <Reading minutes={field.minutesSinceReading} />
      </span>

      <div className="flex gap-2 xl:w-[164px] xl:justify-end">
        <Link
          href={`/fields/${field.id}`}
          aria-label={t("advisor.viewField", { name: field.name })}
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "flex-1 xl:flex-none")}
        >
          {t("advisor.view")} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Button type="button" size="sm" variant="dark" onClick={onAddNote} className="flex-1 xl:flex-none">
          <MessageSquarePlus className="h-3.5 w-3.5" /> {t("advisor.addNote")}
        </Button>
      </div>
    </li>
  );
}

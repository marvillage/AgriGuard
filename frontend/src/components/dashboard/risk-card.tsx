"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, ChevronDown, CloudSun, Droplets, FlaskConical, ShieldAlert, Thermometer, Timer } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import type { DashboardField } from "@/lib/types";
import { cn } from "@/lib/utils";
import { healthStatus, healthStyle, RiskChip } from "./risk-level";

export function RiskCard({ field }: { field: DashboardField }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const cropLine = [field.farmName, field.crop?.name, field.crop?.stage].filter(Boolean).join(" · ");

  return (
    <Card className="flex min-w-0 flex-col transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex gap-4 sm:gap-5">
          <ScoreRing score={field.cropHealth} />
          <div className="min-w-0 flex-1">
            <Link
              href={`/fields/${field.id}`}
              className="font-display text-lg font-semibold text-ink transition-colors hover:text-navy-700"
            >
              {field.name}
            </Link>
            <p className="line-clamp-2 text-sm text-slate-500">{cropLine}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <RiskChip icon={Droplets} label={t("risk.water")} score={field.waterStress} />
              <RiskChip icon={ShieldAlert} label={t("risk.disease")} score={field.diseaseRisk} />
              <RiskChip icon={CloudSun} label={t("risk.weather")} score={field.weatherRisk} />
            </div>
          </div>
        </div>

        {expanded ? <RiskDetails fieldId={field.id} /> : null}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 -ml-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink"
          >
            {expanded ? t("risk.hideDetails") : t("risk.showDetails")}
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", expanded && "rotate-180")} aria-hidden="true" />
          </button>
          <Link
            href={`/fields/${field.id}`}
            className="group inline-flex items-center gap-1 text-sm font-semibold text-navy-700 transition-colors hover:text-navy-900"
          >
            {t("risk.openField")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskDetails({ fieldId }: { fieldId: number }) {
  const { t, tx, number } = useI18n();
  const query = useQuery({
    queryKey: ["field", fieldId],
    queryFn: () => api.fieldOverview(fieldId),
  });

  if (query.isLoading) {
    return (
      <div className="mt-4 grid animate-fade-in grid-cols-3 gap-2" aria-busy="true" aria-label={t("common.loading")}>
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Alert variant="destructive" className="mt-4">
        {t("risk.detailsError")}
      </Alert>
    );
  }

  const { risks, decision } = query.data;
  const nutrients = (["N", "P", "K"] as const).map((key) => ({ key, status: risks.nutrients[key] }));

  return (
    <div className="mt-4 animate-fade-in space-y-3">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Detail icon={Timer} label={t("risk.humidHours")}>
          {t("risk.hoursValue", { value: number(risks.humidHours) })}
        </Detail>
        <Detail icon={Thermometer} label={t("risk.meanTemp")}>
          {`${number(risks.meanTemp, 1)}°C`}
        </Detail>
        <Detail icon={FlaskConical} label={t("risk.npk")} className="col-span-2">
          {nutrients.every((item) => item.status === null) ? (
            t("risk.nutrientNone")
          ) : (
            <span className="flex flex-wrap gap-x-3 gap-y-0.5">
              {nutrients.map((item) => (
                <span key={item.key}>
                  <span className="font-bold">{item.key}</span>{" "}
                  <span className="font-medium text-slate-600">{item.status ? tx(`common.${item.status.toLowerCase()}`) : "–"}</span>
                </span>
              ))}
            </span>
          )}
        </Detail>
      </dl>
      <div className="flex items-start gap-2 rounded-xl bg-sun-50 px-3 py-2.5 text-sm text-slate-700">
        <Activity className="mt-0.5 h-4 w-4 shrink-0 text-sun-700" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wide text-sun-800 uppercase">{t("risk.decision")}</p>
          <p className="mt-0.5">{decision.message}</p>
        </div>
      </div>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  className,
  children,
}: {
  icon: typeof Timer;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0 rounded-xl border border-slate-200/80 px-3 py-2.5", className)}>
      <dt className="flex items-center gap-1 text-[11px] text-slate-500">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0">{label}</span>
      </dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{children}</dd>
    </div>
  );
}

function ScoreRing({ score }: { score: number | null }) {
  const { t, number } = useI18n();
  const status = healthStatus(score);
  const style = status ? healthStyle[status] : null;
  const Icon = style?.icon;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex w-20 shrink-0 flex-col items-center">
      <div className="relative h-20 w-20" role="img" aria-label={score === null ? t("risk.healthUnknown") : t("risk.healthAria", { value: number(score) })}>
        <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90" aria-hidden="true">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="#eef0f3" strokeWidth="7" />
          {score !== null && style ? (
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke={style.ring}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - Math.max(0, Math.min(100, score)) / 100)}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          ) : null}
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-xl font-bold text-ink tabular-nums">
          {score === null ? "–" : number(score)}
        </span>
      </div>
      <span className="mt-1.5 inline-flex items-center gap-1 text-center text-xs font-semibold text-slate-600">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
        {style ? t(style.label) : t("risk.noData")}
      </span>
    </div>
  );
}

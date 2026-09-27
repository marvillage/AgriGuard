"use client";

import Link from "next/link";
import { CloudRain, Droplet, MapPin, Sun, Thermometer, type LucideIcon } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { formatDate } from "@/lib/format";
import type { Dashboard } from "@/lib/types";

type FarmWeatherEntry = Dashboard["weather"][number];

export function WeatherCard({ weather }: { weather: Dashboard["weather"] }) {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
        <CardTitle>{t("dashboard.weatherTitle")}</CardTitle>
        <p className="text-sm text-slate-500">{t("dashboard.weatherDescription")}</p>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {weather.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center">
            <MapPin className="mx-auto h-6 w-6 text-sun-500" aria-hidden="true" />
            <p className="mt-2 text-sm text-slate-500">{t("dashboard.weatherNoLocation")}</p>
            <Link href="/farms" className="mt-3 inline-block text-sm font-semibold text-navy-700 hover:text-navy-900">
              {t("dashboard.manageFarms")}
            </Link>
          </div>
        ) : (
          weather.map((entry) => <FarmWeather key={entry.farmId} entry={entry} />)
        )}
      </CardContent>
    </Card>
  );
}

function FarmWeather({ entry }: { entry: FarmWeatherEntry }) {
  const { t, language, number } = useI18n();
  const { summary } = entry;
  const days = (entry.daily ?? []).slice(0, 5);

  return (
    <section className="rounded-2xl border border-slate-200/80 p-4 transition-colors duration-300 hover:border-navy-200">
      <div className="flex items-center justify-between gap-3">
        <h4 className="flex min-w-0 items-center gap-1.5 font-semibold text-ink">
          <MapPin className="h-4 w-4 shrink-0 text-sun-600" aria-hidden="true" />
          <span className="truncate">{entry.farmName}</span>
        </h4>
        {summary?.tempNow !== null && summary?.tempNow !== undefined ? (
          <span className="shrink-0 font-display text-2xl font-bold text-ink tabular-nums">{number(summary.tempNow, 0)}°C</span>
        ) : null}
      </div>

      {entry.error || !summary ? (
        <Alert variant="destructive" className="mt-3">
          {t("dashboard.weatherError")}
        </Alert>
      ) : (
        <>
          <dl className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200/80">
            <Metric
              icon={CloudRain}
              label={t("dashboard.rain24h")}
              value={t("dashboard.mm", { value: number(summary.rainNext24Mm, 1) })}
              hint={t("dashboard.rainChance", { value: number(summary.rainProbabilityNext24) })}
            />
            <Metric
              icon={Sun}
              label={t("dashboard.et0")}
              value={t("dashboard.mm", { value: number(summary.et0Today, 1) })}
              hint={t("dashboard.et0Hint")}
            />
            <Metric
              icon={Thermometer}
              label={t("dashboard.maxTemp3d")}
              value={`${number(summary.maxTempNext3Days, 0)}°C`}
              hint={summary.humidityNow !== null ? t("dashboard.humidityNow", { value: number(summary.humidityNow) }) : undefined}
            />
          </dl>

          {days.length ? (
            <ol className="mt-3 grid grid-cols-5 gap-1.5" aria-label={t("dashboard.forecast5")}>
              {days.map((day, index) => {
                const label = index === 0 ? t("common.today") : formatDate(`${day.date}T00:00:00`, language, { weekday: "short" });
                return (
                  <li
                    key={day.date}
                    className="min-w-0 rounded-xl bg-slate-50 px-1 py-2 text-center transition-colors hover:bg-navy-50"
                    aria-label={t("dashboard.dayForecast", {
                      day: label,
                      max: number(day.tempMax, 0),
                      min: number(day.tempMin, 0),
                      rain: number(day.rainMm, 1),
                    })}
                  >
                    <p className="truncate text-[11px] font-semibold text-slate-500">{label}</p>
                    <p className="mt-1 text-sm font-bold text-ink tabular-nums">{number(day.tempMax, 0)}°</p>
                    <p className="text-xs text-slate-400 tabular-nums">{number(day.tempMin, 0)}°</p>
                    <p className="mt-1 flex items-center justify-center gap-0.5 text-[11px] text-slate-600 tabular-nums">
                      <Droplet className="h-3 w-3 shrink-0 text-navy-500" aria-hidden="true" />
                      {number(day.rainMm, 1)}
                    </p>
                  </li>
                );
              })}
            </ol>
          ) : null}
          {days.length ? <p className="mt-2 text-[11px] text-slate-400">{t("dashboard.forecastLegend")}</p> : null}
        </>
      )}
    </section>
  );
}

function Metric({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <dt className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
        <Icon className="h-4 w-4 shrink-0 text-navy-600" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block font-medium text-slate-600">{label}</span>
          {hint ? <span className="block text-[11px] text-slate-400">{hint}</span> : null}
        </span>
      </dt>
      <dd className="shrink-0 text-sm font-bold text-ink tabular-nums">{value}</dd>
    </div>
  );
}

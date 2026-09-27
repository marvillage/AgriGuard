"use client";

import { CloudRain } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import type { WeatherDay } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDay, localIsoDate } from "./field-ui";

export function upcomingDays(days: WeatherDay[], count = 7) {
  const today = localIsoDate(new Date());
  return days.filter((day) => day.date >= today).slice(0, count);
}

export function WeatherStrip({ days }: { days: WeatherDay[] }) {
  const { t, language, number } = useI18n();
  const today = localIsoDate(new Date());

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <ol className="grid auto-cols-[minmax(5.25rem,1fr)] grid-flow-col gap-2">
        {days.map((day) => {
          const isToday = day.date === today;
          return (
            <li
              key={day.date}
              className={cn(
                "rounded-xl border px-2 py-3 text-center whitespace-nowrap transition-colors",
                isToday ? "border-sun-300 bg-sun-50" : "border-slate-200/80 bg-white hover:border-navy-200"
              )}
            >
              <p className="text-xs font-semibold text-ink">
                {isToday ? t("common.today") : formatDay(day.date, language, { weekday: "short" })}
              </p>
              <p className="text-[11px] text-slate-400">{formatDay(day.date, language, { day: "numeric", month: "short" })}</p>
              <p className="mt-2 font-display text-base font-semibold text-ink tabular-nums">
                {number(day.tempMax)}°<span className="text-sm font-medium text-slate-400"> {number(day.tempMin)}°</span>
              </p>
              <p className="mt-2 flex items-center justify-center gap-1 text-xs font-medium text-navy-700 tabular-nums">
                <CloudRain className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {t("field.mmShort", { value: number(day.rainMm, 1) })}
              </p>
              <p className="text-[11px] text-slate-400 tabular-nums">{t("field.rainChance", { value: number(day.rainProbability) })}</p>
              <div className="mt-2 border-t border-slate-100 pt-2 text-[11px] tabular-nums">
                <p className="text-slate-500">{t("field.et0Short", { value: number(day.et0, 1) })}</p>
                {typeof day.etc === "number" ? (
                  <p className="font-semibold text-sun-700">{t("field.etcShort", { value: number(day.etc, 1) })}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

"use client";

import { CloudSun, Sun } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { formatDate, formatTime } from "@/lib/format";
import type { FieldOverview } from "@/lib/types";
import { SectionTitle } from "./field-ui";
import { WeatherStrip, upcomingDays } from "./weather-strip";

export function FieldWeatherCard({ overview }: { overview: FieldOverview }) {
  const { t, language } = useI18n();
  const days = upcomingDays(overview.weatherDaily);
  const { solar } = overview;

  return (
    <Card className="h-full">
      <CardHeader>
        <SectionTitle icon={<CloudSun className="h-4 w-4 text-navy-700" />} title={t("field.weatherTitle")} />
        <p className="text-sm text-slate-500">{t("field.weatherIntro")}</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {overview.weatherError ? <Alert variant="info">{overview.weatherError}</Alert> : null}
        {days.length ? <WeatherStrip days={days} /> : !overview.weatherError ? <p className="text-sm text-slate-500">{t("field.weatherUnavailable")}</p> : null}
        <div className="flex flex-col gap-3 rounded-xl border border-sun-300/60 bg-sun-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sun-400 text-ink">
              <Sun className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{t("field.solarTitle")}</p>
              <p className="text-sm text-slate-600">
                {!solar
                  ? t("field.solarNotConfigured")
                  : solar.start && solar.end
                    ? t("field.solarWindow", {
                        day: formatDate(solar.start, language, { weekday: "short", day: "numeric", month: "short" }),
                        start: formatTime(solar.start, language),
                        end: formatTime(solar.end, language),
                      })
                    : t("field.solarNone")}
              </p>
            </div>
          </div>
          {solar?.activeNow ? <Badge variant="default">{t("field.solarActive")}</Badge> : null}
        </div>
      </CardContent>
    </Card>
  );
}

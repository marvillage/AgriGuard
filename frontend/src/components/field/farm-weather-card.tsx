"use client";

import { useQuery } from "@tanstack/react-query";
import { CloudRain, CloudSun, Droplet, MapPin, Sun, Thermometer, ThermometerSun } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { api, ApiRequestError } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/format";
import { SectionTitle, errorMessage } from "./field-ui";
import { WeatherStrip, upcomingDays } from "./weather-strip";

export function FarmWeatherCard({ farmId, onSetLocation }: { farmId: number; onSetLocation?: () => void }) {
  const { t, language, number } = useI18n();
  const query = useQuery({
    queryKey: ["farm", farmId, "weather"],
    queryFn: () => api.farmWeather(farmId),
    retry: (count, error) => !(error instanceof ApiRequestError && error.status === 400) && count < 2,
    staleTime: 10 * 60_000,
  });
  const needsLocation = query.error instanceof ApiRequestError && query.error.status === 400;
  const summary = query.data?.summary;
  const solar = query.data?.solar;
  const days = upcomingDays(query.data?.daily ?? []);

  return (
    <Card className="h-full">
      <CardHeader>
        <SectionTitle icon={<CloudSun className="h-4 w-4 text-navy-700" />} title={t("farms.weatherTitle")} />
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {query.isLoading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[0, 1, 2, 3].map((key) => (
                <div key={key} className="h-16 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
            <div className="h-36 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : needsLocation ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-sun-300 bg-sun-50/60 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <MapPin className="h-4 w-4 text-sun-600" />
              {t("farms.weatherSetLocation")}
            </p>
            <p className="text-sm text-slate-600">{t("farms.weatherSetLocationHint")}</p>
            {onSetLocation ? (
              <Button size="sm" onClick={onSetLocation}>
                {t("farms.setLocation")}
              </Button>
            ) : null}
          </div>
        ) : query.isError || !summary ? (
          <Alert variant="destructive">{errorMessage(query.error, t("farms.weatherError"))}</Alert>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <WeatherStat icon={Thermometer} label={t("farms.weatherNow")} value={summary.tempNow === null ? "–" : t("field.degrees", { value: number(summary.tempNow, 1) })} />
              <WeatherStat icon={Droplet} label={t("farms.weatherHumidity")} value={summary.humidityNow === null ? "–" : t("field.percent", { value: number(summary.humidityNow) })} />
              <WeatherStat
                icon={CloudRain}
                label={t("farms.weatherRain24")}
                value={t("field.mmShort", { value: number(summary.rainNext24Mm, 1) })}
                note={t("field.rainChance", { value: number(summary.rainProbabilityNext24) })}
              />
              <WeatherStat
                icon={ThermometerSun}
                label={t("farms.weatherEt0")}
                value={t("field.mmPerDay", { value: number(summary.et0Today, 1) })}
                note={t("farms.weatherWind", { value: number(summary.maxWindNext3Days) })}
              />
            </div>
            {days.length ? <WeatherStrip days={days} /> : null}
            {solar ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-sun-300/60 bg-sun-50/70 px-4 py-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <Sun className="mt-0.5 h-4 w-4 shrink-0 text-sun-600" />
                  <p className="text-sm text-slate-700">
                    <span className="block font-semibold text-ink sm:mr-2 sm:inline">{t("field.solarTitle")}</span>
                    {solar.start && solar.end
                      ? t("field.solarWindow", {
                          day: formatDate(solar.start, language, { weekday: "short", day: "numeric", month: "short" }),
                          start: formatTime(solar.start, language),
                          end: formatTime(solar.end, language),
                        })
                      : t("field.solarNone")}
                  </p>
                </div>
                {solar.activeNow ? <Badge variant="default">{t("field.solarActive")}</Badge> : null}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function WeatherStat({ icon: Icon, label, value, note }: { icon: typeof Sun; label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 p-3">
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5 shrink-0 text-navy-700" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1 font-display text-lg font-semibold text-ink tabular-nums">{value}</p>
      {note ? <p className="text-[11px] text-slate-500">{note}</p> : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Droplets, Gauge, Sun, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { formatDate, formatLitres, toDate } from "@/lib/format";
import type { IrrigationEvent } from "@/lib/types";
import { EmptyState, StatTile, useCodeLabel, useDuration, useNow } from "./shared";

const weekMs = 7 * 86400000;
const pageSize = 6;

export function IrrigationLog({ events }: { events: IrrigationEvent[] }) {
  const { t, number, language } = useI18n();
  const codeLabel = useCodeLabel();
  const duration = useDuration();
  const now = useNow(60000);
  const [showAll, setShowAll] = useState(false);

  const minutesOf = (event: IrrigationEvent) => {
    const start = toDate(event.startedAt)?.getTime();
    const end = event.endedAt ? toDate(event.endedAt)?.getTime() : now;
    return start && end ? Math.max(0, (end - start) / 60000) : 0;
  };

  const week = events.filter((event) => (toDate(event.startedAt)?.getTime() ?? 0) >= now - weekMs);
  const totals = week.reduce(
    (sum, event) => ({
      litres: sum.litres + (event.litres ?? 0),
      kwh: sum.kwh + (event.kwh ?? 0),
      solar: sum.solar + (event.solarKwh ?? 0),
      minutes: sum.minutes + minutesOf(event),
    }),
    { litres: 0, kwh: 0, solar: 0, minutes: 0 }
  );
  const solarShare = totals.kwh > 0 ? Math.round((totals.solar / totals.kwh) * 100) : null;
  const visible = showAll ? events : events.slice(0, pageSize);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("fieldOps.logTitle")}</CardTitle>
        <p className="text-sm text-slate-500">{t("fieldOps.logSubtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            icon={Gauge}
            label={t("fieldOps.weekRuns")}
            value={number(week.length)}
            hint={week.length ? duration(totals.minutes) : t("fieldOps.weekNone")}
          />
          <StatTile icon={Droplets} label={t("fieldOps.weekWater")} value={formatLitres(totals.litres, language)} />
          <StatTile icon={Zap} label={t("fieldOps.weekEnergy")} value={t("fieldOps.kwhValue", { kwh: number(totals.kwh, 1) })} />
          <StatTile
            icon={Sun}
            label={t("fieldOps.weekSolar")}
            value={t("fieldOps.kwhValue", { kwh: number(totals.solar, 1) })}
            hint={solarShare !== null ? t("fieldOps.solarShare", { share: number(solarShare) }) : undefined}
          />
        </div>

        {events.length === 0 ? (
          <EmptyState icon={Droplets} title={t("fieldOps.logEmpty")}>
            {t("fieldOps.logEmptyBody")}
          </EmptyState>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {visible.map((event) => {
                const running = !event.endedAt;
                return (
                  <li key={event.id} className="flex flex-col gap-3 p-3 sm:p-4 md:flex-row md:items-center">
                    <div className="min-w-0 md:w-56 md:shrink-0">
                      <p className="text-sm font-semibold text-ink">
                        {formatDate(event.startedAt, language, { weekday: "short", day: "numeric", month: "short" })}
                        <span className="ml-1.5 font-normal text-slate-500">
                          {formatDate(event.startedAt, language, { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge variant="navy">{codeLabel("source", event.source)}</Badge>
                        <Badge variant={event.measured ? "success" : "secondary"}>
                          {event.measured ? t("common.measured") : t("common.estimated")}
                        </Badge>
                        {running ? <Badge variant="info">{t("fieldOps.eventRunning")}</Badge> : null}
                      </div>
                    </div>
                    <dl className="grid flex-1 grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      <Metric label={t("fieldOps.colDuration")} value={duration(minutesOf(event))} />
                      <Metric label={t("fieldOps.colLitres")} value={formatLitres(event.litres, language)} />
                      <Metric label={t("fieldOps.colEnergy")} value={event.kwh === null ? "–" : number(event.kwh, 1)} />
                      <Metric label={t("fieldOps.colSolar")} value={event.solarKwh === null ? "–" : number(event.solarKwh, 1)} />
                    </dl>
                  </li>
                );
              })}
            </ul>
            {events.length > pageSize ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAll((value) => !value)}>
                {showAll ? t("fieldOps.showLess") : t("fieldOps.showAll", { count: events.length })}
              </Button>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] text-slate-500">{label}</dt>
      <dd className="truncate font-semibold text-ink tabular-nums">{value}</dd>
    </div>
  );
}

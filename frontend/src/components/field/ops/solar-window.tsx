"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Sun, SunMedium } from "lucide-react";
import { ChartCard } from "@/components/charts/chart-card";
import { ChartTooltip, chartColors } from "@/components/charts/chart-tooltip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { formatDate, formatTime, toDate } from "@/lib/format";
import type { FieldOverview } from "@/lib/types";
import { useNow } from "./shared";

const hoursShown = 24;
const idleBar = "var(--chart-muted)";

export function SolarWindowCard({ overview }: { overview: FieldOverview }) {
  const { t, number, language } = useI18n();
  const now = useNow(60000);
  const solar = overview.solar;
  const capacity = overview.farm.solarCapacityKw;
  const pumpKw = overview.field.pumpPowerKw;

  if (!solar) {
    const reason = !capacity ? t("fieldOps.solarNoCapacity") : !pumpKw ? t("fieldOps.solarNoPumpPower") : t("fieldOps.solarNoForecast");
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("fieldOps.solarTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
            <SunMedium className="mt-0.5 h-5 w-5 shrink-0 text-sun-600" aria-hidden="true" />
            <p>{reason}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const usable = new Set(solar.usable.map((hour) => hour.time));
  const data = solar.hours
    .filter((hour) => (toDate(hour.time)?.getTime() ?? 0) + 3600000 > now)
    .slice(0, hoursShown)
    .map((hour) => ({
      time: hour.time,
      label: formatDate(hour.time, language, { hour: "numeric" }),
      full: formatDate(hour.time, language, { weekday: "short", hour: "numeric", minute: "2-digit" }),
      kw: hour.predictedKw,
      usable: usable.has(hour.time),
    }));
  const predictedName = t("fieldOps.solarPredicted");
  const peak = Math.max(1, pumpKw ?? 0, ...data.map((row) => row.kw));
  const step = peak <= 5 ? 1 : peak <= 10 ? 2 : Math.ceil(peak / 5);
  const ticks = Array.from({ length: Math.ceil(peak / step) + 1 }, (value, index) => index * step);

  const windowText =
    solar.start && solar.end
      ? t("fieldOps.solarWindowText", {
          day: formatDate(solar.start, language, { weekday: "long" }),
          start: formatTime(solar.start, language),
          end: formatTime(solar.end, language),
        })
      : t("fieldOps.solarNoWindow", { kw: number(pumpKw ?? 0, 1) });

  return (
    <ChartCard
      title={t("fieldOps.solarTitle")}
      description={t("fieldOps.solarSubtitle", { capacity: number(capacity ?? 0, 1), pump: number(pumpKw ?? 0, 1) })}
      legend={[
        { label: predictedName, color: idleBar, shape: "square" },
        { label: t("fieldOps.solarUsable"), color: chartColors.series4, shape: "square" },
        ...(pumpKw ? [{ label: t("fieldOps.solarPumpLine", { kw: number(pumpKw, 1) }), color: "var(--chart-text)" }] : []),
      ]}
      table={{
        columns: [t("common.time"), t("fieldOps.solarPredictedKw"), t("fieldOps.solarUsable")],
        rows: data.map((row) => [row.full, number(row.kw, 2), row.usable ? t("common.yes") : t("common.no")]),
      }}
      action={
        solar.activeNow ? (
          <Badge variant="default">
            <Sun className="h-3 w-3" aria-hidden="true" />
            {t("fieldOps.solarActiveNow")}
          </Badge>
        ) : null
      }
    >
      <div
        className={
          solar.start
            ? "mb-3 rounded-xl bg-sun-50 px-3 py-2 text-sm font-medium text-sun-900 ring-1 ring-sun-300/60"
            : "mb-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200"
        }
      >
        {windowText}
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -20 }} barCategoryGap={2}>
            <CartesianGrid stroke={chartColors.grid} vertical={false} />
            <XAxis dataKey="label" stroke={chartColors.axis} fontSize={11} tickLine={false} axisLine={{ stroke: "var(--chart-muted)" }} interval={3} />
            <YAxis stroke={chartColors.axis} fontSize={11} tickLine={false} axisLine={false} domain={[0, ticks[ticks.length - 1]]} ticks={ticks} />
            <Tooltip
              cursor={{ fill: "var(--chart-cursor)" }}
              content={(props) => (
                <ChartTooltip
                  active={props.active}
                  payload={props.payload?.map((row) => ({ ...row, color: row.payload?.usable ? chartColors.series4 : idleBar }))}
                  label={props.payload?.[0]?.payload?.full ?? props.label}
                  unit=" kW"
                />
              )}
            />
            {pumpKw ? (
              <ReferenceLine
                y={pumpKw}
                stroke="var(--chart-text)"
                strokeWidth={1}
                ifOverflow="extendDomain"
              />
            ) : null}
            <Bar dataKey="kw" name={predictedName} maxBarSize={24} radius={[4, 4, 0, 0]} animationDuration={700}>
              {data.map((row) => (
                <Cell key={row.time} fill={row.usable ? chartColors.series4 : idleBar} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/charts/chart-card";
import { ChartTooltip, chartColors } from "@/components/charts/chart-tooltip";
import { Alert } from "@/components/ui/alert";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { toDate } from "@/lib/format";
import type { HourlyPoint } from "@/lib/types";
import { cn } from "@/lib/utils";
import { alignedTicks, errorMessage, formatMs } from "./field-ui";
import { RawReadings } from "./raw-readings";

const ranges = [
  { hours: 24, key: "field.range24h" },
  { hours: 48, key: "field.range48h" },
  { hours: 168, key: "field.range7d" },
] as const;

type Metric = "soilMoisture" | "temperature" | "humidity";

const metrics = [
  { key: "soilMoisture", label: "field.soilMoisture", unit: "field.unitPercent", color: chartColors.series1 },
  { key: "temperature", label: "field.airTemperature", unit: "field.unitCelsius", color: chartColors.series2 },
  { key: "humidity", label: "field.humidity", unit: "field.unitPercent", color: chartColors.series3 },
] as const satisfies ReadonlyArray<{ key: Metric; label: string; unit: string; color: string }>;

export function ReadingsHistory({ fieldId }: { fieldId: number }) {
  const { t, language, number } = useI18n();
  const [hours, setHours] = useState<number>(48);
  const query = useQuery({
    queryKey: ["field", fieldId, "observations", hours],
    queryFn: () => api.observations(fieldId, hours),
    placeholderData: keepPreviousData,
  });
  const hourly = query.data?.hourly ?? [];
  const points = hourly
    .map((point) => ({ ...point, at: toDate(point.time)?.getTime() ?? 0 }))
    .filter((point) => point.at > 0);
  const axis =
    hours > 48
      ? { step: 24, options: { weekday: "short", day: "numeric" } as Intl.DateTimeFormatOptions }
      : hours > 24
        ? { step: 12, options: { weekday: "short", hour: "numeric" } as Intl.DateTimeFormatOptions }
        : { step: 6, options: { hour: "numeric" } as Intl.DateTimeFormatOptions };
  const ticks = points.length ? alignedTicks(points[0].at, points[points.length - 1].at, axis.step) : [];
  const stamp = (value: number) => formatMs(value, language, { weekday: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const cell = (value: number | null, digits = 1) => (value === null ? "–" : number(value, digits));

  const rangeToggle = (
    <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label={t("field.rangeLabel")}>
      {ranges.map((range) => (
        <button
          key={range.hours}
          type="button"
          onClick={() => setHours(range.hours)}
          aria-pressed={hours === range.hours}
          className={cn(
            "cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
            hours === range.hours ? "bg-white text-ink shadow-soft" : "text-slate-500 hover:text-ink"
          )}
        >
          {t(range.key)}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <ChartCard
        title={t("field.historyTitle")}
        description={query.data?.count === 1 ? t("field.historyIntroOne") : t("field.historyIntro", { count: number(query.data?.count ?? 0) })}
        action={rangeToggle}
        table={{
          columns: [t("field.columnTime"), ...metrics.map((metric) => `${t(metric.label)} (${t(metric.unit)})`)],
          rows: [...points].reverse().map((point) => [stamp(point.at), cell(point.soilMoisture), cell(point.temperature), cell(point.humidity)]),
        }}
      >
        {query.isError ? (
          <Alert variant="destructive">{errorMessage(query.error, t("common.error"))}</Alert>
        ) : query.isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.key} className="h-44 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : points.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">{t("field.noHistory")}</p>
        ) : (
          <div className={cn("grid gap-4 transition-opacity md:grid-cols-3", query.isFetching && "opacity-70")}>
            {metrics.map((metric) => (
              <SmallMultiple
                key={metric.key}
                title={t(metric.label)}
                unit={t(metric.unit)}
                color={metric.color}
                data={points}
                metric={metric.key}
                ticks={ticks}
                tickFormatter={(value) => formatMs(value, language, axis.options)}
                labelFormatter={stamp}
              />
            ))}
          </div>
        )}
      </ChartCard>

      <RawReadings fieldId={fieldId} />
    </div>
  );
}

function SmallMultiple({
  title,
  unit,
  color,
  data,
  metric,
  ticks,
  tickFormatter,
  labelFormatter,
}: {
  title: string;
  unit: string;
  color: string;
  data: Array<HourlyPoint & { at: number }>;
  metric: Metric;
  ticks: number[];
  tickFormatter: (value: number) => string;
  labelFormatter: (value: number) => string;
}) {
  const { number } = useI18n();
  const values = data.map((point) => point[metric]).filter((value): value is number => value !== null);
  const latest = values[values.length - 1];

  return (
    <div className="min-w-0 rounded-xl border border-slate-200/80 p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-slate-600">{title}</p>
        {latest !== undefined ? (
          <p className="font-display text-sm font-semibold text-ink tabular-nums">
            {number(latest, 1)}
            {unit}
          </p>
        ) : null}
      </div>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -26 }}>
            <CartesianGrid stroke={chartColors.grid} vertical={false} />
            <XAxis
              dataKey="at"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              ticks={ticks}
              tickFormatter={tickFormatter}
              stroke={chartColors.axis}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              minTickGap={16}
            />
            <YAxis domain={["auto", "auto"]} stroke={chartColors.axis} fontSize={10} tickLine={false} axisLine={false} tickCount={4} allowDecimals={false} />
            <Tooltip
              cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
              content={(props) => (
                <ChartTooltip
                  active={props.active}
                  payload={props.payload}
                  label={typeof props.label === "number" ? labelFormatter(props.label) : props.label}
                  unit={unit}
                />
              )}
            />
            <Line
              type="monotone"
              dataKey={metric}
              name={title}
              stroke={color}
              strokeWidth={2}
              dot={values.length < 3 ? { r: 4, strokeWidth: 2, fill: chartColors.surface } : false}
              connectNulls
              activeDot={{ r: 4, strokeWidth: 2, stroke: chartColors.surface }}
              animationDuration={700}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

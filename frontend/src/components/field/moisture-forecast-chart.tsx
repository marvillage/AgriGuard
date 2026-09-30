"use client";

import { Clock } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/charts/chart-card";
import { ChartTooltip, chartColors } from "@/components/charts/chart-tooltip";
import { useI18n } from "@/i18n/provider";
import { toDate } from "@/lib/format";
import type { FieldOverview } from "@/lib/types";
import { alignedTicks, formatMs } from "./field-ui";

interface Point {
  time: number;
  measured: number | null;
  forecast: number | null;
}

function buildPoints(overview: FieldOverview) {
  const points = new Map<number, Point>();
  for (const reading of overview.series) {
    const at = toDate(reading.time);
    if (!at || reading.soilMoisture === null) continue;
    points.set(at.getTime(), { time: at.getTime(), measured: reading.soilMoisture, forecast: null });
  }
  const lastMeasured = [...points.values()].sort((a, b) => b.time - a.time)[0];
  if (overview.forecast && overview.forecast.points.length) {
    if (lastMeasured) lastMeasured.forecast = lastMeasured.measured;
    for (const step of overview.forecast.points) {
      const at = toDate(step.time);
      if (!at) continue;
      const existing = points.get(at.getTime());
      points.set(at.getTime(), { time: at.getTime(), measured: existing?.measured ?? null, forecast: step.moisture });
    }
  }
  return { points: [...points.values()].sort((a, b) => a.time - b.time), now: lastMeasured?.time ?? null };
}

export function RefillText({ forecast }: { forecast: NonNullable<FieldOverview["forecast"]> }) {
  const { t, language, number } = useI18n();
  const at = toDate(forecast.refillAt);
  if (forecast.current <= forecast.refillPoint || (forecast.hoursUntilRefill !== null && forecast.hoursUntilRefill <= 0)) return <>{t("field.refillNow")}</>;
  if (!at) return <>{t("field.refillNotSoon")}</>;
  return (
    <>
      {t("field.refillAt", {
        time: formatMs(at.getTime(), language, { weekday: "short", hour: "numeric", minute: "2-digit" }),
        hours: number(forecast.hoursUntilRefill ?? 0),
      })}
    </>
  );
}

export function niceScale(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rough = Math.max(1, (max - min) / 4);
  const step = [1, 2, 5, 10, 20].find((candidate) => candidate >= rough) ?? 20;
  const low = Math.max(0, Math.floor((min - step / 2) / step) * step);
  const high = Math.ceil((max + step / 2) / step) * step;
  const ticks: number[] = [];
  for (let tick = low; tick <= high; tick += step) ticks.push(tick);
  return { low, high, ticks };
}

export function MoistureForecastChart({ overview, className }: { overview: FieldOverview; className?: string }) {
  const { t, language, number } = useI18n();
  const { forecast, water } = overview;
  const { points, now } = buildPoints(overview);
  const refill = forecast?.refillPoint ?? water.refillPoint;
  const capacity = forecast?.fieldCapacity ?? water.fieldCapacity;
  const values = points.flatMap((point) => [point.measured, point.forecast]).filter((value): value is number => value !== null);
  const scale = niceScale([...values, refill, capacity]);
  const measuredCount = points.filter((point) => point.measured !== null).length;
  const measuredName = t("field.moistureMeasured");
  const forecastName = t("field.moistureForecast");
  const stamp = (value: number) => formatMs(value, language, { weekday: "short", hour: "numeric", minute: "2-digit" });
  const caption = !forecast
    ? t("field.noForecast")
    : forecast.model === "learned"
      ? t("field.modelLearned", { r2: number(forecast.r2 ?? 0, 2), samples: number(forecast.samples) })
      : t("field.modelPhysics");

  return (
    <ChartCard
      className={className}
      title={t("field.moistureChartTitle")}
      description={caption}
      legend={
        points.length
          ? [
              { label: measuredName, color: chartColors.series1 },
              { label: forecastName, color: chartColors.series2 },
            ]
          : undefined
      }
      table={{
        columns: [t("field.columnTime"), t("field.columnMeasured"), t("field.columnForecast")],
        rows: points.map((point) => [
          stamp(point.time),
          point.measured === null ? "–" : number(point.measured, 1),
          point.forecast === null ? "–" : number(point.forecast, 1),
        ]),
      }}
    >
      {points.length === 0 ? (
        <p className="flex h-64 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">{t("common.noData")}</p>
      ) : (
        <div className="h-64 sm:h-72 lg:h-[22rem]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 12, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                ticks={alignedTicks(points[0].time, points[points.length - 1].time, 24)}
                tickFormatter={(value: number) => formatMs(value, language, { weekday: "short", day: "numeric" })}
                stroke={chartColors.axis}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis domain={[scale.low, scale.high]} ticks={scale.ticks} stroke={chartColors.axis} fontSize={11} tickLine={false} axisLine={false} />
              <ReferenceLine
                y={capacity}
                stroke="var(--chart-axis)"
                strokeDasharray="4 4"
                label={{ value: t("field.capacityLine", { value: number(capacity, 1) }), position: "insideTopLeft", fill: "var(--chart-strong)", fontSize: 11 }}
              />
              <ReferenceLine
                y={refill}
                stroke="var(--chart-text)"
                strokeDasharray="4 4"
                label={{ value: t("field.refillLine", { value: number(refill, 1) }), position: "insideBottomLeft", fill: "var(--chart-strong)", fontSize: 11 }}
              />
              {now ? (
                <ReferenceLine x={now} stroke="var(--chart-muted)" label={{ value: t("field.nowLine"), position: "insideTopLeft", fill: "var(--chart-text)", fontSize: 11 }} />
              ) : null}
              <Tooltip
                cursor={{ stroke: "var(--chart-muted)", strokeWidth: 1 }}
                content={(props) => (
                  <ChartTooltip
                    active={props.active}
                    payload={props.payload}
                    label={typeof props.label === "number" ? stamp(props.label) : props.label}
                    unit="%"
                  />
                )}
              />
              <Line
                type="monotone"
                dataKey="measured"
                name={measuredName}
                stroke={chartColors.series1}
                strokeWidth={2}
                dot={measuredCount < 3 ? { r: 4, strokeWidth: 2, fill: chartColors.surface } : false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: chartColors.surface }}
                animationDuration={800}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                name={forecastName}
                stroke={chartColors.series2}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: chartColors.surface }}
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {forecast ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <Clock className="h-4 w-4 shrink-0 text-navy-700" aria-hidden="true" />
          <RefillText forecast={forecast} />
        </p>
      ) : null}
    </ChartCard>
  );
}
